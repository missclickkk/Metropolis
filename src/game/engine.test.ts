import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BAN_DURATION_MS,
  BASE_ENERGY_REGEN_SEC,
  COFFEE_COOLDOWN_MS,
  bankDeposit,
  buyAutoDrill,
  buyBusiness,
  buyCar,
  buyProperty,
  buyZeroSpreadLicense,
  calculateBusinessTaxRate,
  calculateDailyDepositRatePct,
  calculateNetWorthRub,
  calculateProsecutorRaidRisk,
  createInitialState,
  devGrantCurrency,
  drinkFreeCoffee,
  exchangeCurrency,
  getEnergyRegenIntervalSec,
  isPlayerBanned,
  issueWarning,
  joinFaction,
  performClickProgress,
  runRace,
  sellAllOres,
  sellBusiness,
  strikeMineOre,
  tickPlayerState,
  transferSafe,
} from './engine';

test('energy regenerates strictly at +1 per 120s base and doubles speed with Private Island (+100%)', () => {
  const t0 = 1_000_000;
  const state = { ...createInitialState('1', 'Test', false, t0), energy: 50, lastEnergyTickAt: t0 };
  assert.equal(getEnergyRegenIntervalSec(state), BASE_ENERGY_REGEN_SEC);

  const after4Min = tickPlayerState(state, t0 + 240_000);
  assert.equal(after4Min.energy, 52);

  const islandState = { ...state, ownedPropertyId: 'private_island' };
  assert.equal(getEnergyRegenIntervalSec(islandState), 60);
  const after4MinIsland = tickPlayerState(islandState, t0 + 240_000);
  assert.equal(after4MinIsland.energy, 54);
});

test('free coffee requires Studio+ housing, grants +25 energy, and enforces 24h cooldown', () => {
  const t0 = 2_000_000;
  let state = { ...createInitialState('1', 'Test', false, t0), energy: 40 };
  const blocked = drinkFreeCoffee(state, t0);
  assert.equal(blocked.ok, false);

  state = { ...state, wallet: { ...state.wallet, RUB: 50_000 } };
  const bought = buyProperty(state, 'studio', t0);
  assert.equal(bought.ok, true);

  const coffee1 = drinkFreeCoffee(bought.state, t0 + 1000);
  assert.equal(coffee1.ok, true);
  assert.equal(coffee1.state.energy, 65);

  const coffeeTooSoon = drinkFreeCoffee(coffee1.state, t0 + 10_000);
  assert.equal(coffeeTooSoon.ok, false);

  const coffeeNextDay = drinkFreeCoffee(coffee1.state, t0 + 1000 + COFFEE_COOLDOWN_MS + 100);
  assert.equal(coffeeNextDay.ok, true);
});

test('anti-bot 1.5s UI cooldown, 0.5s rate limit warning, and 3/3 -> 24h BANNED cycle', () => {
  const t0 = 5_000_000;
  let state = createInitialState('1', 'Test', false, t0);

  const click1 = performClickProgress(state, 'shift', t0);
  assert.equal(click1.ok, true);
  assert.equal(click1.state.energy, 80);

  // Clicking within 1.5s but >= 0.5s is blocked softly
  const tooFastUi = performClickProgress(click1.state, 'shift', t0 + 900);
  assert.equal(tooFastUi.ok, false);
  assert.equal(tooFastUi.state.warnings, 0);

  // Clicking within 0.5s triggers anti-bot warning
  const botBurst = performClickProgress(click1.state, 'shift', t0 + 200);
  assert.equal(botBurst.ok, false);
  assert.equal(botBurst.state.warnings, 1);

  // Reaching 3/3 warnings triggers 24h ban
  const w2 = issueWarning(botBurst.state, 'test 2', t0 + 300);
  const w3 = issueWarning(w2.state, 'test 3', t0 + 400);
  assert.equal(w3.state.warnings, 3);
  assert.equal(isPlayerBanned(w3.state, t0 + 500), true);

  // After 24h ban expires and warnings reset to 0/3
  const unbanned = tickPlayerState(w3.state, t0 + 400 + BAN_DURATION_MS + 10);
  assert.equal(isPlayerBanned(unbanned, t0 + 400 + BAN_DURATION_MS + 10), false);
  assert.equal(unbanned.warnings, 0);
});

test('karma governs business tax (13% down to 6%, -5% government) and prosecutor raid risk (20-90%)', () => {
  const base = createInitialState();
  assert.equal(calculateBusinessTaxRate({ ...base, karma: 0 }), 13);
  assert.equal(calculateBusinessTaxRate({ ...base, karma: 350 }), 6);
  assert.equal(calculateBusinessTaxRate({ ...base, karma: 350, factionId: 'government' }), 1);

  assert.equal(calculateProsecutorRaidRisk({ ...base, karma: 10 }, 1_000_000), 0);
  assert.equal(calculateProsecutorRaidRisk({ ...base, karma: -100 }, 400_000), 0);
  const risk = calculateProsecutorRaidRisk({ ...base, karma: -250 }, 800_000);
  assert.ok(risk >= 20 && risk <= 90);
  const syndicateRisk = calculateProsecutorRaidRisk({ ...base, karma: -250, factionId: 'syndicate' }, 800_000);
  assert.equal(syndicateRisk, risk - 10);
});

