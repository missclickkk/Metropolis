import { useCallback, useEffect, useState } from 'react';
import { User, Pickaxe, Landmark, Car, Terminal, X } from 'lucide-react';
import { CREATOR_TELEGRAM_ID } from './game/catalog';
import {
  bankDeposit,
  bankWithdraw,
  buyAutoDrill,
  buyBlackMarketItem,
  buyBusiness,
  buyCar,
  buyCasinoAccess,
  buyEducation,
  buyLicensePlate,
  buyMiningRack,
  buyPress,
  buyProperty,
  buyZeroSpreadLicense,
  collectAndServiceDrill,
  collectBusinessCashbox,
  createClan,
  createInitialState,
  devGrantCurrency,
  devPatchState,
  devVetoPresidentDecree,
  drinkFreeCoffee,
  exchangeCurrency,
  expandMiningRackLimit,
  issueWarning,
  joinFaction,
  performClickProgress,
  playOneButtonCasino,
  raidTurfDistrict,
  repairCar,
  runPressCycle,
  runRace,
  selectProfession,
  sellAllOres,
  sellBusiness,
  spinFortuneWheel,
  strikeMineOre,
  tickPlayerState,
  transferSafe,
  upgradeClanHq,
  upgradeClickPower,
  upgradePickaxe,
  voteForPresident,
} from './game/engine';
import { sfx } from './game/sfx';
import type { ActionResult, Currency, EducationLevel, FactionId, PlayerState, TabId } from './game/types';
import { BusinessMineTab } from './components/BusinessMineTab';
import { CityMarketTab } from './components/CityMarketTab';
import { DevConsoleTab } from './components/DevConsoleTab';
import { ProfileTab } from './components/ProfileTab';
import { RingGarageTab } from './components/RingGarageTab';
import { TitleScreen } from './components/TitleScreen';
import { TopHud } from './components/TopHud';

const STORAGE_KEY = 'metropolis_v3_state';

function loadSavedState(): PlayerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlayerState;
    if (!parsed || !parsed.wallet || typeof parsed.energy !== 'number') return null;
    return tickPlayerState(parsed, Date.now());
  } catch {
    return null;
  }
}

const NAV_TABS: { id: TabId; label: string; shortLabel: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Профиль', shortLabel: 'Профиль', icon: User },
  { id: 'business', label: 'Бизнес & Шахта', shortLabel: 'Бизнес', icon: Pickaxe },
  { id: 'city', label: 'Город & Маркет', shortLabel: 'Город', icon: Landmark },
  { id: 'garage', label: 'Ринг & Гараж', shortLabel: 'Гараж', icon: Car },
  { id: 'dev', label: 'Dev / aiogram', shortLabel: 'Dev', icon: Terminal },
];

