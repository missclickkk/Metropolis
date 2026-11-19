import { useState } from 'react';
import { Pickaxe, Building2, Cpu, Printer, Wrench, ArrowUpCircle } from 'lucide-react';
import {
  AUTO_DRILLS,
  BUSINESSES,
  MINING_POOLS,
  ORE_TIERS,
  PRINTING_PRESSES,
} from '../game/catalog';
import {
  HARD_CAP_MINING_RACKS,
  UI_CLICK_COOLDOWN_MS,
  calculateBusinessTaxRate,
  getMiningStats,
  getOrePriceRub,
  getTotalMiningRacks,
  isPlayerBanned,
} from '../game/engine';
import type { PlayerState } from '../game/types';
import { fmtNum, fmtRub, fmtUsd } from './format';

interface BusinessMineTabProps {
  state: PlayerState;
  now: number;
  onStrikeOre: () => void;
  onUpgradePickaxe: () => void;
  onSellAllOres: () => void;
  onBuyAutoDrill: (drillId: string) => void;
  onDrillAction: (index: number, action: 'collect' | 'service') => void;
  onBuyBusiness: (bizId: string) => void;
  onSellBusiness: () => void;
  onCollectBusiness: () => void;
  onBuyPress: (pressId: string) => void;
  onRunPress: (pressId: string) => void;
  onBuyMiningRack: (poolId: string) => void;
  onExpandRackLimit: () => void;
}

