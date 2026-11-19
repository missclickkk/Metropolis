import { useEffect, useState } from 'react';
import { Terminal, ShieldCheck, Copy, Check, Download, Code2, RotateCcw } from 'lucide-react';
import { CREATOR_TELEGRAM_ID, TELEGRAM_MINI_APP_LINK } from '../game/catalog';
import type { Currency, PlayerState } from '../game/types';
import mainPyRaw from '../../bot/main.py?raw';
import handlersPyRaw from '../../bot/handlers.py?raw';
import gameEnginePyRaw from '../../bot/game_engine.py?raw';
import requirementsTxtRaw from '../../bot/requirements.txt?raw';
import readmeMdRaw from '../../bot/README.md?raw';

interface BotFile {
  name: string;
  content: string;
}

const STATIC_BOT_FILES: BotFile[] = [
  { name: 'main.py', content: mainPyRaw },
  { name: 'handlers.py', content: handlersPyRaw },
  { name: 'game_engine.py', content: gameEnginePyRaw },
  { name: 'requirements.txt', content: requirementsTxtRaw },
  { name: 'README.md', content: readmeMdRaw },
];

interface DevConsoleTabProps {
  state: PlayerState;
  onUnlockCreator: (telegramId: string) => void;
  onGrantCurrency: (currency: Currency, delta: number) => void;
  onPatchState: (patch: {
    energy?: number;
    karma?: number;
    warnings?: number;
    bannedUntil?: number;
    level?: number;
    experienceShifts?: number;
    hasBlackMarketGear?: boolean;
  }) => void;
  onVetoDecree: () => void;
  onResetGame: () => void;
}