export default function App() {
  const [savedInitial] = useState<PlayerState | null>(() => loadSavedState());
  const [screen, setScreen] = useState<'title' | 'playing'>(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('autostart') === '1') {
      return 'playing';
    }
    return 'title';
  });

  const [state, setState] = useState<PlayerState>(() => savedInitial ?? createInitialState());
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [now, setNow] = useState<number>(() => Date.now());
  const [muted, setMuted] = useState(false);
  const [toast, setToast] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  // Mirror state machine to document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = screen;
  }, [screen]);

  // Telegram WebApp SDK integration if opened inside Telegram
  useEffect(() => {
    const tg = (window as unknown as { Telegram?: { WebApp?: { ready: () => void; expand: () => void; initDataUnsafe?: { user?: { id?: number; username?: string; first_name?: string } } } } }).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      const user = tg.initDataUnsafe?.user;
      if (user?.id) {
        const tgId = String(user.id);
        setState((prev) => ({
          ...prev,
          telegramId: tgId,
          username: user.username ? `@${user.username}` : user.first_name ?? prev.username,
          isCreator: prev.isCreator || tgId === CREATOR_TELEGRAM_ID,
        }));
      }
    }
  }, []);

  // Persist to localStorage & lightweight server sync
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage quota ignored
    }
  }, [state]);

  // 1-second simulation ticker (energy regen, passive business/mining, cooldown timers)
  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      setState((prev) => tickPlayerState(prev, current));
    }, 500);
    return () => window.clearInterval(timer);
  }, []);

  const showToast = useCallback((text: string, tone: 'ok' | 'err') => {
    setToast({ text, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const applyResult = useCallback(
    (res: ActionResult, sound: 'click' | 'mine' | 'cash' | 'none' = 'cash'): ActionResult => {
      const prevLevel = state.level;
      setState(res.state);
      if (res.ok) {
        if (res.state.level > prevLevel) sfx.levelUp();
        else if (sound === 'click') sfx.click();
        else if (sound === 'mine') sfx.mine();
        else if (sound === 'cash') sfx.cash();
        showToast(res.message, res.raidTriggered ? 'err' : 'ok');
      } else {
        sfx.warn();
        showToast(res.message, 'err');
      }
      return res;
    },
    [showToast, state.level],
  );

  // Fire background 0.5s Rate-Limit check to Express backend on clicker hits
  const verifyBackendRateLimit = useCallback(
    (telegramId: string) => {
      fetch('/api/action/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId }),
      })
        .then((res) => {
          if (res.status === 429) {
            setState((prev) => issueWarning(prev, 'Backend Rate-Limit 0.5с (автокликер)', Date.now()).state);
          }
        })
        .catch(() => {});
    },
    [],
  );

  const handleStart = useCallback(
    (asCreator: boolean) => {
      if (asCreator) {
        setState((prev) => ({
          ...prev,
          telegramId: CREATOR_TELEGRAM_ID,
          username: 'Создатель Метрополиса',
          isCreator: true,
        }));
      }
      setScreen('playing');
      sfx.click();
    },
    [],
  );

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    sfx.muted = next;
  };

  if (screen === 'title') {
    return <TitleScreen onStart={handleStart} hasSavedProgress={savedInitial !== null} />;
  }

  return (
    <div className="min-h-screen bg-[#0A0C10] text-[#F3F4F6] pb-20 lg:pb-8">
      <TopHud
        state={state}
        now={now}
        muted={muted}
        onToggleMute={handleToggleMute}
        onOpenGuide={() => setGuideOpen(true)}
      />

      {/* Desktop 2-column command layout: Left 5-tab Rail + Main Workspace */}
      <div className="mx-auto flex max-w-[1400px] gap-6 px-4 pt-5 lg:px-6 lg:pt-6">
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav aria-label="Разделы METROPOLIS" className="sticky top-20 space-y-1.5">
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-[46px] w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#D4A853] text-[#0A0C10]'
                      : 'text-[#A3ACBE] hover:bg-[#141923] hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          {toast && (
            <div
              role="status"
              aria-live="polite"
              className={`pointer-events-none fixed right-4 top-14 z-50 max-w-sm rounded-lg border px-4 py-2.5 text-xs font-semibold shadow-xl lg:top-16 ${
                toast.tone === 'ok'
                  ? 'border-[#10B981]/50 bg-[#0D1A15]/95 text-[#A7F3D0]'
                  : 'border-[#E11D48]/50 bg-[#1F0D13]/95 text-[#FECDD3]'
              }`}
            >
              {toast.text}
            </div>
          )}

          {activeTab === 'profile' && (
            <ProfileTab
              state={state}
              now={now}
              onClickWork={(mode) => {
                verifyBackendRateLimit(state.telegramId);
                return applyResult(performClickProgress(state, mode, Date.now()), 'click');
              }}
              onUpgradeClick={() => applyResult(upgradeClickPower(state, Date.now()), 'cash')}
              onDrinkCoffee={() => applyResult(drinkFreeCoffee(state, Date.now()), 'cash')}
              onSelectProfession={(profId) => applyResult(selectProfession(state, profId, Date.now()), 'click')}
              onBuyEducation={(eduId: EducationLevel) => applyResult(buyEducation(state, eduId, Date.now()), 'cash')}
              onQuickSafeRub={(dir) => {
                const amount =
                  dir === 'to_safe' ? Math.floor(state.wallet.RUB * 0.5) : state.safe.RUB;
                applyResult(transferSafe(state, 'RUB', amount, dir, Date.now()), 'cash');
              }}
            />
          )}

          {activeTab === 'business' && (
            <BusinessMineTab
              state={state}
              now={now}
              onStrikeOre={() => {
                verifyBackendRateLimit(state.telegramId);
                applyResult(strikeMineOre(state, Date.now()), 'mine');
              }}
              onUpgradePickaxe={() => applyResult(upgradePickaxe(state, Date.now()), 'cash')}
              onSellAllOres={() => applyResult(sellAllOres(state, Date.now()), 'cash')}
              onBuyAutoDrill={(id) => applyResult(buyAutoDrill(state, id, Date.now()), 'cash')}
              onDrillAction={(idx, act) => applyResult(collectAndServiceDrill(state, idx, act, Date.now()), 'mine')}
              onBuyBusiness={(id) => applyResult(buyBusiness(state, id, Date.now()), 'cash')}
              onSellBusiness={() => applyResult(sellBusiness(state, Date.now()), 'cash')}
              onCollectBusiness={() => applyResult(collectBusinessCashbox(state, Date.now()), 'cash')}
              onBuyPress={(id) => applyResult(buyPress(state, id, Date.now()), 'cash')}
              onRunPress={(id) => applyResult(runPressCycle(state, id, Date.now()), 'cash')}
              onBuyMiningRack={(id) => applyResult(buyMiningRack(state, id, Date.now()), 'cash')}
              onExpandRackLimit={() => applyResult(expandMiningRackLimit(state, Date.now()), 'cash')}
            />
          )}

          {activeTab === 'city' && (
            <CityMarketTab
              state={state}
              now={now}
              onBankDeposit={(amt) => applyResult(bankDeposit(state, amt, Date.now()), 'cash')}
              onBankWithdraw={(amt) => applyResult(bankWithdraw(state, amt, Date.now()), 'cash')}
              onExchange={(from: Currency, to: Currency, amt: number) =>
                applyResult(exchangeCurrency(state, from, to, amt, Date.now()), 'cash')
              }
              onBuyZeroSpread={() => applyResult(buyZeroSpreadLicense(state, Date.now()), 'cash')}
              onBuyProperty={(id) => applyResult(buyProperty(state, id, Date.now()), 'cash')}
              onJoinFaction={(id: Exclude<FactionId, 'none'>) => applyResult(joinFaction(state, id, Date.now()), 'cash')}
              onCreateClan={(name, tag, payWith) => applyResult(createClan(state, name, tag, payWith, Date.now()), 'cash')}
              onUpgradeClanHq={() => applyResult(upgradeClanHq(state, Date.now()), 'cash')}
              onRaidDistrict={(id) => applyResult(raidTurfDistrict(state, id, Date.now()), 'mine')}
              onBuyCasinoAccess={(tier) => applyResult(buyCasinoAccess(state, tier, Date.now()), 'cash')}
              onPlayCasino={(game, bet) => applyResult(playOneButtonCasino(state, game, bet, Date.now()), 'cash')}
              onSpinWheel={() => applyResult(spinFortuneWheel(state, Date.now()), 'cash')}
              onBuyBlackMarket={(id) => applyResult(buyBlackMarketItem(state, id, Date.now()), 'cash')}
              onVotePresident={(id) => applyResult(voteForPresident(state, id, Date.now()), 'click')}
              onBuyPlate={(code) => applyResult(buyLicensePlate(state, code, Date.now()), 'cash')}
            />
          )}

          {activeTab === 'garage' && (
            <RingGarageTab
              state={state}
              onBuyCar={(id) => applyResult(buyCar(state, id, Date.now()), 'cash')}
              onSelectCar={(id) => {
                setState((prev) => ({ ...prev, activeCarId: id }));
                sfx.click();
              }}
              onRepairCar={(id) => applyResult(repairCar(state, id, Date.now()), 'cash')}
              onRunRace={(mode, bet) => applyResult(runRace(state, mode, bet, Date.now()), 'mine')}
            />
          )}

          {activeTab === 'dev' && (
            <DevConsoleTab
              state={state}
              onUnlockCreator={(id) => {
                if (id.trim() === CREATOR_TELEGRAM_ID) {
                  setState((prev) => ({ ...prev, telegramId: CREATOR_TELEGRAM_ID, isCreator: true }));
                  showToast('Dev Mode (Панель Создателя) активирована.', 'ok');
                } else {
                  showToast(`Неверный ID. Для демо используйте ${CREATOR_TELEGRAM_ID}.`, 'err');
                }
              }}
              onGrantCurrency={(cur, delta) => applyResult(devGrantCurrency(state, cur, delta, Date.now()), 'cash')}
              onPatchState={(patch) => applyResult(devPatchState(state, patch, Date.now()), 'click')}
              onVetoDecree={() => applyResult(devVetoPresidentDecree(state, Date.now()), 'click')}
              onResetGame={() => {
                const fresh = createInitialState(state.telegramId, state.username, state.isCreator, Date.now());
                setState(fresh);
                showToast('Прогресс игры сброшен к стартовому состоянию.', 'ok');
              }}
            />
          )}
        </main>
      </div>

      {/* Mobile Fixed 5-Tab Bottom Navigation Bar (h-16, total sticky height 112px <= 15% of 844px) */}
      <nav
        aria-label="Мобильная навигация"
        className="fixed bottom-0 left-0 right-0 z-40 grid h-16 grid-cols-5 border-t border-white/[0.08] bg-[#0D1017]/95 backdrop-blur-md lg:hidden"
      >
        {NAV_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-[44px] flex-col items-center justify-center gap-1 transition-colors ${
                active ? 'text-[#D4A853]' : 'text-[#8C96A9]'
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="text-[10px] font-semibold tracking-tight whitespace-nowrap">
                {tab.shortLabel}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Mechanics Encyclopedia Modal */}
      {guideOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="guide-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
        >
          <div className="max-h-[84vh] w-full max-w-xl overflow-y-auto rounded-xl border border-white/12 bg-[#12161E] p-6">
            <div className="mb-4 flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h2 id="guide-title" className="font-display text-2xl font-bold text-white">
                Энциклопедия METROPOLIS v3.0
              </h2>
              <button
                type="button"
                aria-label="Закрыть справочник"
                onClick={() => setGuideOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-[#A3ACBE] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs leading-relaxed text-[#CBD5E1]">
              <p><strong>Core Loop:</strong> Энергия (100⚡) → Клик-смены и Шахта → Капитал RUB → Бизнес, Станки, Майнинг BTC, Авто, Жилье → Фракции, Кланы, Turf Wars → Престиж X (Апекс).</p>
              <p><strong>Энергия и Кофе:</strong> +1⚡ каждые 2 минуты (ускоряется жильем до +100%). Бесплатный Кофе +25⚡ раз в 24ч доступен от «Студии». Сытость отменена.</p>
              <p><strong>Анти-Бот и Варны:</strong> Пауза клика в UI 1.5с, серверный Rate-Limit 0.5с. При 3/3 варнах аккаунт получает статус BANNED на 24ч, после чего счетчик сбрасывается до 0/3.</p>
              <p><strong>Карма (-∞…+∞):</strong> Положительная снижает налог бизнеса (13% → 6%) и открывает ВУЗы и госслужбу. Отрицательная открывает Синдикат и Черный рынок, но несет 20–90% риск рейда Прокурора при кассе &gt;500k RUB (защищайте капитал в Сейфе 0%).</p>
              <p><strong>Telegram Bot (aiogram 3.x):</strong> Полный исходный код бота находится в Табе 5 «Dev / aiogram» и в папке <code className="font-mono text-[#D4A853]">/bot/</code>.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
