import { useState } from 'react';
import { Landmark, Home, Users, Dices, Scale, Sparkles, Swords } from 'lucide-react';
import {
  BLACK_MARKET_ROTATION_POOL,
  ELECTION_CANDIDATES,
  EXCHANGE_RATES_RUB,
  FACTIONS,
  LICENSE_PLATES_SHOWCASE,
  PROPERTIES,
} from '../game/catalog';
import {
  BANK_DEPOSIT_CAP_RUB,
  BLACK_MARKET_ROTATION_MS,
  WHEEL_COOLDOWN_MS,
  calculateDailyDepositRatePct,
  getActiveBlackMarketOfferIds,
} from '../game/engine';
import type { CitySubTab, Currency, FactionId, PlayerState } from '../game/types';
import { fmtBtc, fmtCountdown, fmtEur, fmtRub, fmtUsd } from './format';

interface CityMarketTabProps {
  state: PlayerState;
  now: number;
  onBankDeposit: (amountRub: number) => void;
  onBankWithdraw: (amountRub: number) => void;
  onExchange: (from: Currency, to: Currency, amount: number) => void;
  onBuyZeroSpread: () => void;
  onBuyProperty: (propId: string) => void;
  onJoinFaction: (factionId: Exclude<FactionId, 'none'>) => void;
  onCreateClan: (name: string, tag: string, payWith: 'RUB' | 'EUR') => void;
  onUpgradeClanHq: () => void;
  onRaidDistrict: (districtId: string) => void;
  onBuyCasinoAccess: (tier: 'standard' | 'vip' | 'azart_pack') => void;
  onPlayCasino: (game: 'slot' | 'dice', betRub: number) => void;
  onSpinWheel: () => void;
  onBuyBlackMarket: (itemId: string) => void;
  onVotePresident: (candidateId: string) => void;
  onBuyPlate: (code: string) => void;
}

