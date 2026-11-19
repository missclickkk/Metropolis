import { useState } from 'react';
import { Coffee, ShieldAlert, Lock, ArrowUpCircle, GraduationCap, Briefcase, Zap } from 'lucide-react';
import { EDUCATION_CATALOG, PRESTIGE_TIERS, PROFESSIONS } from '../game/catalog';
import {
  COFFEE_COOLDOWN_MS,
  UI_CLICK_COOLDOWN_MS,
  calculateBusinessTaxRate,
  calculateNetWorthRub,
  calculateProsecutorRaidRisk,
  canUseProfession,
  getEnergyRegenIntervalSec,
  getPropertyDef,
  isPlayerBanned,
  xpForNextLevel,
} from '../game/engine';
import type { EducationLevel, PlayerState } from '../game/types';
import { fmtBtc, fmtCountdown, fmtEur, fmtNum, fmtRub, fmtUsd } from './format';

interface FloatingPopup {
  id: number;
  text: string;
  x: number;
  y: number;
}

interface ProfileTabProps {
  state: PlayerState;
  now: number;
  onClickWork: (mode: 'shift' | 'quick_tap') => { ok: boolean; rewardText?: string };
  onUpgradeClick: () => void;
  onDrinkCoffee: () => void;
  onSelectProfession: (profId: string) => void;
  onBuyEducation: (eduId: EducationLevel) => void;
  onQuickSafeRub: (direction: 'to_safe' | 'from_safe') => void;
}