test('single-business rule and 70% sell refund (-30% penalty)', () => {
  const t0 = 10_000;
  let state = { ...createInitialState('1', 'Test', false, t0), wallet: { RUB: 50_000, USD: 0, BTC: 0, EUR: 0 } };
  const buy1 = buyBusiness(state, 'kiosk', t0);
  assert.equal(buy1.ok, true);
  assert.equal(buy1.state.wallet.RUB, 47_500);

  const buy2Blocked = buyBusiness(buy1.state, 'coffee_point', t0);
  assert.equal(buy2Blocked.ok, false);

  const sold = sellBusiness(buy1.state, t0);
  assert.equal(sold.ok, true);
  assert.equal(sold.state.ownedBusinessId, null);
  assert.equal(sold.state.wallet.RUB, 47_500 + Math.round(2_500 * 0.7));
});

test('mine strike costs 2 energy, yields 1-25 ore, and auto-drill stops after 6 hours', () => {
  const t0 = 100_000;
  let state = createInitialState('1', 'Test', false, t0);
  const strike = strikeMineOre(state, t0, () => 0.2, true);
  assert.equal(strike.ok, true);
  assert.equal(strike.state.energy, 98);

  const sold = sellAllOres(strike.state, t0);
  assert.equal(sold.ok, true);
  assert.ok(sold.state.wallet.RUB > state.wallet.RUB);

  const rich = { ...sold.state, wallet: { ...sold.state.wallet, RUB: 100_000 } };
  const drillRes = buyAutoDrill(rich, 'krot', t0);
  assert.equal(drillRes.ok, true);
  assert.equal(drillRes.state.ownedDrills[0].active, true);

  const after6h = tickPlayerState(drillRes.state, t0 + 6 * 3600 * 1000 + 1000);
  assert.equal(after6h.ownedDrills[0].active, false);
  assert.equal(after6h.ownedDrills[0].needsInspection, true);
});

test('bank deposit, safe 0% transfer, currency exchange spread vs 0% license, and consortium bonus', () => {
  const t0 = 500_000;
  let state = {
    ...createInitialState('1', 'Test', false, t0),
    karma: 50,
    wallet: { RUB: 200_000, USD: 0, BTC: 0, EUR: 200 },
  };
  const f = joinFaction(state, 'consortium', t0);
  assert.equal(calculateDailyDepositRatePct(f.state), 0.75);

  const dep = bankDeposit(f.state, 100_000, t0);
  assert.equal(dep.ok, true);
  assert.equal(dep.state.bankDepositRub, 100_000);

  const safeIn = transferSafe(dep.state, 'RUB', 50_000, 'to_safe', t0);
  assert.equal(safeIn.state.safe.RUB, 50_000);

  const exSpread = exchangeCurrency(safeIn.state, 'RUB', 'USD', 10_000, t0);
  assert.equal(exSpread.ok, true);
  assert.ok(exSpread.state.wallet.USD < 10_000 / 95);

  const lic = buyZeroSpreadLicense(exSpread.state, t0);
  assert.equal(lic.ok, true);
  const exFree = exchangeCurrency(lic.state, 'RUB', 'USD', 9_500, t0);
  assert.equal(Number((exFree.state.wallet.USD - lic.state.wallet.USD).toFixed(2)), 100);
});

test('car purchase, race execution, and creator Dev Mode authorization', () => {
  const t0 = 900_000;
  let state = {
    ...createInitialState('1', 'Test', false, t0),
    wallet: { RUB: 100_000, USD: 0, BTC: 0, EUR: 0 },
  };
  const carRes = buyCar(state, 'vaz_2107', t0);
  assert.equal(carRes.ok, true);
  const raceRes = runRace(carRes.state, 'pve', 5_000, t0, () => 0.9);
  assert.equal(raceRes.ok, true);
  assert.equal(raceRes.state.garage[0].races, 1);

  // Non-creator blocked from Dev Mode
  const denied = devGrantCurrency(raceRes.state, 'RUB', 1_000_000, t0);
  assert.equal(denied.ok, false);

  const creator = createInitialState('630771271', 'Creator', true, t0);
  const granted = devGrantCurrency(creator, 'EUR', 500, t0);
  assert.equal(granted.ok, true);
  assert.equal(granted.state.wallet.EUR, 510);
  assert.ok(calculateNetWorthRub(granted.state) > 50_000);
});