export function DevConsoleTab({
  state,
  onUnlockCreator,
  onGrantCurrency,
  onPatchState,
  onVetoDecree,
  onResetGame,
}: DevConsoleTabProps) {
  const [idInput, setIdInput] = useState(CREATOR_TELEGRAM_ID);
  const [botFiles] = useState<BotFile[]>(STATIC_BOT_FILES);
  const [activeFile, setActiveFile] = useState<string>('main.py');
  const [copied, setCopied] = useState(false);

  // Live State Editor fields
  const [karmaVal, setKarmaVal] = useState(String(state.karma));
  const [levelVal, setLevelVal] = useState(String(state.level));
  const [shiftsVal, setShiftsVal] = useState(String(state.experienceShifts));

  useEffect(() => {
    setKarmaVal(String(state.karma));
    setLevelVal(String(state.level));
    setShiftsVal(String(state.experienceShifts));
  }, [state.karma, state.level, state.experienceShifts]);

  const currentFileObj = botFiles.find((f) => f.name === activeFile) ?? botFiles[0] ?? null;

  const handleCopy = async () => {
    if (!currentFileObj) return;
    try {
      await navigator.clipboard.writeText(currentFileObj.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const handleDownloadFile = (file: BotFile) => {
    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-white/[0.08] pb-4">
        <h2 className="font-display text-2xl font-bold text-white">Dev / Консоль & aiogram 3.x Bot</h2>
        <p className="text-xs text-[#8C96A9]">
          Master Control по Telegram ID Создателя ({CREATOR_TELEGRAM_ID}) · Mini App:{' '}
          <a
            href={TELEGRAM_MINI_APP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#D4A853] underline-offset-2 hover:underline"
          >
            t.me/Metrop0lis_bot/myapp
          </a>
        </p>
      </div>

      {/* Master Control (Creator Dev Mode) */}
      <section className="rounded-xl border border-white/[0.08] bg-[#12161E] p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-[#D4A853]" aria-hidden="true" />
            <h3 className="font-display text-xl font-bold text-white">Панель Создателя (Dev Mode)</h3>
          </div>
          <span className="font-mono-num text-xs text-[#8C96A9]">
            Ваш ID: {state.telegramId} · {state.isCreator ? 'Доступ Создателя активен' : 'Закрыто'}
          </span>
        </div>

        {!state.isCreator ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1 block text-xs text-[#8C96A9]" htmlFor="creator-id-input">
                Введите Telegram ID Создателя для авторизации (демо ID: {CREATOR_TELEGRAM_ID})
              </label>
              <input
                id="creator-id-input"
                type="text"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                className="w-full rounded-lg border border-white/12 bg-[#0D1017] px-3.5 py-2.5 font-mono-num text-sm text-white"
              />
            </div>
            <button
              type="button"
              onClick={() => onUnlockCreator(idInput)}
              className="flex min-h-[44px] items-center gap-2 rounded-lg bg-[#D4A853] px-5 py-2 text-sm font-bold text-[#0A0C10]"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span>Активировать Dev Mode</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 4-Currency Payout / Deduct */}
            <div>
              <p className="mb-2.5 text-xs font-semibold text-[#A3ACBE]">Выплата / списание 4 валют (RUB, USD, BTC, EUR)</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onGrantCurrency('RUB', 1_000_000)}
                  className="min-h-[38px] rounded-lg bg-[#1F2635] px-3.5 py-1.5 font-mono-num text-xs font-bold text-white hover:bg-[#D4A853] hover:text-[#0A0C10]"
                >
                  +1,000,000 RUB
                </button>
                <button
                  type="button"
                  onClick={() => onGrantCurrency('RUB', 100_000_000)}
                  className="min-h-[38px] rounded-lg bg-[#1F2635] px-3.5 py-1.5 font-mono-num text-xs font-bold text-white hover:bg-[#D4A853] hover:text-[#0A0C10]"
                >
                  +100M RUB
                </button>
                <button
                  type="button"
                  onClick={() => onGrantCurrency('USD', 5_000)}
                  className="min-h-[38px] rounded-lg bg-[#1F2635] px-3.5 py-1.5 font-mono-num text-xs font-bold text-[#10B981] hover:bg-[#10B981] hover:text-[#0A0C10]"
                >
                  +5,000 USD
                </button>
                <button
                  type="button"
                  onClick={() => onGrantCurrency('BTC', 0.25)}
                  className="min-h-[38px] rounded-lg bg-[#1F2635] px-3.5 py-1.5 font-mono-num text-xs font-bold text-[#F59E0B] hover:bg-[#F59E0B] hover:text-[#0A0C10]"
                >
                  +0.25 BTC
                </button>
                <button
                  type="button"
                  onClick={() => onGrantCurrency('EUR', 500)}
                  className="min-h-[38px] rounded-lg bg-[#1F2635] px-3.5 py-1.5 font-mono-num text-xs font-bold text-[#D4A853] hover:bg-[#D4A853] hover:text-[#0A0C10]"
                >
                  +500 EUR
                </button>
              </div>
            </div>

            {/* Live State Editor */}
            <div className="grid grid-cols-1 gap-4 border-t border-white/[0.07] pt-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-[#8C96A9]" htmlFor="dev-karma">Карма</label>
                <input
                  id="dev-karma"
                  type="number"
                  value={karmaVal}
                  onChange={(e) => setKarmaVal(e.target.value)}
                  className="w-full rounded-lg border border-white/12 bg-[#0D1017] px-3 py-2 font-mono-num text-sm text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#8C96A9]" htmlFor="dev-level">Уровень</label>
                <input
                  id="dev-level"
                  type="number"
                  min={1}
                  value={levelVal}
                  onChange={(e) => setLevelVal(e.target.value)}
                  className="w-full rounded-lg border border-white/12 bg-[#0D1017] px-3 py-2 font-mono-num text-sm text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#8C96A9]" htmlFor="dev-shifts">Стаж (смен)</label>
                <input
                  id="dev-shifts"
                  type="number"
                  min={0}
                  value={shiftsVal}
                  onChange={(e) => setShiftsVal(e.target.value)}
                  className="w-full rounded-lg border border-white/12 bg-[#0D1017] px-3 py-2 font-mono-num text-sm text-white"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() =>
                    onPatchState({
                      karma: Number(karmaVal),
                      level: Math.max(1, Number(levelVal)),
                      experienceShifts: Math.max(0, Number(shiftsVal)),
                    })
                  }
                  className="min-h-[40px] w-full rounded-lg bg-[#D4A853] px-4 py-2 text-xs font-bold text-[#0A0C10]"
                >
                  Применить поля
                </button>
              </div>
            </div>

            {/* Quick Master Actions */}
            <div className="flex flex-wrap gap-2 border-t border-white/[0.07] pt-4">
              <button
                type="button"
                onClick={() => onPatchState({ energy: 100 })}
                className="min-h-[38px] rounded-lg border border-white/12 bg-[#181D27] px-3.5 py-1.5 text-xs font-semibold text-white hover:border-[#D4A853]"
              >
                Полная энергия 100⚡
              </button>
              <button
                type="button"
                onClick={() => onPatchState({ warnings: 0, bannedUntil: 0 })}
                className="min-h-[38px] rounded-lg border border-white/12 bg-[#181D27] px-3.5 py-1.5 text-xs font-semibold text-white hover:border-[#10B981]"
              >
                Снять варны / бан (0/3)
              </button>
              <button
                type="button"
                onClick={() => onPatchState({ hasBlackMarketGear: true })}
                className="min-h-[38px] rounded-lg border border-white/12 bg-[#181D27] px-3.5 py-1.5 text-xs font-semibold text-white hover:border-[#D4A853]"
              >
                Выдать Теневой пакет
              </button>
              <button
                type="button"
                onClick={onVetoDecree}
                className="min-h-[38px] rounded-lg border border-white/12 bg-[#181D27] px-3.5 py-1.5 text-xs font-semibold text-white hover:border-[#E11D48]"
              >
                Вето на указы Президента
              </button>
              <button
                type="button"
                onClick={onResetGame}
                className="ml-auto flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#E11D48]/40 bg-[#E11D48]/10 px-3.5 py-1.5 text-xs font-semibold text-[#FDA4AF]"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Сбросить прогресс</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Python aiogram 3.x Bot Source Studio */}
      <section className="rounded-xl border border-white/[0.08] bg-[#12161E] p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-[#D4A853]" aria-hidden="true" />
            <div>
              <h3 className="font-display text-xl font-bold text-white">Исходный код Telegram-бота (aiogram 3.x)</h3>
              <p className="text-xs text-[#8C96A9]">
                Готовый Python-бот с Inline-кликером, 0.5с Rate-Limit middleware, aiosqlite и кнопкой запуска WebAppInfo
              </p>
            </div>
          </div>

          {currentFileObj && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/12 bg-[#181D27] px-3 py-1.5 text-xs font-semibold text-white hover:border-[#D4A853]"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-[#10B981]" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Скопировано' : 'Копировать'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadFile(currentFileObj)}
                className="flex min-h-[36px] items-center gap-1.5 rounded-lg bg-[#D4A853] px-3 py-1.5 text-xs font-bold text-[#0A0C10]"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Скачать {currentFileObj.name}</span>
              </button>
            </div>
          )}
        </div>

        {/* File selector */}
        <div className="mb-3 flex flex-wrap gap-1 border-b border-white/[0.07] pb-3">
          {botFiles.map((file) => (
            <button
              key={file.name}
              type="button"
              onClick={() => setActiveFile(file.name)}
              className={`min-h-[34px] rounded-md px-3 py-1 font-mono text-xs font-medium transition-colors whitespace-nowrap ${
                activeFile === file.name
                  ? 'bg-[#D4A853] text-[#0A0C10]'
                  : 'bg-[#181D27] text-[#A3ACBE] hover:text-white'
              }`}
            >
              bot/{file.name}
            </button>
          ))}
        </div>

        <pre className="max-h-[420px] overflow-auto rounded-lg border border-white/[0.06] bg-[#0A0C10] p-4 font-mono text-xs leading-relaxed text-[#CBD5E1]">
          <code>{currentFileObj ? currentFileObj.content : 'Загрузка исходников aiogram 3.x...'}</code>
        </pre>
      </section>
    </div>
  );
}
