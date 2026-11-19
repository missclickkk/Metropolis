import {
  AUTO_DRILLS,
  BLACK_MARKET_ROTATION_POOL,
  BUSINESSES,
  CARS,
  CREATOR_TELEGRAM_ID,
  EDUCATION_CATALOG,
  ELECTION_CANDIDATES,
  EXCHANGE_RATES_RUB,
  FACTIONS,
  INITIAL_DISTRICTS,
  LICENSE_PLATES_SHOWCASE,
  MINING_POOLS,
  ORE_TIERS,
  PRESTIGE_TIERS,
  PRINTING_PRESSES,
  PROFESSIONS,
  PROPERTIES,
} from './catalog';
import type {
  ActionResult,
  Currency,
  EducationLevel,
  FactionId,
  LogEntry,
  PlayerState,
} from './types';

export const UI_CLICK_COOLDOWN_MS = 1500;
export const BACKEND_RATE_LIMIT_MS = 500;
export const BASE_ENERGY_REGEN_SEC = 120; // +1⚡ every 2 minutes (3h 20m for 0->100)
export const COFFEE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
export const COFFEE_ENERGY_AMOUNT = 25;
export const BAN_DURATION_MS = 24 * 60 * 60 * 1000;
export const WHEEL_COOLDOWN_MS = 6 * 60 * 60 * 1000;
export const BLACK_MARKET_ROTATION_MS = 2 * 60 * 60 * 1000;
export const BANK_DEPOSIT_CAP_RUB = 50_000_000;
export const GRACE_PERIOD_MS = 48 * 60 * 60 * 1000;
export const HARD_CAP_MINING_RACKS = 100;

function makeLog(category: LogEntry['category'], text: string, now: number): LogEntry {
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: now,
    category,
    text,
  };
}

function appendLog(logs: LogEntry[], entry: LogEntry): LogEntry[] {
  return [entry, ...logs].slice(0, 40);
}

export function createInitialState(
  telegramId = '1048291',
  username = 'Игрок Метрополиса',
  isCreator = false,
  now = Date.now(),
): PlayerState {
  return {
    telegramId: isCreator ? CREATOR_TELEGRAM_ID : telegramId,
    username: isCreator ? 'Создатель Метрополиса' : username,
    isCreator: isCreator || telegramId === CREATOR_TELEGRAM_ID,
    level: 1,
    xp: 0,
    experienceShifts: 0,
    totalClicks: 0,
    clickPowerLevel: 1,
    pickaxeLevel: 1,

    energy: 100,
    maxEnergy: 100,
    lastEnergyTickAt: now,
    lastCoffeeAt: 0,
    lastClickAt: 0,

    warnings: 0,
    bannedUntil: 0,

    karma: 5,
    education: 'none',
    hasBlackMarketGear: false,

    wallet: {
      RUB: 1_500,
      USD: 0,
      BTC: 0,
      EUR: 10,
    },
    safe: {
      RUB: 0,
      USD: 0,
      BTC: 0,
      EUR: 0,
    },
    bankDepositRub: 0,
    lastDepositYieldAt: now,
    hasZeroSpreadLicense: false,

    currentProfessionId: 'flyer',

    ownedBusinessId: null,
    businessCashbox: 0,
    businessLastTickAt: now,

    ownedPresses: {},
    miningRacks: {},
    maxMiningRacksCap: 5,
    miningLastTickAt: now,
    miningDifficulty: 1.0,

    ores: {},
    ownedDrills: [],

    ownedPropertyId: 'hostel',

    garage: [],
    activeCarId: null,

    casinoTicketTier: 'none',
    lastWheelSpinAt: 0,
    blackMarketSeedAt: Math.floor(now / BLACK_MARKET_ROTATION_MS) * BLACK_MARKET_ROTATION_MS,

    factionId: 'none',
    clan: null,
    prestigeTier: 1,
    prestigeGraceUntil: 0,
    ownedPlates: [],

    politics: {
      presidentName: 'А. Волков',
      bankFeePct: 2.0,
      stateOreOrderActive: true,
      stateOreOrderCapLeft: 50_000_000,
      electionEndsAt: now + 14 * 24 * 60 * 60 * 1000,
      votedCandidateId: null,
      impeachmentVotes: 12,
      impeachmentTriggered: false,
    },

    districts: INITIAL_DISTRICTS.map((d) => ({ ...d })),
    logs: [makeLog('work', 'Добро пожаловать в METROPOLIS v3.0. Начните с клик-смены или шахты.', now)],
  };
}

// --- Pure Derived Metrics ---

export function xpForNextLevel(level: number): number {
  return Math.round(100 * Math.pow(1.38, level - 1));
}

export function getPropertyDef(propertyId: string) {
  return PROPERTIES.find((p) => p.id === propertyId) ?? PROPERTIES[0];
}

export function getEnergyRegenIntervalSec(state: PlayerState): number {
  const prop = getPropertyDef(state.ownedPropertyId);
  const multiplier = 1 + prop.regenBonusPct / 100; // 1.0 .. 2.0
  return Math.round(BASE_ENERGY_REGEN_SEC / multiplier);
}

export function isPlayerBanned(state: PlayerState, now = Date.now()): boolean {
  return state.bannedUntil > now;
}

export function calculateBusinessTaxRate(state: PlayerState): number {
  // Base legal tax drops from 13% to 6% as positive karma grows (0..350)
  const positiveKarma = Math.max(0, state.karma);
  const karmaDiscount = Math.min(7, (positiveKarma / 350) * 7);
  let rate = 13 - karmaDiscount;
  if (state.factionId === 'government') {
    rate -= 5;
  }
  return Math.max(1, Number(rate.toFixed(2)));
}

export function calculateProsecutorRaidRisk(state: PlayerState, cashAmountRub: number): number {
  if (state.karma >= 0 || cashAmountRub <= 500_000) {
    return 0;
  }
  // Negative karma triggers 20%-90% prosecutor raid risk when cashbox > 500k RUB
  const severity = Math.min(1, Math.abs(state.karma) / 500);
  let risk = 20 + severity * 70; // 20..90%
  if (state.factionId === 'syndicate') {
    risk = Math.max(10, risk - 10);
  }
  return Math.round(risk);
}

export function calculateDailyDepositRatePct(state: PlayerState): number {
  // 0.5% - 1.25%/day based on prestige + 0.25% Financial Consortium bonus
  const prestigeFactor = Math.min(1, (state.prestigeTier - 1) / 9);
  const base = 0.5 + prestigeFactor * 0.75;
  const factionBonus = state.factionId === 'consortium' ? 0.25 : 0;
  return Number((base + factionBonus).toFixed(2));
}

export function calculateNetWorthRub(state: PlayerState): number {
  const walletValue =
    state.wallet.RUB +
    state.wallet.USD * EXCHANGE_RATES_RUB.USD +
    state.wallet.EUR * EXCHANGE_RATES_RUB.EUR +
    state.wallet.BTC * EXCHANGE_RATES_RUB.BTC;

  const safeValue =
    state.safe.RUB +
    state.safe.USD * EXCHANGE_RATES_RUB.USD +
    state.safe.EUR * EXCHANGE_RATES_RUB.EUR +
    state.safe.BTC * EXCHANGE_RATES_RUB.BTC;

  const biz = BUSINESSES.find((b) => b.id === state.ownedBusinessId);
  const bizValue = biz ? biz.costRub : 0;

  const prop = getPropertyDef(state.ownedPropertyId);
  const carsValue = state.garage.reduce((acc, owned) => {
    const def = CARS.find((c) => c.id === owned.carId);
    return acc + (def ? def.costRub : 0);
  }, 0);

  const drillsValue = state.ownedDrills.reduce((acc, owned) => {
    const def = AUTO_DRILLS.find((d) => d.id === owned.drillId);
    return acc + (def ? def.costRub : 0);
  }, 0);

  const pressesValue = Object.entries(state.ownedPresses).reduce((acc, [id, count]) => {
    const def = PRINTING_PRESSES.find((p) => p.id === id);
    return acc + (def ? def.costRub * count : 0);
  }, 0);

  const miningValue = Object.entries(state.miningRacks).reduce((acc, [id, count]) => {
    const def = MINING_POOLS.find((p) => p.id === id);
    return acc + (def ? def.costRub * count : 0);
  }, 0);

  return Math.round(
    walletValue +
      safeValue +
      state.bankDepositRub +
      bizValue +
      prop.costRub +
      carsValue +
      drillsValue +
      pressesValue +
      miningValue,
  );
}

export function getPrestigeForNetWorth(netWorthRub: number) {
  let current = PRESTIGE_TIERS[0];
  for (const tier of PRESTIGE_TIERS) {
    if (netWorthRub >= tier.minNetWorth) {
      current = tier;
    }
  }
  return current;
}

export function getTotalMiningRacks(state: PlayerState): number {
  return Object.values(state.miningRacks).reduce((sum, n) => sum + n, 0);
}

export function getMiningStats(state: PlayerState) {
  let btcPerHour = 0;
  let powerKw = 0;
  for (const [poolId, count] of Object.entries(state.miningRacks)) {
    const pool = MINING_POOLS.find((p) => p.id === poolId);
    if (pool && count > 0) {
      btcPerHour += (pool.btcPerHourPerRack * count) / Math.max(0.5, state.miningDifficulty);
      powerKw += pool.powerKwPerRack * count;
    }
  }
  const electricityRubPerHour = Math.round(powerKw * 180);
  return { btcPerHour, powerKw: Number(powerKw.toFixed(1)), electricityRubPerHour };
}