export function CityMarketTab(props: CityMarketTabProps) {
  const { state, now } = props;
  const [subTab, setSubTab] = useState<CitySubTab>('bank');

  // Form inputs
  const [depositAmt, setDepositAmt] = useState('10000');
  const [exFrom, setExFrom] = useState<Currency>('RUB');
  const [exTo, setExTo] = useState<Currency>('USD');
  const [exAmt, setExAmt] = useState('10000');
  const [clanName, setClanName] = useState('');
  const [clanTag, setClanTag] = useState('');
  const [casinoBet, setCasinoBet] = useState('10000');

  const depositRate = calculateDailyDepositRatePct(state);
  const wheelCooldownMs =
    state.lastWheelSpinAt > 0 ? Math.max(0, WHEEL_COOLDOWN_MS - (now - state.lastWheelSpinAt)) : 0;
  const bmNextRotationMs = Math.max(
    0,
    state.blackMarketSeedAt + BLACK_MARKET_ROTATION_MS - now,
  );
  const activeBmIds = getActiveBlackMarketOfferIds(now);

  return (
    <div className="space-y-6">
      {/* Sub-tabs header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Город & Маркет</h2>
          <p className="text-xs text-[#8C96A9]">
            Банк · Недвижимость · Фракции & Turf Wars · Казино & Черный рынок · Политика & Номера
          </p>
        </div>

        <div className="flex flex-wrap gap-1 rounded-lg border border-white/10 bg-[#12161E] p-1">
          {[
            { id: 'bank' as const, label: 'Банк & Обмен' },
            { id: 'realestate' as const, label: 'Недвижимость' },
            { id: 'factions' as const, label: 'Фракции & Кланы' },
            { id: 'casino' as const, label: 'Казино & Рынок' },
            { id: 'politics' as const, label: 'Политика & Номера' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSubTab(item.id)}
              className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                subTab === item.id ? 'bg-[#D4A853] text-[#0A0C10]' : 'text-[#8C96A9] hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* SUBTAB 1: BANK, DEPOSITS & 4-CURRENCY EXCHANGE */}
      {subTab === 'bank' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="lg:col-span-6 rounded-xl border border-white/[0.08] bg-[#12161E] p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Landmark className="h-5 w-5 text-[#D4A853]" aria-hidden="true" />
              <div>
                <h3 className="font-display text-xl font-bold text-white">Банковский депозит</h3>
                <p className="font-mono-num text-xs text-[#8C96A9]">
                  До {fmtRub(BANK_DEPOSIT_CAP_RUB)} · Ставка {depositRate}%/день · Пошлина вывода {state.politics.bankFeePct}%
                </p>
              </div>
            </div>

            <div className="mb-4 border-y border-white/[0.07] py-4">
              <p className="text-xs text-[#8C96A9]">Текущий вклад</p>
              <p className="font-mono-num text-3xl font-bold text-white">{fmtRub(state.bankDepositRub)}</p>
            </div>

            <div className="space-y-3">
              <label className="block text-xs text-[#8C96A9]" htmlFor="deposit-input">
                Сумма операции (RUB)
              </label>
              <input
                id="deposit-input"
                type="number"
                min={100}
                value={depositAmt}
                onChange={(e) => setDepositAmt(e.target.value)}
                className="w-full rounded-lg border border-white/12 bg-[#0D1017] px-3.5 py-2.5 font-mono-num text-sm text-white"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => props.onBankDeposit(Number(depositAmt))}
                  className="min-h-[42px] flex-1 rounded-lg bg-[#D4A853] px-4 py-2 text-sm font-bold text-[#0A0C10]"
                >
                  Вложить
                </button>
                <button
                  type="button"
                  onClick={() => props.onBankWithdraw(Number(depositAmt))}
                  className="min-h-[42px] flex-1 rounded-lg border border-white/12 bg-[#181D27] px-4 py-2 text-sm font-semibold text-white hover:border-[#D4A853]"
                >
                  Вывести
                </button>
              </div>
            </div>
          </section>

          <section className="lg:col-span-6 rounded-xl border border-white/[0.08] bg-[#12161E] p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-xl font-bold text-white">Мультивалютный обменник</h3>
                <p className="text-xs text-[#8C96A9]">
                  Текущий спред: {state.hasZeroSpreadLicense ? '0% (Лицензия активна)' : '8% (базовый 6–10%)'}
                </p>
              </div>
              {!state.hasZeroSpreadLicense && (
                <button
                  type="button"
                  onClick={props.onBuyZeroSpread}
                  className="min-h-[36px] rounded-md border border-[#D4A853]/40 bg-[#D4A853]/10 px-3 py-1 text-xs font-semibold text-[#F8E4B7]"
                >
                  Лицензия 0% (150€)
                </button>
              )}
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2 text-xs font-mono-num text-[#CBD5E1] border-y border-white/[0.07] py-3">
              <div>1 USD = {EXCHANGE_RATES_RUB.USD} ₽</div>
              <div>1 EUR = {EXCHANGE_RATES_RUB.EUR} ₽</div>
              <div>1 BTC = {fmtRub(EXCHANGE_RATES_RUB.BTC)}</div>
              <div>Кошелек: {fmtUsd(state.wallet.USD)} · {fmtEur(state.wallet.EUR)}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="mb-1 block text-xs text-[#8C96A9]" htmlFor="ex-from">Отдаете</label>
                <select
                  id="ex-from"
                  value={exFrom}
                  onChange={(e) => setExFrom(e.target.value as Currency)}
                  className="w-full rounded-lg border border-white/12 bg-[#0D1017] px-3 py-2.5 text-sm text-white"
                >
                  <option value="RUB">RUB</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="BTC">BTC</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#8C96A9]" htmlFor="ex-to">Получаете</label>
                <select
                  id="ex-to"
                  value={exTo}
                  onChange={(e) => setExTo(e.target.value as Currency)}
                  className="w-full rounded-lg border border-white/12 bg-[#0D1017] px-3 py-2.5 text-sm text-white"
                >
                  <option value="USD">USD</option>
                  <option value="RUB">RUB</option>
                  <option value="EUR">EUR</option>
                  <option value="BTC">BTC</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                aria-label="Сумма обмена"
                value={exAmt}
                onChange={(e) => setExAmt(e.target.value)}
                className="flex-1 rounded-lg border border-white/12 bg-[#0D1017] px-3.5 py-2.5 font-mono-num text-sm text-white"
              />
              <button
                type="button"
                onClick={() => props.onExchange(exFrom, exTo, Number(exAmt))}
                className="min-h-[42px] rounded-lg bg-[#D4A853] px-5 py-2 text-sm font-bold text-[#0A0C10] whitespace-nowrap"
              >
                Обменять
              </button>
            </div>
            <p className="mt-2 font-mono-num text-xs text-[#8C96A9]">
              BTC на счете: {fmtBtc(state.wallet.BTC)}
            </p>
          </section>
        </div>
      )}

      {/* SUBTAB 2: 10 REAL ESTATE PROPERTIES */}
      {subTab === 'realestate' && (
        <section className="rounded-xl border border-white/[0.08] bg-[#12161E] p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Home className="h-5 w-5 text-[#D4A853]" aria-hidden="true" />
            <div>
              <h3 className="font-display text-xl font-bold text-white">Агентство недвижимости (10 объектов)</h3>
              <p className="text-xs text-[#8C96A9]">
                От Хостела до Частного острова · Ускорение регенерации энергии до +100% · От «Студии» открыт бесплатный Кофе +25⚡
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PROPERTIES.map((prop) => {
              const owned = state.ownedPropertyId === prop.id;
              return (
                <div
                  key={prop.id}
                  className={`flex flex-col justify-between rounded-lg border p-4 ${
                    owned ? 'border-[#D4A853] bg-[#1A202C]' : 'border-white/[0.08] bg-[#161B25]'
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold text-white">{prop.name}</p>
                    <p className="mt-1 font-mono-num text-xs text-[#10B981]">
                      Реген сна: +{prop.regenBonusPct}%
                    </p>
                    <p className="mt-0.5 text-xs text-[#8C96A9]">
                      {prop.unlocksCoffee ? 'Бесплатный Кофе +25⚡ (24ч)' : 'Без домашнего кофе'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={owned}
                    onClick={() => props.onBuyProperty(prop.id)}
                    className="mt-3 min-h-[38px] w-full rounded-lg bg-[#202736] px-3 py-2 font-mono-num text-xs font-bold text-white hover:bg-[#D4A853] hover:text-[#0A0C10] disabled:opacity-45"
                  >
                    {owned ? 'Текущее жилье' : prop.costRub === 0 ? 'Базовое' : `Купить · ${fmtRub(prop.costRub)}`}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SUBTAB 3: 4 CITY FACTIONS, CLANS & TURF WARS (5 DISTRICTS) */}
      {subTab === 'factions' && (
        <div className="space-y-6">
          <section className="rounded-xl border border-white/[0.08] bg-[#12161E] p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-[#D4A853]" aria-hidden="true" />
              <h3 className="font-display text-xl font-bold text-white">4 Городские Фракции</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {FACTIONS.map((f) => {
                const active = state.factionId === f.id;
                return (
                  <div
                    key={f.id}
                    className={`flex flex-col justify-between rounded-lg border p-4 ${
                      active ? 'border-[#D4A853] bg-[#1A202C]' : 'border-white/[0.08] bg-[#161B25]'
                    }`}
                  >
                    <div>
                      <p className="text-xs text-[#D4A853]">{f.alignment}</p>
                      <p className="mt-0.5 text-base font-bold text-white">{f.name}</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-[#A3ACBE]">{f.summary}</p>
                    </div>
                    <button
                      type="button"
                      disabled={active}
                      onClick={() => props.onJoinFaction(f.id)}
                      className="mt-4 min-h-[38px] rounded-lg bg-[#202736] px-4 py-2 text-xs font-bold text-white hover:bg-[#D4A853] hover:text-[#0A0C10] disabled:opacity-45"
                    >
                      {active ? 'Ваша фракция' : 'Вступить во фракцию'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Player Clan */}
            <section className="lg:col-span-5 rounded-xl border border-white/[0.08] bg-[#12161E] p-5 sm:p-6">
              <h3 className="font-display text-xl font-bold text-white">Клан (Семья / Корпорация)</h3>
              {!state.clan ? (
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-[#8C96A9]">
                    Доступно с Престижа III+ за 100,000,000 RUB или 500 EUR. Ранги: Босс, Консильери, Капо, Боец, Рекрут.
                  </p>
                  <input
                    type="text"
                    placeholder="Название клана"
                    value={clanName}
                    onChange={(e) => setClanName(e.target.value)}
                    className="w-full rounded-lg border border-white/12 bg-[#0D1017] px-3.5 py-2 text-sm text-white"
                  />
                  <input
                    type="text"
                    placeholder="Тег (3-5 симв.)"
                    value={clanTag}
                    onChange={(e) => setClanTag(e.target.value)}
                    className="w-full rounded-lg border border-white/12 bg-[#0D1017] px-3.5 py-2 text-sm text-white uppercase"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => props.onCreateClan(clanName, clanTag, 'RUB')}
                      className="min-h-[40px] flex-1 rounded-lg bg-[#D4A853] px-3 py-2 text-xs font-bold text-[#0A0C10]"
                    >
                      Создать (100M ₽)
                    </button>
                    <button
                      type="button"
                      onClick={() => props.onCreateClan(clanName, clanTag, 'EUR')}
                      className="min-h-[40px] flex-1 rounded-lg border border-white/12 bg-[#181D27] px-3 py-2 text-xs font-semibold text-white"
                    >
                      Создать (500€)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 space-y-3 text-sm">
                  <p className="text-lg font-bold text-[#D4A853]">
                    [{state.clan.tag}] {state.clan.name}
                  </p>
                  <p className="text-xs text-[#A3ACBE]">
                    Ранг: {state.clan.rank} · Штаб ур. {state.clan.hqLevel}/10 · Налог {state.clan.taxPct}%
                  </p>
                  <p className="font-mono-num text-sm text-white">
                    Клановый общак: {fmtRub(state.clan.treasuryRub)}
                  </p>
                  <button
                    type="button"
                    onClick={props.onUpgradeClanHq}
                    className="min-h-[40px] w-full rounded-lg bg-[#D4A853] px-4 py-2 text-xs font-bold text-[#0A0C10]"
                  >
                    Прокачать Штаб-квартиру ({fmtRub(state.clan.hqLevel * 15_000_000)})
                  </button>
                </div>
              )}
            </section>

            {/* Turf Wars — 5 City Districts */}
            <section className="lg:col-span-7 rounded-xl border border-white/[0.08] bg-[#12161E] p-5 sm:p-6">
              <div className="mb-3 flex items-center gap-2">
                <Swords className="h-5 w-5 text-[#E11D48]" aria-hidden="true" />
                <div>
                  <h3 className="font-display text-xl font-bold text-white">Войны за 5 Районов (Turf Wars)</h3>
                  <p className="text-xs text-[#8C96A9]">Контролирующий клан получает 3% от всех сделок района · Штурм -25⚡</p>
                </div>
              </div>
              <div className="divide-y divide-white/[0.06]">
                {state.districts.map((dist) => (
                  <div key={dist.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{dist.name}</p>
                      <p className="font-mono-num text-xs text-[#8C96A9]">
                        Контроль: {dist.controllingClan} · Оборона {dist.defensePower} · 3% ≈ {fmtRub(dist.dailyVolumeRub * 0.03)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => props.onRaidDistrict(dist.id)}
                      className="min-h-[36px] rounded-md bg-[#E11D48] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#F43F5E] whitespace-nowrap"
                    >
                      Штурм (-25⚡)
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* SUBTAB 4: CASINO, FORTUNE WHEEL & BLACK MARKET */}
      {subTab === 'casino' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="lg:col-span-7 rounded-xl border border-white/[0.08] bg-[#12161E] p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Dices className="h-5 w-5 text-[#D4A853]" aria-hidden="true" />
                <div>
                  <h3 className="font-display text-xl font-bold text-white">Казино и Азартный Сектор</h3>
                  <p className="text-xs text-[#8C96A9]">
                    Статус входа: {state.casinoTicketTier === 'none' ? 'Нет билета' : state.casinoTicketTier.toUpperCase()} · RTP 89.75% / 97.85%
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={wheelCooldownMs > 0}
                onClick={props.onSpinWheel}
                className="flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#D4A853]/40 bg-[#D4A853]/10 px-3 py-1.5 text-xs font-semibold text-[#F8E4B7] disabled:opacity-45 whitespace-nowrap"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{wheelCooldownMs > 0 ? `Колесо ${fmtCountdown(wheelCooldownMs)}` : 'Колесо Фортуны'}</span>
              </button>
            </div>

            {state.casinoTicketTier === 'none' ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => props.onBuyCasinoAccess('standard')}
                  className="rounded-lg border border-white/10 bg-[#161B25] p-4 text-left hover:border-[#D4A853]"
                >
                  <p className="text-sm font-bold text-white">Билет Стандарт</p>
                  <p className="font-mono-num mt-1 text-xs text-[#D4A853]">50,000 ₽ · RTP 89.75%</p>
                </button>
                <button
                  type="button"
                  onClick={() => props.onBuyCasinoAccess('vip')}
                  className="rounded-lg border border-white/10 bg-[#161B25] p-4 text-left hover:border-[#D4A853]"
                >
                  <p className="text-sm font-bold text-white">Билет VIP</p>
                  <p className="font-mono-num mt-1 text-xs text-[#D4A853]">250,000 ₽ · RTP 97.85%</p>
                </button>
                <button
                  type="button"
                  onClick={() => props.onBuyCasinoAccess('azart_pack')}
                  className="rounded-lg border border-[#D4A853]/40 bg-[#D4A853]/10 p-4 text-left hover:bg-[#D4A853]/20"
                >
                  <p className="text-sm font-bold text-white">Azart-Pack</p>
                  <p className="font-mono-num mt-1 text-xs text-[#F8E4B7]">400€ · Сейв-Х 15% кэшбэк</p>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs text-[#8C96A9]" htmlFor="casino-bet">
                    Ставка (RUB)
                  </label>
                  <input
                    id="casino-bet"
                    type="number"
                    min={1000}
                    value={casinoBet}
                    onChange={(e) => setCasinoBet(e.target.value)}
                    className="w-full rounded-lg border border-white/12 bg-[#0D1017] px-3.5 py-2.5 font-mono-num text-sm text-white"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => props.onPlayCasino('slot', Number(casinoBet))}
                    className="min-h-[46px] rounded-lg bg-[#D4A853] px-4 py-2.5 text-sm font-bold text-[#0A0C10]"
                  >
                    Однокнопочная (x0.00..x10.00)
                  </button>
                  <button
                    type="button"
                    onClick={() => props.onPlayCasino('dice', Number(casinoBet))}
                    className="min-h-[46px] rounded-lg border border-white/12 bg-[#181D27] px-4 py-2.5 text-sm font-semibold text-white hover:border-[#D4A853]"
                  >
                    PvP Кости (комиссия 5%)
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Black Market with 2h rotation */}
          <section className="lg:col-span-5 rounded-xl border border-white/[0.08] bg-[#12161E] p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-white">Черный рынок</h3>
              <span className="font-mono-num text-xs text-[#E11D48]">
                Ротация: {fmtCountdown(bmNextRotationMs)}
              </span>
            </div>
            <p className="mb-4 text-xs text-[#8C96A9]">
              Открыт при отрицательной карме (&lt;0) или членстве в Синдикате.
            </p>
            <div className="divide-y divide-white/[0.06]">
              {BLACK_MARKET_ROTATION_POOL.filter((item) => activeBmIds.includes(item.id)).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white">{item.name}</p>
                    <p className="font-mono-num text-[11px] text-[#8C96A9]">
                      {item.costRub === 0 ? 'Контракт с наградой' : fmtRub(item.costRub)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => props.onBuyBlackMarket(item.id)}
                    className="min-h-[36px] rounded-md bg-[#E11D48]/15 px-3 py-1 text-xs font-bold text-[#FDA4AF] hover:bg-[#E11D48] hover:text-white whitespace-nowrap shrink-0"
                  >
                    Взять
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* SUBTAB 5: POLITICS, PRESIDENT & LICENSE PLATES SHOWCASE */}
      {subTab === 'politics' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="lg:col-span-7 rounded-xl border border-white/[0.08] bg-[#12161E] p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Scale className="h-5 w-5 text-[#D4A853]" aria-hidden="true" />
              <div>
                <h3 className="font-display text-xl font-bold text-white">Политическая система и Президент</h3>
                <p className="text-xs text-[#8C96A9]">
                  Выборы каждые 14 дней · Президент: {state.politics.presidentName} · Пошлина банка {state.politics.bankFeePct}%
                </p>
              </div>
            </div>

            <div className="mb-4 border-y border-white/[0.07] py-3 text-xs text-[#A3ACBE]">
              Госзаказ руды (+30% к цене):{' '}
              <span className="font-semibold text-white">
                {state.politics.stateOreOrderActive ? 'Активен' : 'Приостановлен'}
              </span>{' '}
              · Остаток капекса: <span className="font-mono-num text-[#D4A853]">{fmtRub(state.politics.stateOreOrderCapLeft)}</span>
            </div>

            <div className="space-y-2.5">
              {ELECTION_CANDIDATES.map((cand) => {
                const voted = state.politics.votedCandidateId === cand.id;
                return (
                  <div
                    key={cand.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-[#161B25] p-3.5"
                  >
                    <div>
                      <p className="text-sm font-bold text-white">{cand.name}</p>
                      <p className="text-xs text-[#8C96A9]">{cand.platform}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => props.onVotePresident(cand.id)}
                      className={`min-h-[36px] rounded-md px-3.5 py-1.5 text-xs font-bold whitespace-nowrap ${
                        voted
                          ? 'bg-[#10B981] text-[#0A0C10]'
                          : 'bg-[#202736] text-white hover:bg-[#D4A853] hover:text-[#0A0C10]'
                      }`}
                    >
                      {voted ? 'Вы проголосовали' : 'Голосовать'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* License Plates Showcase (Витрина номеров) */}
          <section className="lg:col-span-5 rounded-xl border border-white/[0.08] bg-[#12161E] p-5 sm:p-6">
            <h3 className="font-display mb-1 text-xl font-bold text-white">Витрина номеров</h3>
            <p className="mb-4 text-xs text-[#8C96A9]">Коллекционные госномера для автопарка</p>
            <div className="divide-y divide-white/[0.06]">
              {LICENSE_PLATES_SHOWCASE.map((plate) => {
                const owned = state.ownedPlates.includes(plate.code);
                return (
                  <div key={plate.code} className="flex items-center justify-between gap-2 py-3">
                    <div>
                      <p className="font-mono-num text-sm font-bold tracking-wider text-white">{plate.code}</p>
                      <p className="text-xs text-[#8C96A9]">{plate.prestigeBonus}</p>
                    </div>
                    <button
                      type="button"
                      disabled={owned}
                      onClick={() => props.onBuyPlate(plate.code)}
                      className="min-h-[36px] rounded-md bg-[#202736] px-3 py-1 font-mono-num text-xs font-bold text-white hover:bg-[#D4A853] hover:text-[#0A0C10] disabled:opacity-45 whitespace-nowrap"
                    >
                      {owned ? 'Куплен' : fmtRub(plate.costRub)}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