export function ProfileTab({
  state,
  now,
  onClickWork,
  onUpgradeClick,
  onDrinkCoffee,
  onSelectProfession,
  onBuyEducation,
  onQuickSafeRub,
}: ProfileTabProps) {
  const [profFilter, setProfFilter] = useState<'legal' | 'illegal'>('legal');
  const [popups, setPopups] = useState<FloatingPopup[]>([]);

  const currentProf = PROFESSIONS.find((p) => p.id === state.currentProfessionId) ?? PROFESSIONS[0];
  const prestige = PRESTIGE_TIERS[Math.min(PRESTIGE_TIERS.length - 1, Math.max(0, state.prestigeTier - 1))];
  const nextPrestige = PRESTIGE_TIERS[state.prestigeTier] ?? null;
  const netWorth = calculateNetWorthRub(state);
  const prop = getPropertyDef(state.ownedPropertyId);
  const xpNeeded = xpForNextLevel(state.level);
  const xpPct = Math.min(100, Math.round((state.xp / xpNeeded) * 100));

  const cooldownLeftMs = Math.max(0, UI_CLICK_COOLDOWN_MS - (now - state.lastClickAt));
  const cooldownPct = Math.min(100, Math.round((cooldownLeftMs / UI_CLICK_COOLDOWN_MS) * 100));
  const banned = isPlayerBanned(state, now);

  const coffeeRemainingMs =
    state.lastCoffeeAt > 0 ? Math.max(0, COFFEE_COOLDOWN_MS - (now - state.lastCoffeeAt)) : 0;
  const coffeeReady = prop.unlocksCoffee && coffeeRemainingMs === 0;

  const clickUpgradeCost = Math.round(800 * Math.pow(1.9, state.clickPowerLevel - 1));
  const clickBonusMult = 1 + (state.clickPowerLevel - 1) * 0.15 + (state.level - 1) * 0.05;
  const shiftPreviewPay = Math.round(currentProf.payRub * clickBonusMult);
  const quickPreviewPay = Math.max(15, Math.round(currentProf.payRub * 0.28 * clickBonusMult));

  const taxRate = calculateBusinessTaxRate(state);
  const raidRisk = calculateProsecutorRaidRisk(state, state.wallet.RUB);

  const handleTap = (mode: 'shift' | 'quick_tap', e: React.MouseEvent<HTMLButtonElement>) => {
    const res = onClickWork(mode);
    if (res.ok && res.rewardText) {
      const rect = e.currentTarget.getBoundingClientRect();
      const id = Date.now() + Math.random();
      const x = e.clientX ? e.clientX - rect.left : rect.width / 2;
      const y = e.clientY ? e.clientY - rect.top : rect.height / 2;
      setPopups((prev) => [...prev.slice(-6), { id, text: res.rewardText!, x, y }]);
      setTimeout(() => {
        setPopups((prev) => prev.filter((p) => p.id !== id));
      }, 740);
    }
  };

  const filteredProfs = PROFESSIONS.filter((p) => p.type === profFilter);

  return (
    <div className="space-y-6">
      {/* Top 2-column grid: Clicker Character Core (Primary Focus) + Character Dossier & Physiology */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
        {/* Dominant Focal Anchor: Clicker Progression Core */}
        <section className="lg:col-span-7 flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#12161E] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] pb-4">
            <div className="min-w-0">
              <p className="text-xs text-[#8C96A9]">
                {currentProf.type === 'legal' ? 'Легальная карьера' : 'Нелегальный сектор'} · Стаж {state.experienceShifts} смен
              </p>
              <h2 className="font-display mt-1 truncate text-2xl font-bold tracking-tight text-white">
                {currentProf.name}
              </h2>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-[#8C96A9]">Сила клика</p>
              <p className="font-mono-num text-base font-bold text-[#D4A853] sm:text-lg whitespace-nowrap">
                ×{clickBonusMult.toFixed(2)} (Ур. {state.clickPowerLevel})
              </p>
            </div>
          </div>

          {/* Interactive Clicker Pad */}
          <div className="my-6 flex flex-col items-center justify-center gap-5 sm:flex-row sm:justify-around">
            <div className="relative flex flex-col items-center">
              <button
                type="button"
                data-testid="clicker-shift-btn"
                disabled={banned}
                onClick={(e) => handleTap('shift', e)}
                className="group relative flex h-44 w-44 flex-col items-center justify-center rounded-full border-2 border-[#D4A853] bg-[#181E2B] text-center shadow-[0_0_40px_rgba(212,168,83,0.12)] transition-transform active:scale-95 disabled:opacity-40 sm:h-48 sm:w-48"
              >
                {/* Radial cooldown progress ring */}
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
                  viewBox="0 0 180 180"
                  aria-hidden="true"
                >
                  <circle
                    cx="90"
                    cy="90"
                    r="84"
                    fill="none"
                    stroke="rgba(212,168,83,0.14)"
                    strokeWidth="4"
                  />
                  {cooldownLeftMs > 0 && (
                    <circle
                      cx="90"
                      cy="90"
                      r="84"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="4"
                      strokeDasharray={2 * Math.PI * 84}
                      strokeDashoffset={2 * Math.PI * 84 * (1 - cooldownPct / 100)}
                    />
                  )}
                </svg>

                <Briefcase className="mb-1.5 h-7 w-7 text-[#D4A853] transition-transform group-hover:scale-110" aria-hidden="true" />
                <span className="font-display text-lg font-bold tracking-wide text-white">
                  СМЕНА
                </span>
                <span className="font-mono-num mt-1 text-sm font-semibold text-[#10B981]">
                  +{fmtRub(shiftPreviewPay)}
                </span>
                <span className="font-mono-num mt-0.5 text-xs text-[#F59E0B]">
                  -{currentProf.energyCost}⚡ · +{currentProf.xpGain} XP
                </span>
                {cooldownLeftMs > 0 && (
                  <span className="font-mono-num mt-1 text-[11px] text-[#A3ACBE]">
                    Пауза {(cooldownLeftMs / 1000).toFixed(1)}с
                  </span>
                )}

                {popups.map((p) => (
                  <span
                    key={p.id}
                    style={{ left: p.x, top: p.y }}
                    className="animate-float-up pointer-events-none absolute -translate-x-1/2 font-mono-num text-sm font-bold text-[#F8E4B7]"
                  >
                    {p.text}
                  </span>
                ))}
              </button>
              <p className="mt-2.5 text-xs text-[#8C96A9]">
                Защита от ботов: 1.5с UI · 0.5с Rate-Limit
              </p>
            </div>

            {/* Secondary Quick Tap + Click Power Upgrade */}
            <div className="flex w-full max-w-xs flex-col gap-3">
              <button
                type="button"
                data-testid="clicker-quick-btn"
                disabled={banned}
                onClick={(e) => handleTap('quick_tap', e)}
                className="flex min-h-[54px] w-full items-center justify-between rounded-lg border border-white/10 bg-[#181D27] px-4 py-3 text-left transition-colors hover:border-[#D4A853]/60 active:scale-[0.98] disabled:opacity-40"
              >
                <div>
                  <p className="text-sm font-semibold text-white">Быстрый клик-заказ</p>
                  <p className="text-xs text-[#8C96A9]">-4⚡ · быстрая прокачка XP</p>
                </div>
                <span className="font-mono-num text-sm font-bold text-[#10B981] whitespace-nowrap">
                  +{fmtRub(quickPreviewPay)}
                </span>
              </button>

              <button
                type="button"
                onClick={onUpgradeClick}
                className="flex min-h-[54px] w-full items-center justify-between rounded-lg border border-[#D4A853]/35 bg-[#D4A853]/10 px-4 py-3 text-left transition-colors hover:bg-[#D4A853]/20 active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5">
                  <ArrowUpCircle className="h-5 w-5 text-[#D4A853] shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-white">Усилить клик (Ур. {state.clickPowerLevel + 1})</p>
                    <p className="text-xs text-[#A3ACBE]">+15% к выплате за каждый клик</p>
                  </div>
                </div>
                <span className="font-mono-num text-xs font-bold text-[#F8E4B7] whitespace-nowrap">
                  {fmtRub(clickUpgradeCost)}
                </span>
              </button>

              {/* Level & XP Bar */}
              <div className="pt-2">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-white">Уровень персонажа {state.level}</span>
                  <span className="font-mono-num text-[#8C96A9]">
                    {fmtNum(state.xp)} / {fmtNum(xpNeeded)} XP
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[#D4A853] transition-transform duration-200 origin-left"
                    style={{ width: `${xpPct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-[#8C96A9]">
                  Всего кликов: <span className="font-mono-num text-white">{fmtNum(state.totalClicks)}</span> · Бонус уровня +{((state.level - 1) * 5)}%
                </p>
              </div>
            </div>
          </div>

          {/* Energy & Free Coffee Footer Strip */}
          <div className="flex flex-col gap-3 border-t border-white/[0.07] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Zap className="h-5 w-5 text-[#F59E0B] shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white font-mono-num">
                  Энергия {state.energy} / {state.maxEnergy}⚡
                </p>
                <p className="truncate text-xs text-[#8C96A9]">
                  +1⚡ / {getEnergyRegenIntervalSec(state)}с ({prop.name}) · Сытость отменена
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onDrinkCoffee}
              disabled={!coffeeReady}
              className="flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-white/12 bg-[#181D27] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:border-[#D4A853] disabled:opacity-45 whitespace-nowrap shrink-0"
            >
              <Coffee className="h-4 w-4 text-[#D4A853]" aria-hidden="true" />
              <span>
                {!prop.unlocksCoffee
                  ? 'Кофе +25⚡ (от Студии)'
                  : coffeeRemainingMs > 0
                    ? `Кофе через ${fmtCountdown(coffeeRemainingMs)}`
                    : 'Бесплатный Кофе (+25⚡)'}
              </span>
            </button>
          </div>
        </section>

        {/* Character Dossier: Prestige, Karma, Warnings [X/3], Safe */}
        <section className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#12161E] p-5 sm:p-6">
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
              <div>
                <p className="text-xs text-[#8C96A9]">Telegram ID: {state.telegramId}</p>
                <h2 className="font-display text-2xl font-bold text-white">{state.username}</h2>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#8C96A9]">Престиж</p>
                <p className="font-display text-2xl font-bold text-[#D4A853]">
                  {prestige.numeral} · {prestige.title}
                </p>
              </div>
            </div>

            {/* Key Profile Metrics */}
            <dl className="divide-y divide-white/[0.06] text-sm">
              <div className="flex items-center justify-between py-3">
                <dt className="text-[#8C96A9]">Капитал (Net Worth)</dt>
                <dd className="font-mono-num font-semibold text-white">
                  {fmtRub(netWorth)}
                  {nextPrestige && (
                    <span className="ml-2 text-xs text-[#8C96A9]">
                      / {fmtRub(nextPrestige.minNetWorth)}
                    </span>
                  )}
                </dd>
              </div>

              <div className="flex items-center justify-between py-3">
                <dt className="text-[#8C96A9]">Карма (-∞ … +∞)</dt>
                <dd
                  className={`font-mono-num font-semibold ${
                    state.karma > 0 ? 'text-[#10B981]' : state.karma < 0 ? 'text-[#E11D48]' : 'text-white'
                  }`}
                >
                  {state.karma > 0 ? `+${state.karma}` : state.karma} ·{' '}
                  <span className="text-xs font-normal text-[#A3ACBE]">
                    {state.karma >= 0 ? `Налог бизнеса ${taxRate}%` : `Риск Прокурора ${raidRisk}%`}
                  </span>
                </dd>
              </div>

              <div className="flex items-center justify-between py-3">
                <dt className="flex items-center gap-1.5 text-[#8C96A9]">
                  <ShieldAlert className="h-4 w-4 text-[#E11D48]" aria-hidden="true" />
                  <span>Варны (3/3 → Бан 24ч)</span>
                </dt>
                <dd
                  className={`font-mono-num font-semibold ${
                    state.warnings >= 2 ? 'text-[#E11D48]' : 'text-white'
                  }`}
                >
                  Варны: [{state.warnings}/3]{banned ? ' · BANNED' : ''}
                </dd>
              </div>

              <div className="flex items-center justify-between py-3">
                <dt className="text-[#8C96A9]">Жилье</dt>
                <dd className="font-medium text-white">
                  {prop.name} <span className="text-xs text-[#10B981]">(+{prop.regenBonusPct}% сна)</span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Multi-currency Safe (0% tax / Raid protection) */}
          <div className="mt-4 border-t border-white/[0.07] pt-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-[#D4A853]" aria-hidden="true" />
                <span className="text-sm font-semibold text-white">Мультивалютный Сейф (0%)</span>
              </div>
              <span className="text-xs text-[#8C96A9]">Защита от рейда Прокурора</span>
            </div>
            <div className="mb-3 grid grid-cols-2 gap-2 text-xs font-mono-num text-[#CBD5E1]">
              <div>RUB: <span className="text-white">{fmtRub(state.safe.RUB)}</span></div>
              <div>USD: <span className="text-[#10B981]">{fmtUsd(state.safe.USD)}</span></div>
              <div>BTC: <span className="text-[#F59E0B]">{fmtBtc(state.safe.BTC)}</span></div>
              <div>EUR: <span className="text-[#D4A853]">{fmtEur(state.safe.EUR)}</span></div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onQuickSafeRub('to_safe')}
                className="min-h-[40px] flex-1 rounded-lg border border-white/10 bg-[#181D27] px-3 py-2 text-xs font-medium text-white hover:border-[#D4A853]/60 whitespace-nowrap"
              >
                Убрать 50% RUB в Сейф
              </button>
              <button
                type="button"
                onClick={() => onQuickSafeRub('from_safe')}
                className="min-h-[40px] flex-1 rounded-lg border border-white/10 bg-[#181D27] px-3 py-2 text-xs font-medium text-white hover:border-[#D4A853]/60 whitespace-nowrap"
              >
                Забрать RUB из Сейфа
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Education & Labor Market (16 Legal + 7 Illegal Professions) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Professions List */}
        <section className="lg:col-span-8 rounded-xl border border-white/[0.08] bg-[#12161E] p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-bold text-white">Рынок труда и профессии</h3>
              <p className="text-xs text-[#8C96A9]">
                16 легальных (50 ₽ → 100 тыс. ₽) и 7 нелегальных (100 тыс. ₽ → 2.5 млн ₽) · 20⚡ за смену
              </p>
            </div>
            <div className="inline-flex rounded-lg border border-white/10 bg-[#0D1017] p-1">
              <button
                type="button"
                onClick={() => setProfFilter('legal')}
                className={`min-h-[36px] rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  profFilter === 'legal' ? 'bg-[#10B981] text-[#0A0C10]' : 'text-[#8C96A9] hover:text-white'
                }`}
              >
                Легальные (16)
              </button>
              <button
                type="button"
                onClick={() => setProfFilter('illegal')}
                className={`min-h-[36px] rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  profFilter === 'illegal' ? 'bg-[#E11D48] text-white' : 'text-[#8C96A9] hover:text-white'
                }`}
              >
                Нелегальные (7)
              </button>
            </div>
          </div>

          <div className="max-h-[420px] divide-y divide-white/[0.06] overflow-y-auto pr-1">
            {filteredProfs.map((prof) => {
              const check = canUseProfession(state, prof.id);
              const isCurrent = state.currentProfessionId === prof.id;
              return (
                <div
                  key={prof.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">
                      {prof.name}{' '}
                      <span className="font-mono-num text-[#10B981]">· {fmtRub(prof.payRub)}/смена</span>
                    </p>
                    <p className="text-xs text-[#8C96A9]">
                      Стаж ≥ {prof.minExperience} · Карма{' '}
                      {prof.minKarma !== null
                        ? `≥ ${prof.minKarma}`
                        : prof.maxKarma !== null
                          ? `≤ ${prof.maxKarma}`
                          : 'любая'}{' '}
                      · +{prof.xpGain} XP
                      {!check.allowed && check.reason ? ` · ${check.reason}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isCurrent || !check.allowed}
                    onClick={() => onSelectProfession(prof.id)}
                    className={`min-h-[38px] rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      isCurrent
                        ? 'bg-[#D4A853]/20 text-[#D4A853]'
                        : check.allowed
                          ? 'bg-[#1C2230] text-white hover:bg-[#D4A853] hover:text-[#0A0C10]'
                          : 'bg-white/[0.04] text-[#5F687B] cursor-not-allowed'
                    }`}
                  >
                    {isCurrent ? 'Текущая' : check.allowed ? 'Выбрать' : 'Закрыто'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Official Universities & Recent Activity Feed */}
        <section className="lg:col-span-4 flex flex-col justify-between gap-6">
          <div className="rounded-xl border border-white/[0.08] bg-[#12161E] p-5">
            <div className="mb-3 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-[#D4A853]" aria-hidden="true" />
              <h3 className="font-display text-lg font-bold text-white">Официальные ВУЗы</h3>
            </div>
            <p className="mb-3 text-xs text-[#8C96A9]">
              Открываются при положительной карме (&gt;0) для роста до Министра.
            </p>
            <div className="divide-y divide-white/[0.06]">
              {EDUCATION_CATALOG.filter((e) => e.id !== 'none').map((edu) => {
                const order: EducationLevel[] = ['none', 'college', 'bachelor', 'mba', 'academy'];
                const owned = order.indexOf(state.education) >= order.indexOf(edu.id);
                return (
                  <div key={edu.id} className="flex items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white">{edu.name}</p>
                      <p className="font-mono-num text-[11px] text-[#8C96A9]">
                        {fmtRub(edu.costRub)} · Карма ≥ {edu.minKarma}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={owned}
                      onClick={() => onBuyEducation(edu.id)}
                      className={`min-h-[34px] rounded-md px-3 py-1 text-xs font-semibold whitespace-nowrap shrink-0 ${
                        owned
                          ? 'text-[#10B981]'
                          : 'bg-[#1C2230] text-white hover:bg-[#D4A853] hover:text-[#0A0C10]'
                      }`}
                    >
                      {owned ? 'Диплом' : 'Поступить'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#12161E] p-5">
            <h3 className="font-display mb-3 text-lg font-bold text-white">Хроника событий</h3>
            <ul className="max-h-44 space-y-2 overflow-y-auto text-xs text-[#A3ACBE]">
              {state.logs.slice(0, 8).map((entry) => (
                <li key={entry.id} className="border-b border-white/[0.05] pb-2 last:border-0">
                  {entry.text}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