export function getOrePriceRub(oreId: string, state: PlayerState): number {
  const ore = ORE_TIERS.find((o) => o.id === oreId);
  if (!ore) return 0;
  const orderBoost =
    state.politics.stateOreOrderActive && state.politics.stateOreOrderCapLeft > 0 ? 1.3 : 1.0;
  return Math.round(ore.basePriceRub * orderBoost);
}

export function getActiveBlackMarketOfferIds(now: number): string[] {
  const slot = Math.floor(now / BLACK_MARKET_ROTATION_MS);
  const all = BLACK_MARKET_ROTATION_POOL.map((i) => i.id);
  const picked: string[] = [];
  // Always keep gear bundle available so players can progress into illegal path, plus 3 rotating offers
  picked.push('gear_bundle');
  const pool = all.filter((id) => id !== 'gear_bundle');
  for (let i = 0; i < 3; i++) {
    picked.push(pool[(slot + i) % pool.length]);
  }
  return picked;
}

// --- Core State Tick (Energy, Ban Expiration, Passive Income, Prestige Grace) ---

export function tickPlayerState(state: PlayerState, now = Date.now()): PlayerState {
  let next = { ...state };

  // 1. Auto-unban after 24h and reset warnings to 0/3
  if (next.bannedUntil > 0 && now >= next.bannedUntil) {
    next.bannedUntil = 0;
    next.warnings = 0;
    next.logs = appendLog(
      next.logs,
      makeLog('warn', 'Срок 24-часового бана истек. Счетчик варнов обнулен до 0/3.', now),
    );
  }

  // 2. Strict timer-based energy regeneration (+1⚡ every 2 min base, up to +100% with housing)
  const intervalMs = getEnergyRegenIntervalSec(next) * 1000;
  if (next.energy < next.maxEnergy) {
    const elapsed = Math.max(0, now - next.lastEnergyTickAt);
    const gained = Math.floor(elapsed / intervalMs);
    if (gained > 0) {
      next.energy = Math.min(next.maxEnergy, next.energy + gained);
      next.lastEnergyTickAt =
        next.energy >= next.maxEnergy ? now : next.lastEnergyTickAt + gained * intervalMs;
    }
  } else {
    next.lastEnergyTickAt = now;
  }

  // 3. Business passive accrual into cashbox
  if (next.ownedBusinessId) {
    const biz = BUSINESSES.find((b) => b.id === next.ownedBusinessId);
    const elapsedSec = Math.max(0, (now - next.businessLastTickAt) / 1000);
    if (biz && elapsedSec >= 5) {
      const earned = (biz.hourlyIncome / 3600) * elapsedSec;
      next.businessCashbox = Number((next.businessCashbox + earned).toFixed(2));
      next.businessLastTickAt = now;
    }
  } else {
    next.businessLastTickAt = now;
  }

  // 4. BTC Mining passive accrual
  const miningElapsedSec = Math.max(0, (now - next.miningLastTickAt) / 1000);
  if (miningElapsedSec >= 10) {
    const stats = getMiningStats(next);
    if (stats.btcPerHour > 0) {
      const btcEarned = (stats.btcPerHour / 3600) * miningElapsedSec;
      const elecCost = Math.round((stats.electricityRubPerHour / 3600) * miningElapsedSec);
      if (next.wallet.RUB >= elecCost) {
        next.wallet = {
          ...next.wallet,
          RUB: next.wallet.RUB - elecCost,
          BTC: Number((next.wallet.BTC + btcEarned).toFixed(6)),
        };
      }
    }
    next.miningLastTickAt = now;
  }

  // 5. Auto-drills 6-hour stop check & wear
  if (next.ownedDrills.length > 0) {
    const wearMultiplier = next.factionId === 'miners' ? 0.85 : 1.0;
    next.ownedDrills = next.ownedDrills.map((drill) => {
      if (!drill.active) return drill;
      const def = AUTO_DRILLS.find((d) => d.id === drill.drillId);
      if (!def) return drill;
      const runningHours = (now - drill.startedAt) / (3600 * 1000);
      if (runningHours >= def.maxHours) {
        return {
          ...drill,
          active: false,
          needsInspection: true,
          wearPct: Math.min(100, Math.round(drill.wearPct + def.wearPerHour * def.maxHours * wearMultiplier)),
          fuelPct: Math.max(0, Math.round(drill.fuelPct - 60)),
        };
      }
      return drill;
    });
  }

  // 6. Bank deposit daily yield accrual (pro-rated continuously)
  const depositElapsedSec = Math.max(0, (now - next.lastDepositYieldAt) / 1000);
  if (next.bankDepositRub > 0 && depositElapsedSec >= 30) {
    const dailyPct = calculateDailyDepositRatePct(next);
    const interest = (next.bankDepositRub * (dailyPct / 100) * depositElapsedSec) / 86400;
    if (interest >= 1) {
      next.bankDepositRub = Math.min(BANK_DEPOSIT_CAP_RUB, Math.round(next.bankDepositRub + interest));
      next.lastDepositYieldAt = now;
    }
  } else if (next.bankDepositRub === 0) {
    next.lastDepositYieldAt = now;
  }

  // 7. Prestige I-X with 48h Grace Period
  const netWorth = calculateNetWorthRub(next);
  const computedPrestige = getPrestigeForNetWorth(netWorth).tier;
  if (computedPrestige > next.prestigeTier) {
    next.prestigeTier = computedPrestige;
    next.prestigeGraceUntil = 0;
  } else if (computedPrestige < next.prestigeTier) {
    if (next.prestigeGraceUntil === 0) {
      next.prestigeGraceUntil = now + GRACE_PERIOD_MS;
    } else if (now >= next.prestigeGraceUntil) {
      next.prestigeTier = computedPrestige;
      next.prestigeGraceUntil = 0;
    }
  } else {
    next.prestigeGraceUntil = 0;
  }

  // 8. Black market 2-hour rotation anchor
  const slotStart = Math.floor(now / BLACK_MARKET_ROTATION_MS) * BLACK_MARKET_ROTATION_MS;
  if (slotStart !== next.blackMarketSeedAt) {
    next.blackMarketSeedAt = slotStart;
  }

  return next;
}

// --- Warning & Anti-Bot Rules ---

export function issueWarning(state: PlayerState, reason: string, now = Date.now()): ActionResult {
  const nextWarnings = state.warnings + 1;
  if (nextWarnings >= 3) {
    const bannedUntil = now + BAN_DURATION_MS;
    const next: PlayerState = {
      ...state,
      warnings: 3,
      bannedUntil,
      logs: appendLog(
        state.logs,
        makeLog('warn', `Варн 3/3 (${reason}). Аккаунт переведен в статус BANNED на 24 часа.`, now),
      ),
    };
    return {
      ok: false,
      state: next,
      message: 'Получен 3-й варн! Аккаунт заблокирован (BANNED) на 24 часа.',
      warningTriggered: true,
    };
  }
  const next: PlayerState = {
    ...state,
    warnings: nextWarnings,
    logs: appendLog(state.logs, makeLog('warn', `Получен варн [${nextWarnings}/3]: ${reason}`, now)),
  };
  return {
    ok: false,
    state: next,
    message: `Предупреждение [${nextWarnings}/3]: ${reason}`,
    warningTriggered: true,
  };
}

function addXpAndLevel(state: PlayerState, gainedXp: number): Pick<PlayerState, 'xp' | 'level'> {
  let xp = state.xp + gainedXp;
  let level = state.level;
  while (xp >= xpForNextLevel(level)) {
    xp -= xpForNextLevel(level);
    level += 1;
  }
  return { xp, level };
}

// --- Clicker Progression: Quick Click Hustle & Full Shift Work ---

export function canUseProfession(state: PlayerState, profId: string): { allowed: boolean; reason?: string } {
  const prof = PROFESSIONS.find((p) => p.id === profId);
  if (!prof) return { allowed: false, reason: 'Профессия не найдена' };

  if (state.experienceShifts < prof.minExperience) {
    return { allowed: false, reason: `Нужен стаж: ${prof.minExperience} смен` };
  }
  if (prof.minKarma !== null && state.karma < prof.minKarma) {
    return { allowed: false, reason: `Нужна карма ≥ ${prof.minKarma}` };
  }
  if (prof.maxKarma !== null && state.karma > prof.maxKarma) {
    return { allowed: false, reason: `Нужна карма ≤ ${prof.maxKarma}` };
  }
  if (prof.requiredEducation) {
    const order: EducationLevel[] = ['none', 'college', 'bachelor', 'mba', 'academy'];
    if (order.indexOf(state.education) < order.indexOf(prof.requiredEducation)) {
      const eduDef = EDUCATION_CATALOG.find((e) => e.id === prof.requiredEducation);
      return { allowed: false, reason: `Нужен диплом: ${eduDef?.name ?? prof.requiredEducation}` };
    }
  }
  if (prof.requiresBlackMarketGear && !state.hasBlackMarketGear) {
    return { allowed: false, reason: 'Нужен пакет «Теневой доступ» с Черного рынка' };
  }
  return { allowed: true };
}

