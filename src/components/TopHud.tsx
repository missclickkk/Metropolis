import { Volume2, VolumeX, BookOpen, Zap } from 'lucide-react';
import { PRESTIGE_TIERS } from '../game/catalog';
import { getEnergyRegenIntervalSec } from '../game/engine';
import type { PlayerState } from '../game/types';
import { fmtBtc, fmtCountdown, fmtEur, fmtRub, fmtUsd } from './format';

interface TopHudProps {
  state: PlayerState;
  now: number;
  muted: boolean;
  onToggleMute: () => void;
  onOpenGuide: () => void;
}

export function TopHud({ state, now, muted, onToggleMute, onOpenGuide }: TopHudProps) {
  const prestige = PRESTIGE_TIERS[Math.min(PRESTIGE_TIERS.length - 1, Math.max(0, state.prestigeTier - 1))];
  const intervalMs = getEnergyRegenIntervalSec(state) * 1000;
  const elapsed = Math.max(0, now - state.lastEnergyTickAt);
  const nextTickMs = state.energy < state.maxEnergy ? Math.max(0, intervalMs - (elapsed % intervalMs)) : 0;

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0D1017]/95 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-[1400px] items-center justify-between gap-2 px-3 sm:gap-4 sm:px-4 lg:h-14 lg:px-6">
        {/* Zone 1: Single-line Brand Wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="font-display text-base font-bold tracking-wider text-white whitespace-nowrap sm:text-lg lg:text-xl">
            METROPOLIS
          </span>
          <span className="hidden text-xs text-[#8C96A9] sm:inline whitespace-nowrap">
            Престиж {prestige.numeral} · Ур. {state.level}
          </span>
        </div>

        {/* Zone 2: Live 4-Currency Ledger & Energy */}
        <div className="flex items-center gap-2.5 text-xs sm:gap-4 lg:text-sm">
          <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
            <span className="hidden text-[#8C96A9] sm:inline">RUB</span>
            <span className="font-mono-num font-semibold text-white">{fmtRub(state.wallet.RUB)}</span>
          </div>
          <div className="hidden items-center gap-1.5 whitespace-nowrap shrink-0 md:flex">
            <span className="text-[#8C96A9]">USD</span>
            <span className="font-mono-num font-semibold text-[#10B981]">{fmtUsd(state.wallet.USD)}</span>
          </div>
          <div className="hidden items-center gap-1.5 whitespace-nowrap shrink-0 xl:flex">
            <span className="text-[#8C96A9]">BTC</span>
            <span className="font-mono-num font-semibold text-[#F59E0B]">{fmtBtc(state.wallet.BTC)}</span>
          </div>
          <div className="hidden items-center gap-1.5 whitespace-nowrap shrink-0 lg:flex">
            <span className="text-[#8C96A9]">EUR</span>
            <span className="font-mono-num font-semibold text-[#D4A853]">{fmtEur(state.wallet.EUR)}</span>
          </div>

          <div
            className="flex items-center gap-1 border-l border-white/10 pl-2.5 whitespace-nowrap shrink-0 sm:gap-1.5 sm:pl-3"
            title={`Регенерация +1⚡ каждые ${getEnergyRegenIntervalSec(state)} сек`}
          >
            <Zap className="h-3.5 w-3.5 text-[#F59E0B] shrink-0" aria-hidden="true" />
            <span className="font-mono-num font-semibold text-white">
              {state.energy}/{state.maxEnergy}
            </span>
            {state.energy < state.maxEnergy && (
              <span className="hidden font-mono-num text-[11px] text-[#8C96A9] sm:inline">
                +{fmtCountdown(nextTickMs)}
              </span>
            )}
          </div>
        </div>

        {/* Zone 3: Utility Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenGuide}
            aria-label="Справочник механик"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#141923] text-[#A3ACBE] transition-colors hover:border-[#D4A853]/50 hover:text-white sm:h-9 sm:w-9"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Включить звук' : 'Выключить звук'}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#141923] text-[#A3ACBE] transition-colors hover:border-[#D4A853]/50 hover:text-white sm:h-9 sm:w-9"
          >
            {muted ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  );
}
