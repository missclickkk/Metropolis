import type { PlayerState } from '../game/types';

// Official Yandex Games SDK v2 TypeScript typings (subset used by METROPOLIS)
export interface YandexPlayer {
  getName(): string;
  getUniqueID(): string;
  getMode(): 'lite' | '';
  setData(data: Record<string, unknown>, flush?: boolean): Promise<void>;
  getData(keys?: string[]): Promise<Record<string, unknown>>;
}

export interface YandexLeaderboardEntry {
  rank: number;
  score: number;
  player: {
    publicName: string;
    uniqueID: string;
  };
}

export interface YandexSDK {
  environment: {
    i18n: {
      lang: string;
      tld: string;
    };
    app: {
      id: string;
    };
  };
  features?: {
    LoadingAPI?: {
      ready(): void;
    };
    GameplayAPI?: {
      start(): void;
      stop(): void;
    };
  };
  adv: {
    showFullscreenAdv(opts?: {
      callbacks?: {
        onOpen?: () => void;
        onClose?: (wasShown: boolean) => void;
        onError?: (error: unknown) => void;
      };
    }): void;
    showRewardedVideo(opts?: {
      callbacks?: {
        onOpen?: () => void;
        onRewarded?: () => void;
        onClose?: () => void;
        onError?: (error: unknown) => void;
      };
    }): void;
  };
  getPlayer(opts?: { scopes?: boolean }): Promise<YandexPlayer>;
  getLeaderboards(): Promise<{
    setLeaderboardScore(name: string, score: number): Promise<void>;
    getLeaderboardEntries(
      name: string,
      opts?: { quantityTop?: number; includeUser?: boolean; quantityAround?: number },
    ): Promise<{ entries: YandexLeaderboardEntry[] }>;
  }>;
  on?(eventName: 'game_api_pause' | 'game_api_resume', cb: () => void): void;
}

declare global {
  interface Window {
    YaGames?: {
      init(): Promise<YandexSDK>;
    };
  }
}

export interface YandexBridgeStatus {
  mode: 'yandex_live' | 'local_sandbox';
  sdkReady: boolean;
  loadingApiCalled: boolean;
  gameplayActive: boolean;
  cloudSyncedAt: number | null;
  lang: string;
  playerName: string;
  playerId: string;
  isAuthorized: boolean;
}

export interface LeaderboardRow {
  rank: number;
  name: string;
  netWorthRub: number;
  isCurrentPlayer: boolean;
}

export const LEADERBOARD_NAME = 'metropolis_networth';
const STORAGE_KEY = 'metropolis_yandex_v3_state';
const INTERSTITIAL_COOLDOWN_MS = 90_000;

let ysdkInstance: YandexSDK | null = null;
let yandexPlayer: YandexPlayer | null = null;
let lastFullscreenAdAt = 0;

export const DEMO_LEADERBOARD_RIVALS: { name: string; netWorthRub: number }[] = [
  { name: 'А. Соколов', netWorthRub: 42_500_000_000 },
  { name: 'Корпорация «Атлант»', netWorthRub: 14_800_000_000 },
  { name: 'В. Морозов', netWorthRub: 3_400_000_000 },
  { name: 'Д. Громова', netWorthRub: 780_000_000 },
  { name: 'Синдикат-77', netWorthRub: 165_000_000 },
  { name: 'К. Лебедев', netWorthRub: 24_000_000 },
  { name: 'М. Волков', netWorthRub: 4_200_000 },
  { name: 'Е. Смирнова', netWorthRub: 620_000 },
  { name: 'И. Петров', netWorthRub: 85_000 },
];

export function buildMergedLeaderboard(
  playerName: string,
  playerNetWorth: number,
  remoteEntries?: YandexLeaderboardEntry[],
): LeaderboardRow[] {
  if (remoteEntries && remoteEntries.length > 0) {
    return remoteEntries.map((entry) => ({
      rank: entry.rank,
      name: entry.player.publicName || 'Игрок Яндекс',
      netWorthRub: entry.score,
      isCurrentPlayer: yandexPlayer ? entry.player.uniqueID === yandexPlayer.getUniqueID() : false,
    }));
  }

  const combined = [
    ...DEMO_LEADERBOARD_RIVALS.map((r) => ({ ...r, isCurrentPlayer: false })),
    { name: playerName, netWorthRub: Math.max(0, Math.round(playerNetWorth)), isCurrentPlayer: true },
  ].sort((a, b) => b.netWorthRub - a.netWorthRub);

  return combined.map((item, idx) => ({
    rank: idx + 1,
    name: item.name,
    netWorthRub: item.netWorthRub,
    isCurrentPlayer: item.isCurrentPlayer,
  }));
}