export function performClickProgress(
  state: PlayerState,
  mode: 'shift' | 'quick_tap',
  now = Date.now(),
  bypassCooldown = false,
): ActionResult {
  const ticked = tickPlayerState(state, now);
  if (isPlayerBanned(ticked, now)) {
    return { ok: false, state: ticked, message: 'Аккаунт в статусе BANNED на 24 часа.' };
  }

  const deltaMs = now - ticked.lastClickAt;
  if (!bypassCooldown && ticked.lastClickAt > 0 && deltaMs < BACKEND_RATE_LIMIT_MS) {
    return issueWarning(ticked, 'Превышен Rate-Limit (0.5с) — подозрение на автокликер', now);
  }
  if (!bypassCooldown && ticked.lastClickAt > 0 && deltaMs < UI_CLICK_COOLDOWN_MS) {
    return {
      ok: false,
      state: ticked,
      message: `Анти-бот пауза: подождите ${((UI_CLICK_COOLDOWN_MS - deltaMs) / 1000).toFixed(1)}с`,
    };
  }

  const prof = PROFESSIONS.find((p) => p.id === ticked.currentProfessionId) ?? PROFESSIONS[0];
  const energyCost = mode === 'shift' ? prof.energyCost : 4;
  if (ticked.energy < energyCost) {
    return {
      ok: false,
      state: ticked,
      message: `Недостаточно энергии! Нужно ${energyCost}⚡ (у вас ${ticked.energy}⚡).`,
    };
  }

  // Click power scales with character level & clickPowerLevel
  const clickBonusMult = 1 + (ticked.clickPowerLevel - 1) * 0.15 + (ticked.level - 1) * 0.05;
  const rawPay =
    mode === 'shift'
      ? Math.round(prof.payRub * clickBonusMult)
      : Math.max(15, Math.round(prof.payRub * 0.28 * clickBonusMult));
  const xpGain = mode === 'shift' ? prof.xpGain : Math.max(6, Math.round(prof.xpGain * 0.4));
  const karmaChange = mode === 'shift' ? prof.karmaDelta : Math.sign(prof.karmaDelta);

  const { xp, level } = addXpAndLevel(ticked, xpGain);

  let finalWalletRub = ticked.wallet.RUB + rawPay;
  let raidTriggered = false;
  let extraMsg = '';

  // Prosecutor raid risk check if negative karma & wallet > 500k RUB on illegal shift
  if (prof.type === 'illegal' && ticked.karma < 0 && finalWalletRub > 500_000) {
    const risk = calculateProsecutorRaidRisk(ticked, finalWalletRub);
    if (Math.random() * 100 < risk * 0.25) {
      const seized = Math.round(finalWalletRub * 0.3);
      finalWalletRub -= seized;
      raidTriggered = true;
      extraMsg = ` Рейд Прокурора! Изъято ${seized.toLocaleString('ru-RU')} RUB. Храните капитал в Сейфе!`;
    }
  }

  const next: PlayerState = {
    ...ticked,
    energy: ticked.energy - energyCost,
    lastClickAt: now,
    xp,
    level,
    experienceShifts: ticked.experienceShifts + (mode === 'shift' ? 1 : 0),
    totalClicks: ticked.totalClicks + 1,
    karma: ticked.karma + karmaChange,
    wallet: {
      ...ticked.wallet,
      RUB: finalWalletRub,
    },
    logs: appendLog(
      ticked.logs,
      makeLog(
        'work',
        `${mode === 'shift' ? 'Смена' : 'Клик-задача'} «${prof.name}»: +${rawPay.toLocaleString('ru-RU')} RUB, +${xpGain} XP${extraMsg}`,
        now,
      ),
    ),
  };

  return {
    ok: true,
    state: next,
    message: raidTriggered
      ? `Смена завершена, но сработал рейд Прокурора!${extraMsg}`
      : `+${rawPay.toLocaleString('ru-RU')} RUB · +${xpGain} XP`,
    rewardText: `+${rawPay.toLocaleString('ru-RU')} ₽`,
    raidTriggered,
  };
}

export function upgradeClickPower(state: PlayerState, now = Date.now()): ActionResult {
  const cost = Math.round(800 * Math.pow(1.9, state.clickPowerLevel - 1));
  if (state.wallet.RUB < cost) {
    return { ok: false, state, message: `Нужно ${cost.toLocaleString('ru-RU')} RUB для прокачки навыка.` };
  }
  const next: PlayerState = {
    ...state,
    clickPowerLevel: state.clickPowerLevel + 1,
    wallet: { ...state.wallet, RUB: state.wallet.RUB - cost },
    logs: appendLog(
      state.logs,
      makeLog('work', `Навык клика повышен до ур. ${state.clickPowerLevel + 1} (+15% дохода за клик).`, now),
    ),
  };
  return { ok: true, state: next, message: `Сила клика повышена до ур. ${next.clickPowerLevel}!` };
}

export function selectProfession(state: PlayerState, profId: string, now = Date.now()): ActionResult {
  const check = canUseProfession(state, profId);
  if (!check.allowed) {
    return { ok: false, state, message: check.reason ?? 'Профессия недоступна' };
  }
  const prof = PROFESSIONS.find((p) => p.id === profId)!;
  return {
    ok: true,
    state: {
      ...state,
      currentProfessionId: profId,
      logs: appendLog(state.logs, makeLog('work', `Вы устроились на позицию «${prof.name}».`, now)),
    },
    message: `Выбрана профессия: ${prof.name}`,
  };
}

export function buyEducation(state: PlayerState, eduId: EducationLevel, now = Date.now()): ActionResult {
  const def = EDUCATION_CATALOG.find((e) => e.id === eduId);
  if (!def) return { ok: false, state, message: 'Программа не найдена.' };
  if (state.karma < def.minKarma) {
    return { ok: false, state, message: `Для поступления нужна карма ≥ ${def.minKarma}.` };
  }
  if (state.wallet.RUB < def.costRub) {
    return { ok: false, state, message: `Недостаточно средств: нужно ${def.costRub.toLocaleString('ru-RU')} RUB.` };
  }
  return {
    ok: true,
    state: {
      ...state,
      education: eduId,
      wallet: { ...state.wallet, RUB: state.wallet.RUB - def.costRub },
      karma: state.karma + 5,
      logs: appendLog(state.logs, makeLog('work', `Получен диплом: ${def.name} (+5 Кармы).`, now)),
    },
    message: `Диплом «${def.name}» успешно получен!`,
  };
}

// --- Free Coffee (+25⚡ every 24h from Studio+) ---

export function drinkFreeCoffee(state: PlayerState, now = Date.now()): ActionResult {
  const ticked = tickPlayerState(state, now);
  const prop = getPropertyDef(ticked.ownedPropertyId);
  if (!prop.unlocksCoffee) {
    return { ok: false, state: ticked, message: 'Бесплатный кофе доступен от жилья «Студия на окраине» и выше.' };
  }
  if (ticked.lastCoffeeAt > 0 && now - ticked.lastCoffeeAt < COFFEE_COOLDOWN_MS) {
    const hoursLeft = Math.ceil((COFFEE_COOLDOWN_MS - (now - ticked.lastCoffeeAt)) / (3600 * 1000));
    return { ok: false, state: ticked, message: `Домашний кофе восстанавливается. Осталось ~${hoursLeft} ч.` };
  }
  const newEnergy = Math.min(ticked.maxEnergy, ticked.energy + COFFEE_ENERGY_AMOUNT);
  return {
    ok: true,
    state: {
      ...ticked,
      energy: newEnergy,
      lastCoffeeAt: now,
      logs: appendLog(ticked.logs, makeLog('work', 'Выпит бесплатный домашний кофе: +25⚡.', now)),
    },
    message: `Бодрящий кофе выпит! Энергия: ${newEnergy}/${ticked.maxEnergy}⚡`,
  };
}

// --- Mine, 10 Ore Tiers (2⚡ per hit, 1-25 units) & Auto-Drills ---

export function strikeMineOre(
  state: PlayerState,
  now = Date.now(),
  rng: () => number = Math.random,
  bypassCooldown = false,
): ActionResult {
  const ticked = tickPlayerState(state, now);
  if (isPlayerBanned(ticked, now)) {
    return { ok: false, state: ticked, message: 'Аккаунт в статусе BANNED.' };
  }
  const deltaMs = now - ticked.lastClickAt;
  if (!bypassCooldown && ticked.lastClickAt > 0 && deltaMs < BACKEND_RATE_LIMIT_MS) {
    return issueWarning(ticked, 'Превышен Rate-Limit в шахте (0.5с)', now);
  }
  if (!bypassCooldown && ticked.lastClickAt > 0 && deltaMs < UI_CLICK_COOLDOWN_MS) {
    return {
      ok: false,
      state: ticked,
      message: `Анти-бот пауза: подождите ${((UI_CLICK_COOLDOWN_MS - deltaMs) / 1000).toFixed(1)}с`,
    };
  }
  if (ticked.energy < 2) {
    return { ok: false, state: ticked, message: 'Нужно 2⚡ для удара киркой.' };
  }

  const rareBoost = ticked.factionId === 'miners' ? 1.1 : 1.0;
  const pickaxeBoost = 1 + (ticked.pickaxeLevel - 1) * 0.14;
  const weights = ORE_TIERS.map((ore) =>
    ore.tier >= 5 ? ore.dropWeight * rareBoost * pickaxeBoost : ore.dropWeight,
  );
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * totalWeight;
  let selectedOre = ORE_TIERS[0];
  for (let i = 0; i < ORE_TIERS.length; i++) {
    roll -= weights[i];
    if (roll <= 0) {
      selectedOre = ORE_TIERS[i];
      break;
    }
  }

  // 1..25 units per strike scaled by pickaxeLevel
  const maxQty = Math.min(25, 4 + ticked.pickaxeLevel * 3);
  const minQty = Math.min(maxQty, Math.max(1, Math.floor(ticked.pickaxeLevel / 2)));
  const qty = Math.min(25, Math.max(1, Math.floor(minQty + rng() * (maxQty - minQty + 1))));

  const { xp, level } = addXpAndLevel(ticked, 10 + selectedOre.tier * 4);
  const nextOres = {
    ...ticked.ores,
    [selectedOre.id]: (ticked.ores[selectedOre.id] ?? 0) + qty,
  };

  return {
    ok: true,
    state: {
      ...ticked,
      energy: ticked.energy - 2,
      lastClickAt: now,
      totalClicks: ticked.totalClicks + 1,
      xp,
      level,
      ores: nextOres,
      logs: appendLog(
        ticked.logs,
        makeLog('mine', `Удар в шахте: добыто ${qty} шт. «${selectedOre.name}» (Тир ${selectedOre.tier}).`, now),
      ),
    },
    message: `Добыто ${qty} шт. «${selectedOre.name}»`,
    rewardText: `+${qty} ${selectedOre.name}`,
  };
}