export function BusinessMineTab({
  state,
  now,
  onStrikeOre,
  onUpgradePickaxe,
  onSellAllOres,
  onBuyAutoDrill,
  onDrillAction,
  onBuyBusiness,
  onSellBusiness,
  onCollectBusiness,
  onBuyPress,
  onRunPress,
  onBuyMiningRack,
  onExpandRackLimit,
}: BusinessMineTabProps) {
  const [section, setSection] = useState<'mine' | 'business' | 'production'>('mine');
  const [bizFilter, setBizFilter] = useState<'legal' | 'illegal'>('legal');

  const cooldownLeftMs = Math.max(0, UI_CLICK_COOLDOWN_MS - (now - state.lastClickAt));
  const banned = isPlayerBanned(state, now);
  const pickaxeCost = Math.round(1_200 * Math.pow(2.1, state.pickaxeLevel - 1));

  const totalOreUnits = Object.values(state.ores).reduce((a, b) => a + b, 0);
  const totalOreValue = Object.entries(state.ores).reduce(
    (sum, [oreId, qty]) => sum + qty * getOrePriceRub(oreId, state),
    0,
  );

  const ownedBiz = BUSINESSES.find((b) => b.id === state.ownedBusinessId) ?? null;
  const taxRate = calculateBusinessTaxRate(state);
  const miningStats = getMiningStats(state);
  const totalRacks = getTotalMiningRacks(state);

  return (
    <div className="space-y-6">
      {/* Clean Sub-section Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Бизнес & Шахта</h2>
          <p className="text-xs text-[#8C96A9]">
            10 тиров руды · 4 авто-бура · 1 бизнес (24 варианта) · 7 станков · 8 майнинг-пулов BTC
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-white/10 bg-[#12161E] p-1">
          <button
            type="button"
            onClick={() => setSection('mine')}
            className={`min-h-[38px] rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              section === 'mine' ? 'bg-[#D4A853] text-[#0A0C10]' : 'text-[#8C96A9] hover:text-white'
            }`}
          >
            Шахта и Буры
          </button>
          <button
            type="button"
            onClick={() => setSection('business')}
            className={`min-h-[38px] rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              section === 'business' ? 'bg-[#D4A853] text-[#0A0C10]' : 'text-[#8C96A9] hover:text-white'
            }`}
          >
            Бизнес-Империя
          </button>
          <button
            type="button"
            onClick={() => setSection('production')}
            className={`min-h-[38px] rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              section === 'production' ? 'bg-[#D4A853] text-[#0A0C10]' : 'text-[#8C96A9] hover:text-white'
            }`}
          >
            Станки и BTC
          </button>
        </div>
      </div>

      {/* SECTION 1: MINE, 10 ORES & 4 AUTO-DRILLS */}
      {section === 'mine' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Interactive Mine Clicker */}
          <section className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#12161E] p-5 sm:p-6">
            <div>
              <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
                <div>
                  <p className="text-xs text-[#8C96A9]">
                    Госзаказ руды: {state.politics.stateOreOrderActive ? '+30% к цене' : 'Не активен'}
                  </p>
                  <h3 className="font-display text-xl font-bold text-white">Глубокая шахта</h3>
                </div>
                <span className="font-mono-num text-sm font-semibold text-[#D4A853]">
                  Кирка ур. {state.pickaxeLevel}
                </span>
              </div>

              <div className="my-6 flex flex-col items-center">
                <button
                  type="button"
                  data-testid="mine-strike-btn"
                  disabled={banned}
                  onClick={onStrikeOre}
                  className="flex h-40 w-40 flex-col items-center justify-center rounded-full border-2 border-[#F59E0B] bg-[#181D27] transition-transform active:scale-95 hover:bg-[#1E2432] disabled:opacity-40"
                >
                  <Pickaxe className="mb-2 h-8 w-8 text-[#F59E0B]" aria-hidden="true" />
                  <span className="font-display text-lg font-bold text-white">УДАР КИРКОЙ</span>
                  <span className="font-mono-num text-xs text-[#F59E0B]">-2⚡ · 1–25 шт.</span>
                  {cooldownLeftMs > 0 && (
                    <span className="font-mono-num mt-1 text-[11px] text-[#8C96A9]">
                      {(cooldownLeftMs / 1000).toFixed(1)}с
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2.5 border-t border-white/[0.07] pt-4">
              <button
                type="button"
                onClick={onSellAllOres}
                disabled={totalOreUnits === 0}
                className="flex min-h-[44px] w-full items-center justify-between rounded-lg bg-[#10B981] px-4 py-2.5 text-sm font-bold text-[#0A0C10] transition-colors hover:bg-[#34D399] disabled:opacity-40"
              >
                <span>Продать всю руду ({fmtNum(totalOreUnits)} шт.)</span>
                <span className="font-mono-num">{fmtRub(totalOreValue)}</span>
              </button>

              <button
                type="button"
                onClick={onUpgradePickaxe}
                className="flex min-h-[44px] w-full items-center justify-between rounded-lg border border-white/12 bg-[#181D27] px-4 py-2.5 text-xs font-semibold text-white hover:border-[#D4A853]"
              >
                <span className="flex items-center gap-2">
                  <ArrowUpCircle className="h-4 w-4 text-[#D4A853]" aria-hidden="true" />
                  Улучшить кирку (Ур. {state.pickaxeLevel + 1})
                </span>
                <span className="font-mono-num text-[#F8E4B7]">{fmtRub(pickaxeCost)}</span>
              </button>
            </div>
          </section>

          {/* 10 Ore Tiers Storage & Market */}
          <section className="lg:col-span-7 rounded-xl border border-white/[0.08] bg-[#12161E] p-5 sm:p-6">
            <h3 className="font-display mb-3 text-xl font-bold text-white">Склад руды (10 тиров)</h3>
            <div className="grid grid-cols-1 gap-x-6 divide-y divide-white/[0.06] sm:grid-cols-2 sm:divide-y-0">
              {ORE_TIERS.map((ore) => {
                const qty = state.ores[ore.id] ?? 0;
                const price = getOrePriceRub(ore.id, state);
                return (
                  <div
                    key={ore.id}
                    className="flex items-center justify-between border-b border-white/[0.06] py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        T{ore.tier} · {ore.name}
                      </p>
                      <p className="font-mono-num text-xs text-[#8C96A9]">{fmtRub(price)} / шт.</p>
                    </div>
                    <span className="font-mono-num text-sm font-bold text-white shrink-0">
                      {fmtNum(qty)} шт.
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 4 Auto-Drills */}
          <section className="lg:col-span-12 rounded-xl border border-white/[0.08] bg-[#12161E] p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-xl font-bold text-white">Авто-буры («Крот», «Витязь», «Урал», «Титан»)</h3>
                <p className="text-xs text-[#8C96A9]">
                  Работают без расхода энергии, тратят топливо, изнашивают коронки и останавливаются через 6 часов (требуют техосмотра).
                </p>
              </div>
              <span className="font-mono-num text-xs text-[#8C96A9]">
                Установлено буров: {state.ownedDrills.length}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {AUTO_DRILLS.map((drill) => (
                <div
                  key={drill.id}
                  className="flex flex-col justify-between rounded-lg border border-white/[0.08] bg-[#161B25] p-4"
                >
                  <div>
                    <p className="text-sm font-bold text-white">{drill.name}</p>
                    <p className="mt-1 font-mono-num text-xs text-[#A3ACBE]">
                      {drill.orePerHour} руды/ч · до Тир {drill.maxOreTier}
                    </p>
                    <p className="mt-0.5 text-xs text-[#8C96A9]">
                      Топливо: {fmtRub(drill.fuelCostRub)} · Цикл {drill.maxHours}ч
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onBuyAutoDrill(drill.id)}
                    className="mt-4 min-h-[40px] w-full rounded-lg bg-[#1F2635] px-3 py-2 font-mono-num text-xs font-bold text-white transition-colors hover:bg-[#D4A853] hover:text-[#0A0C10]"
                  >
                    Купить · {fmtRub(drill.costRub)}
                  </button>
                </div>
              ))}
            </div>

            {state.ownedDrills.length > 0 && (
              <div className="mt-5 divide-y divide-white/[0.06] border-t border-white/[0.08] pt-3">
                {state.ownedDrills.map((owned, idx) => {
                  const def = AUTO_DRILLS.find((d) => d.id === owned.drillId)!;
                  return (
                    <div key={`${owned.drillId}-${idx}`} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          #{idx + 1} {def.name} ·{' '}
                          <span className={owned.needsInspection ? 'text-[#E11D48]' : 'text-[#10B981]'}>
                            {owned.needsInspection ? 'Остановлен (нужен ТО 6ч)' : 'Бурение активно'}
                          </span>
                        </p>
                        <p className="font-mono-num text-xs text-[#8C96A9]">
                          Топливо: {owned.fuelPct}% · Износ коронки: {owned.wearPct}%
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => onDrillAction(idx, 'collect')}
                          className="min-h-[38px] rounded-lg bg-[#10B981] px-3.5 py-1.5 text-xs font-bold text-[#0A0C10]"
                        >
                          Собрать руду
                        </button>
                        <button
                          type="button"
                          onClick={() => onDrillAction(idx, 'service')}
                          className="flex min-h-[38px] items-center gap-1.5 rounded-lg border border-white/12 bg-[#181D27] px-3.5 py-1.5 text-xs font-semibold text-white hover:border-[#D4A853]"
                        >
                          <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>ТО и заправка</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* SECTION 2: SINGLE BUSINESS EMPIRE (18 LEGAL + 6 ILLEGAL SYNDICATES) */}
      {section === 'business' && (
        <div className="space-y-6">
          {/* Active Business Slot */}
          <section className="rounded-xl border border-white/[0.08] bg-[#12161E] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-6 w-6 text-[#D4A853]" aria-hidden="true" />
                <div>
                  <p className="text-xs text-[#8C96A9]">Слот бизнеса (строго 1 во владении · продажа 70%)</p>
                  <h3 className="font-display text-2xl font-bold text-white">
                    {ownedBiz ? ownedBiz.name : 'Слот свободен — выберите бизнес ниже'}
                  </h3>
                </div>
              </div>

              {ownedBiz && (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-right mr-2">
                    <p className="text-xs text-[#8C96A9]">
                      Касса ({ownedBiz.type === 'legal' ? `Налог ${taxRate}%` : 'Синдикат в USD'})
                    </p>
                    <p className="font-mono-num text-xl font-bold text-[#10B981]">
                      {ownedBiz.currency === 'USD'
                        ? fmtUsd(state.businessCashbox)
                        : fmtRub(state.businessCashbox)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onCollectBusiness}
                    className="min-h-[44px] rounded-lg bg-[#D4A853] px-5 py-2 text-sm font-bold text-[#0A0C10] hover:bg-[#E1B866] whitespace-nowrap"
                  >
                    Собрать кассу
                  </button>
                  <button
                    type="button"
                    onClick={onSellBusiness}
                    className="min-h-[44px] rounded-lg border border-[#E11D48]/50 bg-[#E11D48]/10 px-4 py-2 text-xs font-semibold text-[#FCA5A5] hover:bg-[#E11D48]/20 whitespace-nowrap"
                  >
                    Продать (70%)
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Catalog of 18 Legal + 6 Illegal */}
          <section className="rounded-xl border border-white/[0.08] bg-[#12161E] p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-display text-xl font-bold text-white">Каталог бизнесов и синдикатов</h3>
              <div className="inline-flex rounded-lg border border-white/10 bg-[#0D1017] p-1">
                <button
                  type="button"
                  onClick={() => setBizFilter('legal')}
                  className={`min-h-[36px] rounded-md px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap ${
                    bizFilter === 'legal' ? 'bg-[#10B981] text-[#0A0C10]' : 'text-[#8C96A9] hover:text-white'
                  }`}
                >
                  Легальные (18 · RUB)
                </button>
                <button
                  type="button"
                  onClick={() => setBizFilter('illegal')}
                  className={`min-h-[36px] rounded-md px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap ${
                    bizFilter === 'illegal' ? 'bg-[#E11D48] text-white' : 'text-[#8C96A9] hover:text-white'
                  }`}
                >
                  Синдикаты (6 · USD)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {BUSINESSES.filter((b) => b.type === bizFilter).map((biz) => {
                const isOwned = state.ownedBusinessId === biz.id;
                return (
                  <div
                    key={biz.id}
                    className={`flex flex-col justify-between rounded-lg border p-4 ${
                      isOwned ? 'border-[#D4A853] bg-[#1A202C]' : 'border-white/[0.08] bg-[#161B25]'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-bold text-white">{biz.name}</p>
                      <p className="mt-1 font-mono-num text-xs text-[#10B981]">
                        Доход: {biz.currency === 'USD' ? fmtUsd(biz.hourlyIncome) : fmtRub(biz.hourlyIncome)} / час
                      </p>
                      <p className="mt-0.5 text-xs text-[#8C96A9]">
                        Карма: {biz.requiredKarma === 'positive' ? '>0' : biz.requiredKarma === 'negative' ? '<0' : 'любая'}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isOwned || state.ownedBusinessId !== null}
                      onClick={() => onBuyBusiness(biz.id)}
                      className="mt-3 min-h-[38px] w-full rounded-lg bg-[#202736] px-3 py-2 font-mono-num text-xs font-bold text-white transition-colors hover:bg-[#D4A853] hover:text-[#0A0C10] disabled:opacity-40"
                    >
                      {isOwned ? 'Ваш бизнес' : `Купить · ${fmtRub(biz.costRub)}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* SECTION 3: 7 PRINTING PRESSES + 8 BITCOIN MINING POOLS */}
      {section === 'production' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* 7 Printing Presses */}
          <section className="lg:col-span-6 rounded-xl border border-white/[0.08] bg-[#12161E] p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Printer className="h-5 w-5 text-[#D4A853]" aria-hidden="true" />
              <div>
                <h3 className="font-display text-xl font-bold text-white">Печатные станки (7 моделей)</h3>
                <p className="text-xs text-[#8C96A9]">Перерабатывают руду из шахты в рубли</p>
              </div>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {PRINTING_PRESSES.map((press) => {
                const count = state.ownedPresses[press.id] ?? 0;
                return (
                  <div key={press.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">
                        {press.name}{' '}
                        {count > 0 && <span className="font-mono-num text-[#D4A853]">×{count}</span>}
                      </p>
                      <p className="font-mono-num text-xs text-[#8C96A9]">
                        Расход: {press.orePerCycle} руды T{press.minOreTier}+ → +{fmtRub(press.rubPerCycle)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {count > 0 && (
                        <button
                          type="button"
                          onClick={() => onRunPress(press.id)}
                          className="min-h-[36px] rounded-md bg-[#10B981] px-3 py-1 text-xs font-bold text-[#0A0C10] whitespace-nowrap"
                        >
                          Печать
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onBuyPress(press.id)}
                        className="min-h-[36px] rounded-md bg-[#1F2635] px-3 py-1 font-mono-num text-xs font-semibold text-white hover:bg-[#D4A853] hover:text-[#0A0C10] whitespace-nowrap"
                      >
                        {fmtRub(press.costRub)}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 8 Bitcoin Mining Pools */}
          <section className="lg:col-span-6 rounded-xl border border-white/[0.08] bg-[#12161E] p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-[#F59E0B]" aria-hidden="true" />
                <div>
                  <h3 className="font-display text-xl font-bold text-white">Майнинг-пулы BTC (8 пулов)</h3>
                  <p className="font-mono-num text-xs text-[#8C96A9]">
                    Стойки: {totalRacks}/{state.maxMiningRacksCap} (Hard Cap {HARD_CAP_MINING_RACKS}) · {miningStats.btcPerHour.toFixed(5)} BTC/ч · {miningStats.powerKw} кВт/ч
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onExpandRackLimit}
                className="min-h-[36px] rounded-md border border-[#D4A853]/40 bg-[#D4A853]/10 px-3 py-1 text-xs font-semibold text-[#F8E4B7] hover:bg-[#D4A853]/20 whitespace-nowrap"
              >
                +5 стоек (25€)
              </button>
            </div>

            <div className="divide-y divide-white/[0.06]">
              {MINING_POOLS.map((pool) => {
                const racks = state.miningRacks[pool.id] ?? 0;
                return (
                  <div key={pool.id} className="flex items-center justify-between gap-2 py-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {pool.name}{' '}
                        {racks > 0 && <span className="font-mono-num text-[#F59E0B]">×{racks}</span>}
                      </p>
                      <p className="font-mono-num text-xs text-[#8C96A9]">
                        +{pool.btcPerHourPerRack} BTC/ч · {pool.powerKwPerRack} кВт/ч
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onBuyMiningRack(pool.id)}
                      className="min-h-[36px] rounded-md bg-[#1F2635] px-3 py-1 font-mono-num text-xs font-semibold text-white hover:bg-[#D4A853] hover:text-[#0A0C10] whitespace-nowrap"
                    >
                      +1 · {fmtRub(pool.costRub)}
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