export async function initYandexBridge(callbacks?: {
  onPause?: () => void;
  onResume?: () => void;
}): Promise<YandexBridgeStatus> {
  const defaultStatus: YandexBridgeStatus = {
    mode: 'local_sandbox',
    sdkReady: true,
    loadingApiCalled: true,
    gameplayActive: false,
    cloudSyncedAt: null,
    lang: typeof navigator !== 'undefined' && navigator.language.startsWith('en') ? 'en' : 'ru',
    playerName: 'Игрок Метрополиса',
    playerId: 'ya_local_player',
    isAuthorized: false,
  };

  if (typeof window === 'undefined' || !window.YaGames) {
    return defaultStatus;
  }

  try {
    const sdk = await window.YaGames.init();
    ysdkInstance = sdk;

    // Mandatory Yandex Games moderation signal
    sdk.features?.LoadingAPI?.ready();

    // Subscribe to platform pause/resume lifecycle events
    sdk.on?.('game_api_pause', () => callbacks?.onPause?.());
    sdk.on?.('game_api_resume', () => callbacks?.onResume?.());

    let playerName = 'Игрок Яндекс';
    let playerId = 'ya_guest';
    let isAuthorized = false;

    try {
      const player = await sdk.getPlayer({ scopes: false });
      yandexPlayer = player;
      playerId = player.getUniqueID() || playerId;
      playerName = player.getName() || playerName;
      isAuthorized = player.getMode() !== 'lite';
    } catch {
      // Guest mode fallback
    }

    return {
      mode: 'yandex_live',
      sdkReady: true,
      loadingApiCalled: true,
      gameplayActive: false,
      cloudSyncedAt: null,
      lang: sdk.environment?.i18n?.lang || 'ru',
      playerName,
      playerId,
      isAuthorized,
    };
  } catch {
    return defaultStatus;
  }
}

export function signalGameplayStart(): void {
  try {
    ysdkInstance?.features?.GameplayAPI?.start();
  } catch {
    // Non-fatal in sandbox
  }
}

export function signalGameplayStop(): void {
  try {
    ysdkInstance?.features?.GameplayAPI?.stop();
  } catch {
    // Non-fatal in sandbox
  }
}

export async function loadCloudOrLocalState(): Promise<PlayerState | null> {
  // 1. Prefer Yandex Cloud Saves when live SDK player is available
  if (yandexPlayer) {
    try {
      const data = await yandexPlayer.getData(['metropolis_state']);
      const cloud = data?.metropolis_state as PlayerState | undefined;
      if (cloud && cloud.wallet && typeof cloud.energy === 'number') {
        return cloud;
      }
    } catch {
      // Fall through to localStorage
    }
  }

  // 2. Fallback to localStorage
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PlayerState;
        if (parsed && parsed.wallet && typeof parsed.energy === 'number') {
          return parsed;
        }
      }
    } catch {
      // Ignore corrupt storage
    }
  }
  return null;
}

export async function saveCloudAndLocalState(state: PlayerState): Promise<boolean> {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Quota ignored
    }
  }

  if (yandexPlayer) {
    try {
      // Keep cloud payload lightweight (trim logs to last 10)
      const compactState: PlayerState = { ...state, logs: state.logs.slice(0, 10) };
      await yandexPlayer.setData({ metropolis_state: compactState }, true);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export async function syncLeaderboardScore(netWorthRub: number): Promise<LeaderboardRow[] | null> {
  if (!ysdkInstance) return null;
  try {
    const lb = await ysdkInstance.getLeaderboards();
    await lb.setLeaderboardScore(LEADERBOARD_NAME, Math.max(0, Math.round(netWorthRub)));
    const result = await lb.getLeaderboardEntries(LEADERBOARD_NAME, {
      quantityTop: 10,
      includeUser: true,
      quantityAround: 3,
    });
    return buildMergedLeaderboard('', netWorthRub, result.entries);
  } catch {
    return null;
  }
}

export function showYandexFullscreenAd(opts: {
  onPauseAudio: () => void;
  onResumeAudio: () => void;
  force?: boolean;
}): Promise<boolean> {
  const now = Date.now();
  if (!opts.force && now - lastFullscreenAdAt < INTERSTITIAL_COOLDOWN_MS) {
    return Promise.resolve(false);
  }
  lastFullscreenAdAt = now;

  if (!ysdkInstance) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (shown: boolean) => {
      if (settled) return;
      settled = true;
      opts.onResumeAudio();
      signalGameplayStart();
      resolve(shown);
    };

    try {
      ysdkInstance!.adv.showFullscreenAdv({
        callbacks: {
          onOpen: () => {
            signalGameplayStop();
            opts.onPauseAudio();
          },
          onClose: (wasShown) => finish(wasShown),
          onError: () => finish(false),
        },
      });
    } catch {
      finish(false);
    }
  });
}

export function isLiveYandexSdk(): boolean {
  return ysdkInstance !== null;
}

export function showYandexRewardedVideo(opts: {
  onPauseAudio: () => void;
  onResumeAudio: () => void;
}): Promise<boolean> {
  if (!ysdkInstance) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    let rewarded = false;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      opts.onResumeAudio();
      signalGameplayStart();
      resolve(rewarded);
    };

    try {
      ysdkInstance!.adv.showRewardedVideo({
        callbacks: {
          onOpen: () => {
            signalGameplayStop();
            opts.onPauseAudio();
          },
          onRewarded: () => {
            rewarded = true;
          },
          onClose: () => finish(),
          onError: () => finish(),
        },
      });
    } catch {
      finish();
    }
  });
}