export function upgradePickaxe(state: PlayerState, now = Date.now()): ActionResult {
  const cost = Math.round(1_200 * Math.pow(2.1, state.pickaxeLevel - 1));
  if (state.wallet.RUB < cost) {
    return { ok: false, state, message: `Нужно ${cost.toLocaleString('ru-RU')} RUB для улучшения кирки.` };
  }
  return {
    ok: true,
    state: {
      ...state,
      pickaxeLevel: state.pickaxeLevel + 1,
      wallet: { ...state.wallet, RUB: state.wallet.RUB - cost },
      logs: appendLog(state.logs, makeLog('mine', `Кирка улучшена до ур. ${state.pickaxeLevel + 1}.`, now)),
    },
    message: `Кирка улучшена до ур. ${state.pickaxeLevel + 1}!`,
  };
}

export function sellAllOres(state: PlayerState, now = Date.now()): ActionResult {
  let totalRub = 0;
  let totalUnits = 0;
  for (const [oreId, qty] of Object.entries(state.ores)) {
    if (qty > 0) {
      totalRub += qty * getOrePriceRub(oreId, state);
      totalUnits += qty;
    }
  }
  if (totalUnits === 0) {
    return { ok: false, state, message: 'На складе нет руды для продажи.' };
  }

  let capLeft = state.politics.stateOreOrderCapLeft;
  if (state.politics.stateOreOrderActive && capLeft > 0) {
    const bonusPart = Math.round(totalRub * (0.3 / 1.3));
    capLeft = Math.max(0, capLeft - bonusPart);
  }

  return {
    ok: true,
    state: {
      ...state,
      ores: {},
      wallet: { ...state.wallet, RUB: state.wallet.RUB + totalRub },
      politics: {
        ...state.politics,
        stateOreOrderCapLeft: capLeft,
        stateOreOrderActive: capLeft > 0 ? state.politics.stateOreOrderActive : false,
      },
      logs: appendLog(
        state.logs,
        makeLog('mine', `Продано ${totalUnits} ед. руды за ${totalRub.toLocaleString('ru-RU')} RUB.`, now),
      ),
    },
    message: `Продано ${totalUnits} ед. руды за ${totalRub.toLocaleString('ru-RU')} RUB`,
  };
}

export function buyAutoDrill(state: PlayerState, drillId: string, now = Date.now()): ActionResult {
  const def = AUTO_DRILLS.find((d) => d.id === drillId);
  if (!def) return { ok: false, state, message: 'Модель авто-бура не найдена.' };
  if (state.wallet.RUB < def.costRub) {
    return { ok: false, state, message: `Нужно ${def.costRub.toLocaleString('ru-RU')} RUB.` };
  }
  return {
    ok: true,
    state: {
      ...state,
      wallet: { ...state.wallet, RUB: state.wallet.RUB - def.costRub },
      ownedDrills: [
        ...state.ownedDrills,
        {
          drillId,
          active: true,
          startedAt: now,
          lastCollectedAt: now,
          fuelPct: 100,
          wearPct: 0,
          needsInspection: false,
        },
      ],
      logs: appendLog(state.logs, makeLog('mine', `Куплен и запущен ${def.name} (цикл 6 ч).`, now)),
    },
    message: `${def.name} установлен в шахте!`,
  };
}

export function collectAndServiceDrill(
  state: PlayerState,
  drillIndex: number,
  action: 'collect' | 'service',
  now = Date.now(),
): ActionResult {
  const drill = state.ownedDrills[drillIndex];
  if (!drill) return { ok: false, state, message: 'Бур не найден.' };
  const def = AUTO_DRILLS.find((d) => d.id === drill.drillId)!;

  if (action === 'service') {
    const cost = Math.round(def.fuelCostRub + (drill.wearPct / 100) * def.costRub * 0.12);
    if (state.wallet.RUB < cost) {
      return { ok: false, state, message: `Нужно ${cost.toLocaleString('ru-RU')} RUB на топливо и техосмотр.` };
    }
    const updated = state.ownedDrills.map((d, idx) =>
      idx === drillIndex
        ? { ...d, active: true, startedAt: now, lastCollectedAt: now, fuelPct: 100, wearPct: 0, needsInspection: false }
        : d,
    );
    return {
      ok: true,
      state: {
        ...state,
        wallet: { ...state.wallet, RUB: state.wallet.RUB - cost },
        ownedDrills: updated,
        logs: appendLog(
          state.logs,
          makeLog('mine', `${def.name} прошёл техосмотр и заправку за ${cost.toLocaleString('ru-RU')} RUB.`, now),
        ),
      },
      message: `${def.name} обслужен и запущен на новый 6-часовой цикл.`,
    };
  }

  // Collect mined ore (min 15 sec elapsed for demo responsiveness)
  const elapsedHours = Math.min(def.maxHours, Math.max(0, (now - drill.lastCollectedAt) / (3600 * 1000)));
  const units = Math.max(elapsedHours > 0.004 ? 1 : 0, Math.floor(elapsedHours * def.orePerHour));
  if (units === 0) {
    return { ok: false, state, message: 'Бур еще набирает первую партию руды (подождите ~15 сек).' };
  }
  const oreDef = ORE_TIERS[Math.min(def.maxOreTier - 1, Math.floor(Math.random() * def.maxOreTier))];
  const wearDelta = Math.round(elapsedHours * def.wearPerHour * (state.factionId === 'miners' ? 0.85 : 1.0));
  const updated = state.ownedDrills.map((d, idx) =>
    idx === drillIndex
      ? {
          ...d,
          lastCollectedAt: now,
          wearPct: Math.min(100, d.wearPct + wearDelta),
          fuelPct: Math.max(0, d.fuelPct - Math.round(elapsedHours * 12)),
        }
      : d,
  );

  return {
    ok: true,
    state: {
      ...state,
      ores: { ...state.ores, [oreDef.id]: (state.ores[oreDef.id] ?? 0) + units },
      ownedDrills: updated,
      logs: appendLog(state.logs, makeLog('mine', `${def.name} добыл ${units} шт. «${oreDef.name}».`, now)),
    },
    message: `Собрано ${units} шт. «${oreDef.name}» с бура ${def.name}.`,
  };
}

// --- Business (Strictly 1 Business, 70% refund / -30% penalty) ---

export function buyBusiness(state: PlayerState, businessId: string, now = Date.now()): ActionResult {
  const def = BUSINESSES.find((b) => b.id === businessId);
  if (!def) return { ok: false, state, message: 'Бизнес не найден.' };

  if (state.ownedBusinessId !== null) {
    return {
      ok: false,
      state,
      message: 'Можно владеть строго 1 бизнесом. Сначала продайте текущий (возврат 70%).',
    };
  }
  if (def.requiredKarma === 'positive' && state.karma <= 0) {
    return { ok: false, state, message: 'Для этого легального бизнеса нужна положительная карма (>0).' };
  }
  if (def.requiredKarma === 'negative' && state.karma >= 0) {
    return { ok: false, state, message: 'Подпольный синдикат открывается при отрицательной карме (<0).' };
  }
  if (state.wallet.RUB < def.costRub) {
    return { ok: false, state, message: `Нужно ${def.costRub.toLocaleString('ru-RU')} RUB.` };
  }

  return {
    ok: true,
    state: {
      ...state,
      ownedBusinessId: def.id,
      businessCashbox: 0,
      businessLastTickAt: now,
      wallet: { ...state.wallet, RUB: state.wallet.RUB - def.costRub },
      logs: appendLog(state.logs, makeLog('business', `Куплен бизнес «${def.name}».`, now)),
    },
    message: `Бизнес «${def.name}» приобретен!`,
  };
}

