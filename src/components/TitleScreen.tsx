import { useEffect, useState } from 'react';
import { Shield, Terminal } from 'lucide-react';

interface TitleScreenProps {
  onStart: (asCreator: boolean) => void;
  hasSavedProgress: boolean;
}

export function TitleScreen({ onStart, hasSavedProgress }: TitleScreenProps) {
  const [role, setRole] = useState<'player' | 'creator'>('player');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        onStart(role === 'creator');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onStart, role]);

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#0A0C10] text-[#F3F4F6] flex flex-col justify-between">
      {/* Bespoke architectural night skyline backdrop with calm negative space on the left/top */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMax slice"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-80"
      >
        <defs>
          <radialGradient id="metroGlow" cx="76%" cy="32%" r="55%">
            <stop offset="0%" stopColor="#D4A853" stopOpacity="0.16" />
            <stop offset="48%" stopColor="#1B2333" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0A0C10" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="towerFace" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1E2534" />
            <stop offset="100%" stopColor="#0D1118" />
          </linearGradient>
          <linearGradient id="goldEdge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4A853" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#D4A853" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        <rect width="1440" height="900" fill="url(#metroGlow)" />

        {/* Architectural horizon grid */}
        <line x1="0" y1="740" x2="1440" y2="740" stroke="#D4A853" strokeOpacity="0.14" strokeWidth="1" />
        <line x1="0" y1="815" x2="1440" y2="815" stroke="#FFFFFF" strokeOpacity="0.05" strokeWidth="1" />

        {/* Right-side monumental skyline silhouette */}
        <g transform="translate(760, 120)">
          <rect x="60" y="320" width="90" height="460" fill="url(#towerFace)" stroke="#FFFFFF" strokeOpacity="0.06" />
          <rect x="165" y="180" width="115" height="600" fill="url(#towerFace)" stroke="#FFFFFF" strokeOpacity="0.08" />
          <polygon points="222,70 280,180 165,180" fill="#171D2A" stroke="#D4A853" strokeOpacity="0.32" />
          <line x1="222" y1="15" x2="222" y2="70" stroke="url(#goldEdge)" strokeWidth="2" />

          {/* Lit executive windows */}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
            <g key={row} opacity={0.45}>
              <rect x="184" y={210 + row * 46} width="28" height="4" fill="#D4A853" />
              <rect x="228" y={210 + row * 46} width="32" height="4" fill="#94A3B8" />
            </g>
          ))}

          <rect x="300" y="250" width="130" height="530" fill="url(#towerFace)" stroke="#FFFFFF" strokeOpacity="0.07" />
          <rect x="445" y="130" width="96" height="650" fill="url(#towerFace)" stroke="#D4A853" strokeOpacity="0.2" />
          <rect x="556" y="290" width="110" height="490" fill="url(#towerFace)" stroke="#FFFFFF" strokeOpacity="0.06" />
          <rect x="-40" y="420" width="88" height="360" fill="#10141D" stroke="#FFFFFF" strokeOpacity="0.05" />

          {/* Gold architectural vertical accents */}
          <line x1="445" y1="130" x2="445" y2="780" stroke="url(#goldEdge)" strokeWidth="1.5" />
          <line x1="300" y1="250" x2="300" y2="780" stroke="url(#goldEdge)" strokeWidth="1" />
        </g>
      </svg>

      {/* Main Content anchored in calm left negative space */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1280px] flex-1 flex-col justify-center px-6 py-12 lg:px-14">
        <div className="max-w-xl">
          {/* Custom inline SVG METROPOLIS crest emblem */}
          <div className="mb-8 flex items-center gap-4">
            <svg
              width="56"
              height="56"
              viewBox="0 0 56 56"
              fill="none"
              aria-hidden="true"
              className="shrink-0"
            >
              <polygon
                points="28,3 52,16 52,40 28,53 4,40 4,16"
                fill="#12161E"
                stroke="#D4A853"
                strokeWidth="2"
              />
              <path
                d="M16 39V19L28 29L40 19V39"
                stroke="#D4A853"
                strokeWidth="2.6"
                strokeLinecap="square"
                strokeLinejoin="miter"
              />
              <line x1="28" y1="11" x2="28" y2="21" stroke="#F8E4B7" strokeWidth="1.8" />
            </svg>
            <div>
              <p className="text-xs font-medium tracking-[0.22em] text-[#D4A853] uppercase">
                Telegram Mini App · aiogram 3.x
              </p>
              <h1 className="font-display text-5xl font-bold tracking-tight text-white sm:text-6xl text-balance">
                METROPOLIS
              </h1>
            </div>
          </div>

          <p className="mb-8 text-base leading-relaxed text-[#A3ACBE] sm:text-lg">
            От первой клик-смены листовщика до собственной бизнес-империи, шахты, майнинг-ферм и контроля над районами города.
          </p>

          {/* Clean unboxed mechanic overview */}
          <div className="mb-9 grid grid-cols-2 gap-x-8 gap-y-4 border-y border-white/10 py-5 sm:grid-cols-4">
            <div>
              <p className="font-mono-num text-xl font-bold text-white">100⚡</p>
              <p className="text-xs text-[#8C96A9]">Энергия +1 / 2 мин</p>
            </div>
            <div>
              <p className="font-mono-num text-xl font-bold text-white">23</p>
              <p className="text-xs text-[#8C96A9]">Профессии и клики</p>
            </div>
            <div>
              <p className="font-mono-num text-xl font-bold text-white">24</p>
              <p className="text-xs text-[#8C96A9]">Бизнеса и синдиката</p>
            </div>
            <div>
              <p className="font-mono-num text-xl font-bold text-white">I – X</p>
              <p className="text-xs text-[#8C96A9]">Престиж Апекс</p>
            </div>
          </div>

          {/* Role selector (Player vs Creator Dev preview) */}
          <div className="mb-6">
            <p className="mb-2.5 text-xs font-medium text-[#8C96A9]">Профиль входа Telegram</p>
            <div className="inline-flex rounded-lg border border-white/10 bg-[#12161E] p-1">
              <button
                type="button"
                onClick={() => setRole('player')}
                className={`flex min-h-[44px] items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  role === 'player'
                    ? 'bg-[#D4A853] text-[#0A0C10]'
                    : 'text-[#A3ACBE] hover:text-white'
                }`}
              >
                <Shield className="h-4 w-4" aria-hidden="true" />
                <span>Игрок</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('creator')}
                className={`flex min-h-[44px] items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  role === 'creator'
                    ? 'bg-[#D4A853] text-[#0A0C10]'
                    : 'text-[#A3ACBE] hover:text-white'
                }`}
              >
                <Terminal className="h-4 w-4" aria-hidden="true" />
                <span>Создатель (Dev + aiogram)</span>
              </button>
            </div>
          </div>

          {/* Primary Start CTA */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              data-start="true"
              onClick={() => onStart(role === 'creator')}
              className="min-h-[48px] rounded-lg bg-[#D4A853] px-8 py-3 text-base font-bold text-[#0A0C10] transition-transform hover:bg-[#E1B866] active:scale-[0.98] whitespace-nowrap shrink-0"
            >
              {hasSavedProgress ? 'Продолжить игру' : 'Начать игру'}
            </button>
          </div>
        </div>
      </div>

      {/* Flat borderless control hint in bottom safe margin */}
      <div className="relative z-10 mx-auto w-full max-w-[1280px] px-6 pb-6 lg:px-14">
        <p className="text-xs text-[#6B7487]">
          Enter / Space — старт · Защита от ботов 1.5с UI / 0.5с API · Варны 3/3 → Бан 24ч · В комплекте исходники Python aiogram 3.x
        </p>
      </div>
    </main>
  );
}