export function sellBusiness(state: PlayerState, now = Date.now()): ActionResult {
  if (!state.ownedBusinessId) {
    return { ok: false, state, message: 'У вас нет активного бизнеса.' };
  }
  const def = BUSINESSES.find((b) => b.id === state.ownedBusinessId)!;
  const refund = Math.round(def.costRub * 0.7); // -30% penalty
  return {
    ok: true,
    state: {
      ...state,
      ownedBusinessId: null,
      businessCashbox: 0,
      wallet: { ...state.wallet, RUB: state.wallet.RUB + refund },
      logs: appendLog(
        state.logs,
        makeLog('business', `Бизнес «${def.name}» продан за ${refund.toLocaleString('ru-RU')} RUB (70%, штраф -30%).`, now),
      ),
    },
    message: `Продано за ${refund.toLocaleString('ru-RU')} RUB (возврат 70%).`,
  };
}

export function collectBusinessCashbox(state: PlayerState, now = Date.now()): ActionResult {
  const ticked = tickPlayerState(state, now);
  if (!ticked.ownedBusinessId) {
    return { ok: false, state: ticked, message: 'Нет бизнеса для сбора кассы.' };
  }
  const def = BUSINESSES.find((b) => b.id === ticked.ownedBusinessId)!;
  if (ticked.businessCashbox < 1) {
    return { ok: false, state: ticked, message: 'В кассе еще слишком мало средств.' };
  }

  const gross = Math.floor(ticked.businessCashbox);
  const taxPct = def.type === 'legal' ? calculateBusinessTaxRate(ticked) : 0;
  const clanTaxPct = ticked.clan ? ticked.clan.taxPct : 0;
  const taxAmount = Math.round(gross * ((taxPct + clanTaxPct) / 100));
  const net = Math.max(1, gross - taxAmount);

  const nextWallet = { ...ticked.wallet };
  nextWallet[def.currency] += net;

  const nextClan = ticked.clan
    ? {
        ...ticked.clan,
        treasuryRub:
          ticked.clan.treasuryRub +
          Math.round(
            gross * (clanTaxPct / 100) * (def.currency === 'USD' ? EXCHANGE_RATES_RUB.USD : 1),
          ),
      }
    : null;

  return {
    ok: true,
    state: {
      ...ticked,
      businessCashbox: 0,
      businessLastTickAt: now,
      wallet: nextWallet,
      clan: nextClan,
      logs: appendLog(
        ticked.logs,
        makeLog(
          'business',
          `Инкассация «${def.name}»: +${net.toLocaleString('ru-RU')} ${def.currency} (налог ${taxPct}%).`,
          now,
        ),
      ),
    },
    message: `Собрано +${net.toLocaleString('ru-RU')} ${def.currency}`,
  };
}

// --- Printing Presses & BTC Mining Racks ---

export function buyPress(state: PlayerState, pressId: string, now = Date.now()): ActionResult {
  const def = PRINTING_PRESSES.find((p) => p.id === pressId);
  if (!def) return { ok: false, state, message: 'Станок не найден.' };
  if (state.wallet.RUB < def.costRub) {
    return { ok: false, state, message: `Нужно ${def.costRub.toLocaleString('ru-RU')} RUB.` };
  }
  return {
    ok: true,
    state: {
      ...state,
      wallet: { ...state.wallet, RUB: state.wallet.RUB - def.costRub },
      ownedPresses: { ...state.ownedPresses, [pressId]: (state.ownedPresses[pressId] ?? 0) + 1 },
      logs: appendLog(state.logs, makeLog('business', `Куплен станок «${def.name}».`, now)),
    },
    message: `Установлен ${def.name}`,
  };
}

export function runPressCycle(state: PlayerState, pressId: string, now = Date.now()): ActionResult {
  const count = state.ownedPresses[pressId] ?? 0;
  const def = PRINTING_PRESSES.find((p) => p.id === pressId);
  if (!def || count <= 0) return { ok: false, state, message: 'У вас нет этого станка.' };

  const neededOre = def.orePerCycle * count;
  const eligibleOres = ORE_TIERS.filter((o) => o.tier >= def.minOreTier);
  let remaining = neededOre;
  const nextOres = { ...state.ores };

  for (const ore of eligibleOres) {
    const have = nextOres[ore.id] ?? 0;
    if (have > 0 && remaining > 0) {
      const take = Math.min(have, remaining);
      nextOres[ore.id] = have - take;
      remaining -= take;
    }
  }
  if (remaining > 0) {
    return {
      ok: false,
      state,
      message: `Не хватает руды Тир ${def.minOreTier}+ для печати: нужно еще ${remaining} шт.`,
    };
  }

  const earned = def.rubPerCycle * count;
  return {
    ok: true,
    state: {
      ...state,
      ores: nextOres,
      wallet: { ...state.wallet, RUB: state.wallet.RUB + earned },
      logs: appendLog(
        state.logs,
        makeLog('business', `Станок «${def.name}» ×${count} отчеканил +${earned.toLocaleString('ru-RU')} RUB.`, now),
      ),
    },
    message: `Цикл печати принес +${earned.toLocaleString('ru-RU')} RUB`,
  };
}

export function buyMiningRack(state: PlayerState, poolId: string, now = Date.now()): ActionResult {
  const pool = MINING_POOLS.find((p) => p.id === poolId);
  if (!pool) return { ok: false, state, message: 'Пул не найден.' };
  const totalRacks = getTotalMiningRacks(state);
  if (totalRacks >= state.maxMiningRacksCap) {
    return {
      ok: false,
      state,
      message: `Достигнут лимит стоек (${state.maxMiningRacksCap}). Расширьте лимит до Hard Cap 100.`,
    };
  }
  if (state.wallet.RUB < pool.costRub) {
    return { ok: false, state, message: `Нужно ${pool.costRub.toLocaleString('ru-RU')} RUB.` };
  }
  return {
    ok: true,
    state: {
      ...state,
      wallet: { ...state.wallet, RUB: state.wallet.RUB - pool.costRub },
      miningRacks: { ...state.miningRacks, [poolId]: (state.miningRacks[poolId] ?? 0) + 1 },
      logs: appendLog(state.logs, makeLog('business', `Добавлена стойка в пул ${pool.name}.`, now)),
    },
    message: `Стойка подключена к пулу ${pool.name}!`,
  };
}

export function expandMiningRackLimit(state: PlayerState, now = Date.now()): ActionResult {
  if (state.maxMiningRacksCap >= HARD_CAP_MINING_RACKS) {
    return { ok: false, state, message: 'Достигнут Hard Cap 100 стоек.' };
  }
  const costEur = 25;
  if (state.wallet.EUR < costEur) {
    return { ok: false, state, message: `Для расширения (+5 стоек) нужно ${costEur} EUR.` };
  }
  const nextCap = Math.min(HARD_CAP_MINING_RACKS, state.maxMiningRacksCap + 5);
  return {
    ok: true,
    state: {
      ...state,
      maxMiningRacksCap: nextCap,
      wallet: { ...state.wallet, EUR: state.wallet.EUR - costEur },
      logs: appendLog(state.logs, makeLog('business', `Лимит майнинг-стоек расширен до ${nextCap} (Hard Cap 100).`, now)),
    },
    message: `Лимит стоек увеличен до ${nextCap}!`,
  };
}

// --- Financial System: Bank, Multi-currency Safe, Exchange (6-10% spread or 0% license 150€) ---

export function bankDeposit(state: PlayerState, amountRub: number, now = Date.now()): ActionResult {
  const amt = Math.floor(amountRub);
  if (amt <= 0) return { ok: false, state, message: 'Укажите сумму больше 0.' };
  if (state.wallet.RUB < amt) return { ok: false, state, message: 'Недостаточно RUB в кошельке.' };
  if (state.bankDepositRub + amt > BANK_DEPOSIT_CAP_RUB) {
    return { ok: false, state, message: 'Лимит банковского депозита — 50,000,000 RUB.' };
  }
  return {
    ok: true,
    state: {
      ...state,
      wallet: { ...state.wallet, RUB: state.wallet.RUB - amt },
      bankDepositRub: state.bankDepositRub + amt,
      lastDepositYieldAt: now,
      logs: appendLog(state.logs, makeLog('bank', `Пополнен депозит на ${amt.toLocaleString('ru-RU')} RUB.`, now)),
    },
    message: `Вложено ${amt.toLocaleString('ru-RU')} RUB под ${calculateDailyDepositRatePct(state)}%/день.`,
  };
}

export function bankWithdraw(state: PlayerState, amountRub: number, now = Date.now()): ActionResult {
  const amt = Math.floor(amountRub);
  if (amt <= 0 || state.bankDepositRub < amt) {
    return { ok: false, state, message: 'Недостаточно средств на депозите.' };
  }
  const fee = Math.round(amt * (state.politics.bankFeePct / 100));
  const net = amt - fee;
  return {
    ok: true,
    state: {
      ...state,
      bankDepositRub: state.bankDepositRub - amt,
      wallet: { ...state.wallet, RUB: state.wallet.RUB + net },
      logs: appendLog(
        state.logs,
        makeLog('bank', `Снято с депозита ${net.toLocaleString('ru-RU')} RUB (пошлина ${state.politics.bankFeePct}%).`, now),
      ),
    },
    message: `Выведено ${net.toLocaleString('ru-RU')} RUB (пошлина ${fee.toLocaleString('ru-RU')} RUB).`,
  };
}

export function transferSafe(
  state: PlayerState,
  currency: Currency,
  amount: number,
  direction: 'to_safe' | 'from_safe',
  now = Date.now(),
): ActionResult {
  if (amount <= 0) return { ok: false, state, message: 'Сумма должна быть больше 0.' };
  const precision = currency === 'BTC' ? 6 : 2;
  const rounded = Number(amount.toFixed(precision));

  if (direction === 'to_safe') {
    if (state.wallet[currency] < rounded) {
      return { ok: false, state, message: `Недостаточно ${currency} в кошельке.` };
    }
    return {
      ok: true,
      state: {
        ...state,
        wallet: { ...state.wallet, [currency]: Number((state.wallet[currency] - rounded).toFixed(precision)) },
        safe: { ...state.safe, [currency]: Number((state.safe[currency] + rounded).toFixed(precision)) },
        logs: appendLog(state.logs, makeLog('bank', `В Сейф (0%) переведено ${rounded} ${currency}.`, now)),
      },
      message: `${rounded} ${currency} защищено в Сейфе.`,
    };
  }

  if (state.safe[currency] < rounded) {
    return { ok: false, state, message: `Недостаточно ${currency} в Сейфе.` };
  }
  return {
    ok: true,
    state: {
      ...state,
      safe: { ...state.safe, [currency]: Number((state.safe[currency] - rounded).toFixed(precision)) },
      wallet: { ...state.wallet, [currency]: Number((state.wallet[currency] + rounded).toFixed(precision)) },
      logs: appendLog(state.logs, makeLog('bank', `Из Сейфа получено ${rounded} ${currency}.`, now)),
    },
    message: `${rounded} ${currency} переведено в кошелек.`,
  };
}

export function exchangeCurrency(
  state: PlayerState,
  from: Currency,
  to: Currency,
  amountFrom: number,
  now = Date.now(),
): ActionResult {
  if (from === to) return { ok: false, state, message: 'Выберите разные валюты.' };
  if (amountFrom <= 0) return { ok: false, state, message: 'Введите сумму обмена.' };
  if (state.wallet[from] < amountFrom) {
    return { ok: false, state, message: `Недостаточно ${from} в кошельке.` };
  }

  const spreadPct = state.hasZeroSpreadLicense ? 0 : 8; // ~6-10% spread without 150€ license
  const rubEquivalent = amountFrom * EXCHANGE_RATES_RUB[from];
  const afterSpreadRub = rubEquivalent * (1 - spreadPct / 100);
  const rawOut = afterSpreadRub / EXCHANGE_RATES_RUB[to];
  const outPrecision = to === 'BTC' ? 6 : 2;
  const fromPrecision = from === 'BTC' ? 6 : 2;
  const amountTo = Number(rawOut.toFixed(outPrecision));
  if (amountTo <= 0) {
    return { ok: false, state, message: 'Сумма слишком мала для обмена.' };
  }

  return {
    ok: true,
    state: {
      ...state,
      wallet: {
        ...state.wallet,
        [from]: Number((state.wallet[from] - amountFrom).toFixed(fromPrecision)),
        [to]: Number((state.wallet[to] + amountTo).toFixed(outPrecision)),
      },
      logs: appendLog(
        state.logs,
        makeLog('bank', `Обмен ${amountFrom} ${from} -> ${amountTo} ${to} (спред ${spreadPct}%).`, now),
      ),
    },
    message: `Обменяно ${amountFrom} ${from} → ${amountTo} ${to} (комиссия ${spreadPct}%)`,
  };
}

export function buyZeroSpreadLicense(state: PlayerState, now = Date.now()): ActionResult {
  if (state.hasZeroSpreadLicense) return { ok: false, state, message: 'Лицензия 0% уже активна.' };
  if (state.wallet.EUR < 150) return { ok: false, state, message: 'Нужно 150 EUR для лицензии 0% комиссии.' };
  return {
    ok: true,
    state: {
      ...state,
      hasZeroSpreadLicense: true,
      wallet: { ...state.wallet, EUR: Number((state.wallet.EUR - 150).toFixed(2)) },
      logs: appendLog(state.logs, makeLog('bank', 'Активирована лицензия обменника 0% комиссии (150€).', now)),
    },
    message: 'Лицензия 0% комиссии обменника активирована!',
  };
}

// --- Real Estate ---

export function buyProperty(state: PlayerState, propertyId: string, now = Date.now()): ActionResult {
  const def = PROPERTIES.find((p) => p.id === propertyId);
  if (!def) return { ok: false, state, message: 'Объект недвижимости не найден.' };
  if (state.ownedPropertyId === propertyId) return { ok: false, state, message: 'Вы уже живете здесь.' };
  if (state.wallet.RUB < def.costRub) {
    return { ok: false, state, message: `Нужно ${def.costRub.toLocaleString('ru-RU')} RUB.` };
  }
  return {
    ok: true,
    state: {
      ...state,
      ownedPropertyId: def.id,
      wallet: { ...state.wallet, RUB: state.wallet.RUB - def.costRub },
      logs: appendLog(
        state.logs,
        makeLog('bank', `Куплено жилье «${def.name}» (реген энергии +${def.regenBonusPct}%).`, now),
      ),
    },
    message: `Переезд в «${def.name}»! Реген энергии +${def.regenBonusPct}%${def.unlocksCoffee ? ' · Кофе +25⚡ открыт' : ''}.`,
  };
}

// --- Cars & Metropolis Ring Racing ---

export function buyCar(state: PlayerState, carId: string, now = Date.now()): ActionResult {
  const def = CARS.find((c) => c.id === carId);
  if (!def) return { ok: false, state, message: 'Автомобиль не найден.' };
  if (state.garage.some((g) => g.carId === carId)) {
    return { ok: false, state, message: 'Этот автомобиль уже есть в вашем гараже.' };
  }
  if (state.wallet.RUB < def.costRub) {
    return { ok: false, state, message: `Нужно ${def.costRub.toLocaleString('ru-RU')} RUB.` };
  }
  return {
    ok: true,
    state: {
      ...state,
      wallet: { ...state.wallet, RUB: state.wallet.RUB - def.costRub },
      garage: [...state.garage, { carId, conditionPct: 100, wins: 0, races: 0 }],
      activeCarId: state.activeCarId ?? carId,
      logs: appendLog(state.logs, makeLog('race', `Куплен автомобиль ${def.name}.`, now)),
    },
    message: `${def.name} доставлен в гараж!`,
  };
}

export function repairCar(state: PlayerState, carId: string, now = Date.now()): ActionResult {
  const owned = state.garage.find((c) => c.carId === carId);
  const def = CARS.find((c) => c.id === carId);
  if (!owned || !def) return { ok: false, state, message: 'Авто не найдено.' };
  if (owned.conditionPct >= 100) return { ok: false, state, message: 'Автомобиль в идеальном состоянии.' };
  const cost = Math.round(((100 - owned.conditionPct) / 100) * def.repairBaseRub);
  if (state.wallet.RUB < cost) {
    return { ok: false, state, message: `Нужно ${cost.toLocaleString('ru-RU')} RUB на ремонт.` };
  }
  return {
    ok: true,
    state: {
      ...state,
      wallet: { ...state.wallet, RUB: state.wallet.RUB - cost },
      garage: state.garage.map((c) => (c.carId === carId ? { ...c, conditionPct: 100 } : c)),
      logs: appendLog(state.logs, makeLog('race', `${def.name} отремонтирован за ${cost.toLocaleString('ru-RU')} RUB.`, now)),
    },
    message: `${def.name} полностью восстановлен.`,
  };
}

export function runRace(
  state: PlayerState,
  mode: 'pve' | 'pvp',
  betRub: number,
  now = Date.now(),
  rng: () => number = Math.random,
): ActionResult {
  const ticked = tickPlayerState(state, now);
  if (!ticked.activeCarId) return { ok: false, state: ticked, message: 'Выберите автомобиль в гараже.' };
  const owned = ticked.garage.find((c) => c.carId === ticked.activeCarId);
  const def = CARS.find((c) => c.id === ticked.activeCarId);
  if (!owned || !def) return { ok: false, state: ticked, message: 'Активное авто не найдено.' };
  if (owned.conditionPct < 20) {
    return { ok: false, state: ticked, message: 'Состояние авто <20%. Нужен ремонт перед заездом.' };
  }
  const bet = Math.max(1_000, Math.floor(betRub));
  if (ticked.wallet.RUB < bet) return { ok: false, state: ticked, message: 'Недостаточно RUB для ставки.' };

  const playerScore = (def.speed * 0.65 + def.handling * 0.35) * (0.85 + rng() * 0.3);
  const opponentScore = (def.speed * 0.62 + def.handling * 0.35) * (0.82 + rng() * 0.34);
  const won = playerScore >= opponentScore;

  // 15% DPS raid risk (25% fine of bet), 12% crash risk
  const dpsHit = rng() < 0.15;
  const crashHit = rng() < 0.12;
  const wear = crashHit ? 28 : 8;
  const dpsFine = dpsHit ? Math.round(bet * 0.25) : 0;

  let deltaRub = 0;
  if (won) {
    // 5% house fee on PvP duels
    const payout = mode === 'pvp' ? Math.round(bet * 0.95) : Math.round(bet * 0.8);
    deltaRub = payout - dpsFine;
  } else {
    deltaRub = -bet - dpsFine;
  }

  const nextRub = Math.max(0, ticked.wallet.RUB + deltaRub);
  const notes: string[] = [];
  if (dpsHit) notes.push(`Рейд ДПС (-${dpsFine.toLocaleString('ru-RU')} RUB)`);
  if (crashHit) notes.push('Авария (-28% сост.)');

  const summary = won
    ? `Победа в ${mode.toUpperCase()} на ${def.name}: +${Math.max(0, deltaRub).toLocaleString('ru-RU')} RUB${notes.length ? ' · ' + notes.join(', ') : ''}`
    : `Поражение в ${mode.toUpperCase()} на ${def.name}: -${Math.abs(deltaRub).toLocaleString('ru-RU')} RUB${notes.length ? ' · ' + notes.join(', ') : ''}`;

  return {
    ok: true,
    state: {
      ...ticked,
      wallet: { ...ticked.wallet, RUB: nextRub },
      garage: ticked.garage.map((c) =>
        c.carId === def.id
          ? {
              ...c,
              conditionPct: Math.max(0, c.conditionPct - wear),
              races: c.races + 1,
              wins: c.wins + (won ? 1 : 0),
            }
          : c,
      ),
      logs: appendLog(ticked.logs, makeLog('race', summary, now)),
    },
    message: summary,
  };
}

// --- Casino, Fortune Wheel & Black Market ---

export function buyCasinoAccess(
  state: PlayerState,
  tier: 'standard' | 'vip' | 'azart_pack',
  now = Date.now(),
): ActionResult {
  if (tier === 'azart_pack') {
    if (state.wallet.EUR < 400) return { ok: false, state, message: 'Для Azart-Pack нужно 400 EUR.' };
    return {
      ok: true,
      state: {
        ...state,
        casinoTicketTier: 'azart_pack',
        wallet: { ...state.wallet, EUR: Number((state.wallet.EUR - 400).toFixed(2)) },
        logs: appendLog(state.logs, makeLog('casino', 'Активирован Azart-Pack (RTP 97.85% + «Сейв-Х» 15% кэшбэк).', now)),
      },
      message: 'Azart-Pack активирован! RTP 97.85% и 15% кэшбэк.',
    };
  }
  const cost = tier === 'vip' ? 250_000 : 50_000;
  if (state.wallet.RUB < cost) {
    return { ok: false, state, message: `Нужно ${cost.toLocaleString('ru-RU')} RUB для билета.` };
  }
  return {
    ok: true,
    state: {
      ...state,
      casinoTicketTier: tier,
      wallet: { ...state.wallet, RUB: state.wallet.RUB - cost },
      logs: appendLog(
        state.logs,
        makeLog('casino', `Куплен входной билет казино (${tier === 'vip' ? '250k' : '50k'} RUB).`, now),
      ),
    },
    message: `Билет в казино (${tier === 'vip' ? 'VIP' : 'Стандарт'}) активирован.`,
  };
}

export function playOneButtonCasino(
  state: PlayerState,
  game: 'slot' | 'dice',
  betRub: number,
  now = Date.now(),
  rng: () => number = Math.random,
): ActionResult {
  if (state.casinoTicketTier === 'none') {
    return { ok: false, state, message: 'Сначала купите входной билет (50k/250k RUB) или Azart-Pack.' };
  }
  const bet = Math.max(1_000, Math.floor(betRub));
  if (state.wallet.RUB < bet) return { ok: false, state, message: 'Недостаточно RUB для ставки.' };

  const highRtp = state.casinoTicketTier === 'vip' || state.casinoTicketTier === 'azart_pack';
  let payout = 0;
  let label = '';

  if (game === 'dice') {
    // PvP Dice with 5% commission
    const playerRoll = Math.floor(rng() * 6) + 1 + Math.floor(rng() * 6) + 1;
    const oppRoll = Math.floor(rng() * 6) + 1 + Math.floor(rng() * 6) + 1;
    if (playerRoll > oppRoll) {
      payout = Math.round(bet * 1.95);
      label = `Кости ${playerRoll}:${oppRoll} — Победа (+${(payout - bet).toLocaleString('ru-RU')} RUB)`;
    } else if (playerRoll === oppRoll) {
      payout = bet;
      label = `Кости ${playerRoll}:${oppRoll} — Ничья (возврат ставки)`;
    } else {
      payout = 0;
      label = `Кости ${playerRoll}:${oppRoll} — Проигрыш`;
    }
  } else {
    // One-button multiplier x0.00..x10.00 (RTP ~89.75% / ~97.85%)
    const r = rng();
    let mult = 0;
    if (r < (highRtp ? 0.36 : 0.44)) mult = 0;
    else if (r < 0.66) mult = 0.5;
    else if (r < 0.84) mult = 1.5;
    else if (r < 0.94) mult = 2.5;
    else if (r < 0.985) mult = 5.0;
    else mult = 10.0;
    payout = Math.round(bet * mult);
    label = `Однокнопочная игра: множитель x${mult.toFixed(2)} (выплата ${payout.toLocaleString('ru-RU')} RUB)`;
  }

  // Azart-Pack 'Сейв-Х' 15% cashback on net loss
  let cashback = 0;
  if (payout < bet && state.casinoTicketTier === 'azart_pack') {
    cashback = Math.round((bet - payout) * 0.15);
    label += ` · Сейв-Х +${cashback.toLocaleString('ru-RU')} RUB`;
  }

  const nextRub = state.wallet.RUB - bet + payout + cashback;
  return {
    ok: true,
    state: {
      ...state,
      wallet: { ...state.wallet, RUB: nextRub },
      logs: appendLog(state.logs, makeLog('casino', label, now)),
    },
    message: label,
  };
}

export function spinFortuneWheel(state: PlayerState, now = Date.now(), rng: () => number = Math.random): ActionResult {
  if (state.lastWheelSpinAt > 0 && now - state.lastWheelSpinAt < WHEEL_COOLDOWN_MS) {
    const minsLeft = Math.ceil((WHEEL_COOLDOWN_MS - (now - state.lastWheelSpinAt)) / 60000);
    return { ok: false, state, message: `Колесо Фортуны доступно раз в 6 часов. Осталось ${minsLeft} мин.` };
  }
  const roll = rng();
  let nextWallet = { ...state.wallet };
  let nextEnergy = state.energy;
  let rewardText = '';

  if (roll < 0.35) {
    nextWallet.RUB += 25_000;
    rewardText = '+25,000 RUB';
  } else if (roll < 0.65) {
    nextEnergy = Math.min(state.maxEnergy, state.energy + 30);
    rewardText = '+30⚡ энергии';
  } else if (roll < 0.88) {
    nextWallet.USD += 250;
    rewardText = '+250 USD';
  } else {
    nextWallet.EUR += 35;
    rewardText = '+35 EUR';
  }

  return {
    ok: true,
    state: {
      ...state,
      wallet: nextWallet,
      energy: nextEnergy,
      lastWheelSpinAt: now,
      logs: appendLog(state.logs, makeLog('casino', `Колесо Фортуны: выигрыш ${rewardText}!`, now)),
    },
    message: `Колесо Фортуны: ${rewardText}!`,
  };
}

export function buyBlackMarketItem(state: PlayerState, itemId: string, now = Date.now()): ActionResult {
  if (state.karma >= 0 && state.factionId !== 'syndicate') {
    return { ok: false, state, message: 'Черный рынок открыт при отрицательной карме (<0) или членстве в Синдикате.' };
  }
  const item = BLACK_MARKET_ROTATION_POOL.find((i) => i.id === itemId);
  if (!item) return { ok: false, state, message: 'Лот не найден.' };
  if (state.wallet.RUB < item.costRub) {
    return { ok: false, state, message: `Нужно ${item.costRub.toLocaleString('ru-RU')} RUB.` };
  }

  let next: PlayerState = {
    ...state,
    wallet: { ...state.wallet, RUB: state.wallet.RUB - item.costRub },
  };

  if (item.kind === 'gear') {
    next.hasBlackMarketGear = true;
  } else if (item.kind === 'karma_up') {
    next.karma += 35;
  } else if (item.kind === 'karma_down') {
    next.karma -= 40;
    next.wallet = { ...next.wallet, RUB: next.wallet.RUB + 95_000 };
  } else if (item.kind === 'ore_crate') {
    next.ores = {
      ...next.ores,
      titanium: (next.ores.titanium ?? 0) + 35,
      platinum: (next.ores.platinum ?? 0) + 15,
    };
  } else if (item.kind === 'drill_fix') {
    next.ownedDrills = next.ownedDrills.map((d) => ({ ...d, wearPct: 0, needsInspection: false }));
  } else if (item.kind === 'clear_warn') {
    next.warnings = Math.max(0, next.warnings - 1);
  }

  next.logs = appendLog(next.logs, makeLog('casino', `Черный рынок: получено «${item.name}».`, now));
  return { ok: true, state: next, message: `Сделка завершена: ${item.name}` };
}

// --- Factions, Clans & Turf Wars ---

export function joinFaction(state: PlayerState, factionId: Exclude<FactionId, 'none'>, now = Date.now()): ActionResult {
  const def = FACTIONS.find((f) => f.id === factionId);
  if (!def) return { ok: false, state, message: 'Фракция не найдена.' };
  if (def.karmaRequirement === 'positive' && state.karma <= 0) {
    return { ok: false, state, message: `Для вступления в «${def.name}» нужна положительная карма (>0).` };
  }
  if (def.karmaRequirement === 'negative' && state.karma >= 0) {
    return { ok: false, state, message: `Для вступления в «${def.name}» нужна отрицательная карма (<0).` };
  }
  return {
    ok: true,
    state: {
      ...state,
      factionId,
      logs: appendLog(state.logs, makeLog('politics', `Вы вступили во фракцию «${def.name}».`, now)),
    },
    message: `Вы теперь участник фракции «${def.name}»!`,
  };
}

export function createClan(
  state: PlayerState,
  name: string,
  tag: string,
  payWith: 'RUB' | 'EUR',
  now = Date.now(),
): ActionResult {
  if (state.prestigeTier < 3) {
    return { ok: false, state, message: 'Создание Клана доступно с уровня Престижа III+.' };
  }
  const cleanName = name.trim();
  const cleanTag = tag.trim().toUpperCase().slice(0, 5);
  if (cleanName.length < 3 || cleanTag.length < 2) {
    return { ok: false, state, message: 'Укажите название клана (от 3 симв.) и тег (2–5 симв.).' };
  }
  if (payWith === 'RUB' && state.wallet.RUB < 100_000_000) {
    return { ok: false, state, message: 'Нужно 100,000,000 RUB для регистрации клана.' };
  }
  if (payWith === 'EUR' && state.wallet.EUR < 500) {
    return { ok: false, state, message: 'Нужно 500 EUR для регистрации клана.' };
  }

  const nextWallet = { ...state.wallet };
  if (payWith === 'RUB') nextWallet.RUB -= 100_000_000;
  else nextWallet.EUR = Number((nextWallet.EUR - 500).toFixed(2));

  return {
    ok: true,
    state: {
      ...state,
      wallet: nextWallet,
      clan: {
        name: cleanName,
        tag: cleanTag,
        rank: 'Босс',
        taxPct: 5,
        hqLevel: 1,
        treasuryRub: 0,
        membersCount: 1,
        controlledDistricts: [],
      },
      logs: appendLog(state.logs, makeLog('politics', `Основан клан [${cleanTag}] ${cleanName}!`, now)),
    },
    message: `Клан [${cleanTag}] ${cleanName} успешно основан!`,
  };
}

export function upgradeClanHq(state: PlayerState, now = Date.now()): ActionResult {
  if (!state.clan) return { ok: false, state, message: 'Вы не состоите в клане.' };
  if (state.clan.hqLevel >= 10) return { ok: false, state, message: 'Штаб-квартира уже 10-го уровня.' };
  const cost = state.clan.hqLevel * 15_000_000;
  if (state.wallet.RUB < cost) {
    return { ok: false, state, message: `Нужно ${cost.toLocaleString('ru-RU')} RUB для апгрейда Штаба.` };
  }
  return {
    ok: true,
    state: {
      ...state,
      wallet: { ...state.wallet, RUB: state.wallet.RUB - cost },
      clan: { ...state.clan, hqLevel: state.clan.hqLevel + 1 },
      logs: appendLog(state.logs, makeLog('politics', `Штаб-квартира клана улучшена до ур. ${state.clan.hqLevel + 1}.`, now)),
    },
    message: `Штаб клана повышен до ур. ${state.clan.hqLevel + 1}!`,
  };
}

export function raidTurfDistrict(
  state: PlayerState,
  districtId: string,
  now = Date.now(),
  rng: () => number = Math.random,
): ActionResult {
  if (!state.clan) return { ok: false, state, message: 'Войны за районы (Turf Wars) доступны только кланам.' };
  const district = state.districts.find((d) => d.id === districtId);
  if (!district) return { ok: false, state, message: 'Район не найден.' };
  if (state.energy < 25) return { ok: false, state, message: 'Для штурма района нужно 25⚡.' };

  const attackPower = state.clan.hqLevel * 12 + state.prestigeTier * 6 + Math.floor(rng() * 35);
  const won = attackPower >= district.defensePower;
  const tribute = won ? Math.round(district.dailyVolumeRub * 0.03) : 0; // 3% of district deals

  const nextDistricts = state.districts.map((d) =>
    d.id === districtId && won
      ? { ...d, controllingClan: `[${state.clan!.tag}] ${state.clan!.name}`, defensePower: d.defensePower + 8 }
      : d,
  );

  const nextControlled =
    won && !state.clan.controlledDistricts.includes(districtId)
      ? [...state.clan.controlledDistricts, districtId]
      : state.clan.controlledDistricts;

  return {
    ok: true,
    state: {
      ...state,
      energy: state.energy - 25,
      districts: nextDistricts,
      clan: {
        ...state.clan,
        controlledDistricts: nextControlled,
        treasuryRub: state.clan.treasuryRub + tribute,
      },
      logs: appendLog(
        state.logs,
        makeLog(
          'politics',
          won
            ? `Turf War: захвачен район «${district.name}»! В общак поступило 3% (${tribute.toLocaleString('ru-RU')} RUB).`
            : `Turf War: штурм района «${district.name}» отбит (сила ${attackPower} против ${district.defensePower}).`,
          now,
        ),
      ),
    },
    message: won
      ? `Район «${district.name}» под контролем вашего клана! +${tribute.toLocaleString('ru-RU')} RUB в общак.`
      : `Оборона района устояла (${attackPower} vs ${district.defensePower}). Прокачайте Штаб клана.`,
  };
}

// --- Politics, President & License Plates ---

export function voteForPresident(state: PlayerState, candidateId: string, now = Date.now()): ActionResult {
  const cand = ELECTION_CANDIDATES.find((c) => c.id === candidateId);
  if (!cand) return { ok: false, state, message: 'Кандидат не найден.' };
  return {
    ok: true,
    state: {
      ...state,
      politics: {
        ...state.politics,
        votedCandidateId: candidateId,
        presidentName: cand.name,
        bankFeePct: candidateId === 'cand_volkov' ? 1.5 : candidateId === 'cand_orlova' ? 2.0 : 2.8,
      },
      logs: appendLog(state.logs, makeLog('politics', `Голос отдан за кандидата ${cand.name}.`, now)),
    },
    message: `Ваш голос за ${cand.name} учтен!`,
  };
}

export function buyLicensePlate(state: PlayerState, code: string, now = Date.now()): ActionResult {
  const plate = LICENSE_PLATES_SHOWCASE.find((p) => p.code === code);
  if (!plate) return { ok: false, state, message: 'Номер не найден.' };
  if (state.ownedPlates.includes(code)) return { ok: false, state, message: 'Этот номер уже в вашей коллекции.' };
  if (state.wallet.RUB < plate.costRub) {
    return { ok: false, state, message: `Нужно ${plate.costRub.toLocaleString('ru-RU')} RUB.` };
  }
  return {
    ok: true,
    state: {
      ...state,
      wallet: { ...state.wallet, RUB: state.wallet.RUB - plate.costRub },
      ownedPlates: [...state.ownedPlates, code],
      logs: appendLog(state.logs, makeLog('bank', `Куплен статусный госномер ${code}.`, now)),
    },
    message: `Номер ${code} добавлен в коллекцию!`,
  };
}

// --- Dev Mode (Creator Master Control) ---

export function devGrantCurrency(
  state: PlayerState,
  currency: Currency,
  delta: number,
  now = Date.now(),
): ActionResult {
  if (!state.isCreator) {
    return { ok: false, state, message: 'Доступ запрещен: требуется Telegram ID Создателя.' };
  }
  const precision = currency === 'BTC' ? 6 : 2;
  const nextVal = Math.max(0, Number((state.wallet[currency] + delta).toFixed(precision)));
  return {
    ok: true,
    state: {
      ...state,
      wallet: { ...state.wallet, [currency]: nextVal },
      logs: appendLog(
        state.logs,
        makeLog('dev', `Dev Mode: ${delta >= 0 ? '+' : ''}${delta} ${currency}.`, now),
      ),
    },
    message: `Баланс ${currency} обновлен: ${nextVal.toLocaleString('ru-RU')}`,
  };
}

export function devPatchState(
  state: PlayerState,
  patch: Partial<
    Pick<
      PlayerState,
      'energy' | 'karma' | 'warnings' | 'bannedUntil' | 'level' | 'experienceShifts' | 'hasBlackMarketGear'
    >
  >,
  now = Date.now(),
): ActionResult {
  if (!state.isCreator) {
    return { ok: false, state, message: 'Доступ запрещен: требуется Telegram ID Создателя.' };
  }
  return {
    ok: true,
    state: {
      ...state,
      ...patch,
      logs: appendLog(state.logs, makeLog('dev', 'Dev Mode: Live State Editor применил изменения.', now)),
    },
    message: 'Параметры игрока обновлены через Live State Editor.',
  };
}

export function devVetoPresidentDecree(state: PlayerState, now = Date.now()): ActionResult {
  if (!state.isCreator) {
    return { ok: false, state, message: 'Доступ запрещен.' };
  }
  return {
    ok: true,
    state: {
      ...state,
      politics: {
        ...state.politics,
        stateOreOrderActive: !state.politics.stateOreOrderActive,
        bankFeePct: 1.5,
      },
      logs: appendLog(
        state.logs,
        makeLog(
          'dev',
          `Dev Mode: применено вето/переключение указов Президента (пошлина 1.5%, госзаказ ${!state.politics.stateOreOrderActive ? 'ВКЛ' : 'ВЫКЛ'}).`,
          now,
        ),
      ),
    },
    message: 'Указы Президента изменены правом вето Создателя.',
  };
}
