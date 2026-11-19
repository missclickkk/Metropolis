import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const RATE_LIMIT_MS = 500; // Backend Rate-Limit 0.5s (max 2 requests/sec)
const BOT_TOKEN = process.env.BOT_TOKEN?.trim() || '';
const PUBLIC_APP_URL = (process.env.MINI_APP_URL || process.env.APP_URL || '').replace(/\/+$/, '');
const CREATOR_TELEGRAM_ID = process.env.CREATOR_TELEGRAM_ID?.trim() || '630771271';

const app = express();
app.use(express.json({ limit: '1mb' }));

// In-memory rate limiter per telegramId for anti-bot protection
const lastActionTimestamp = new Map<string, number>();

// Persistent JSON store for synced player profiles
const DATA_DIR = path.resolve(__dirname, '.data');
const STATE_FILE = path.join(DATA_DIR, 'players.json');

interface BotPlayer {
  telegramId: string;
  username: string;
  level: number;
  xp: number;
  shifts: number;
  energy: number;
  rub: number;
  karma: number;
  warnings: number;
  bannedUntil: number;
  lastClickAt: number;
}

function loadSavedStates(): Record<string, unknown> {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch {
    // Fallback to empty map if file is unreadable
  }
  return {};
}

function saveStates(states: Record<string, unknown>): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(states, null, 2), 'utf-8');
  } catch {
    // Non-fatal persistence warning
  }
}

const playerStore: Record<string, unknown> = loadSavedStates();
const telegramBotUsers = new Map<string, BotPlayer>();

function getBotPlayer(id: string, username: string): BotPlayer {
  const existing = telegramBotUsers.get(id);
  if (existing) return existing;
  const created: BotPlayer = {
    telegramId: id,
    username,
    level: 1,
    xp: 0,
    shifts: 0,
    energy: 100,
    rub: 1500,
    karma: 5,
    warnings: 0,
    bannedUntil: 0,
    lastClickAt: 0,
  };
  telegramBotUsers.set(id, created);
  return created;
}

async function callTelegramApi(method: string, payload: Record<string, unknown>) {
  if (!BOT_TOKEN) return null;
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

function buildBotKeyboard() {
  const rows: unknown[][] = [];
  if (PUBLIC_APP_URL.startsWith('https://')) {
    rows.push([
      {
        text: '🚀 Открыть METROPOLIS Mini App',
        web_app: { url: PUBLIC_APP_URL },
      },
    ]);
  }
  rows.push([
    { text: '💼 Смена (-20⚡)', callback_data: 'click:work' },
    { text: '⛏ Шахта (-2⚡)', callback_data: 'click:mine' },
  ]);
  rows.push([{ text: '🔄 Обновить профиль', callback_data: 'action:refresh' }]);
  return { inline_keyboard: rows };
}

function formatBotProfile(p: BotPlayer, note = ''): string {
  const base =
    `🏛 <b>METROPOLIS v3.0</b>\n` +
    `👤 <b>${p.username}</b> · Ур. <b>${p.level}</b> (${p.xp} XP)\n` +
    `⚡ Энергия: <b>${p.energy}/100</b> · Карма: <b>${p.karma >= 0 ? '+' : ''}${p.karma}</b> · Варны: <b>[${p.warnings}/3]</b>\n` +
    `💳 Баланс: <b>${p.rub.toLocaleString('ru-RU')} RUB</b>`;
  return note ? `${base}\n\n${note}` : base;
}

// Safe status endpoint (never exposes BOT_TOKEN)
app.get('/api/telegram/status', (_req, res) => {
  res.json({
    configured: Boolean(BOT_TOKEN),
    webhookReady: Boolean(BOT_TOKEN && PUBLIC_APP_URL.startsWith('https://')),
    miniAppUrl: PUBLIC_APP_URL || null,
  });
});

// Telegram Bot Webhook receiver (handles /start, /profile, /dev and inline clicker callbacks)
app.post('/api/telegram/webhook', async (req, res) => {
  res.sendStatus(200);
  if (!BOT_TOKEN) return;

  try {
    const update = req.body as {
      message?: {
        chat: { id: number };
        from?: { id: number; username?: string; first_name?: string };
        text?: string;
      };
      callback_query?: {
        id: string;
        from: { id: number; username?: string; first_name?: string };
        data?: string;
        message?: { chat: { id: number }; message_id: number };
      };
    };

    if (update.message?.from) {
      const uid = String(update.message.from.id);
      const name = update.message.from.username
        ? `@${update.message.from.username}`
        : update.message.from.first_name || 'Игрок';
      const player = getBotPlayer(uid, name);
      const text = (update.message.text || '').trim();

      if (text.startsWith('/dev')) {
        if (uid !== CREATOR_TELEGRAM_ID) {
          await callTelegramApi('sendMessage', {
            chat_id: update.message.chat.id,
            text: '⛔ Доступ запрещен: требуется Telegram ID Создателя.',
          });
          return;
        }
        player.rub += 1_000_000;
        player.energy = 100;
        await callTelegramApi('sendMessage', {
          chat_id: update.message.chat.id,
          parse_mode: 'HTML',
          text: formatBotProfile(player, '🛠 Dev Mode: выдано +1,000,000 RUB и 100⚡.'),
          reply_markup: buildBotKeyboard(),
        });
        return;
      }

      await callTelegramApi('sendMessage', {
        chat_id: update.message.chat.id,
        parse_mode: 'HTML',
        text: formatBotProfile(
          player,
          'Прокачивайте персонажа кликами или откройте полный METROPOLIS Mini App кнопкой ниже.',
        ),
        reply_markup: buildBotKeyboard(),
      });
      return;
    }

    if (update.callback_query?.from) {
      const cb = update.callback_query;
      const uid = String(cb.from.id);
      const name = cb.from.username ? `@${cb.from.username}` : cb.from.first_name || 'Игрок';
      const player = getBotPlayer(uid, name);
      const now = Date.now();

      // Anti-bot 0.5s Rate-Limit -> Warnings 3/3 -> 24h BANNED
      if (player.bannedUntil > now) {
        await callTelegramApi('answerCallbackQuery', {
          callback_query_id: cb.id,
          text: '⛔ Аккаунт в статусе BANNED на 24ч (Варны 3/3).',
          show_alert: true,
        });
        return;
      }

      const prev = lastActionTimestamp.get(uid) ?? 0;
      lastActionTimestamp.set(uid, now);
      if (prev > 0 && now - prev < RATE_LIMIT_MS) {
        player.warnings += 1;
        if (player.warnings >= 3) {
          player.warnings = 3;
          player.bannedUntil = now + 24 * 3600 * 1000;
        }
        await callTelegramApi('answerCallbackQuery', {
          callback_query_id: cb.id,
          text: `⚠️ Варн [${player.warnings}/3]: превышен Rate-Limit 0.5с!`,
          show_alert: true,
        });
        return;
      }

      let note = '';
      if (cb.data === 'click:work') {
        if (now - player.lastClickAt < 1500) {
          await callTelegramApi('answerCallbackQuery', {
            callback_query_id: cb.id,
            text: '⏳ Анти-бот задержка UI 1.5с',
            show_alert: true,
          });
          return;
        }
        if (player.energy < 20) {
          await callTelegramApi('answerCallbackQuery', {
            callback_query_id: cb.id,
            text: '⚡ Недостаточно энергии (нужно 20⚡)',
            show_alert: true,
          });
          return;
        }
        const earned = 50 + player.shifts * 200;
        player.energy -= 20;
        player.shifts += 1;
        player.rub += earned;
        player.xp += 18;
        player.karma += 1;
        player.lastClickAt = now;
        if (player.xp >= 100 * player.level) {
          player.xp -= 100 * player.level;
          player.level += 1;
        }
        note = `💼 Смена: +${earned.toLocaleString('ru-RU')} RUB (-20⚡)`;
      } else if (cb.data === 'click:mine') {
        if (player.energy < 2) {
          await callTelegramApi('answerCallbackQuery', {
            callback_query_id: cb.id,
            text: '⚡ Нужно 2⚡ для удара киркой',
            show_alert: true,
          });
          return;
        }
        const qty = 1 + Math.floor(Math.random() * 12);
        const earned = qty * 45;
        player.energy -= 2;
        player.rub += earned;
        player.xp += 10;
        player.lastClickAt = now;
        note = `⛏ Шахта: добыто ${qty} ед. руды (+${earned.toLocaleString('ru-RU')} RUB)`;
      } else {
        note = '🔄 Профиль синхронизирован.';
      }

      await callTelegramApi('answerCallbackQuery', {
        callback_query_id: cb.id,
        text: note,
      });
      if (cb.message) {
        await callTelegramApi('editMessageText', {
          chat_id: cb.message.chat.id,
          message_id: cb.message.message_id,
          parse_mode: 'HTML',
          text: formatBotProfile(player, note),
          reply_markup: buildBotKeyboard(),
        });
      }
    }
  } catch (err) {
    console.error('Telegram webhook handling error:', err);
  }
});

// Backend Rate-Limit verification endpoint (0.5s anti-bot protection)
app.post('/api/action/verify', (req, res) => {
  const telegramId = String(req.body?.telegramId ?? 'guest');
  const now = Date.now();
  const prev = lastActionTimestamp.get(telegramId) ?? 0;
  lastActionTimestamp.set(telegramId, now);

  if (prev > 0 && now - prev < RATE_LIMIT_MS) {
    res.status(429).json({
      allowed: false,
      retryAfterMs: RATE_LIMIT_MS - (now - prev),
      reason: 'Rate-Limit 0.5s exceeded (anti-bot protection)',
    });
    return;
  }

  res.json({ allowed: true, serverTime: now });
});

// Sync player state to server
app.get('/api/state/:telegramId', (req, res) => {
  const key = String(req.params.telegramId);
  res.json({ state: playerStore[key] ?? null });
});

app.post('/api/state/:telegramId', (req, res) => {
  const key = String(req.params.telegramId);
  if (req.body && typeof req.body === 'object') {
    playerStore[key] = req.body;
    saveStates(playerStore);
  }
  res.json({ ok: true });
});

// Serve real Python aiogram 3.x bot source files for inspection/download inside the Mini App
app.get('/api/bot/files', (_req, res) => {
  const botDir = path.resolve(__dirname, 'bot');
  const fileNames = ['main.py', 'handlers.py', 'game_engine.py', 'requirements.txt', 'README.md'];
  const files = fileNames
    .map((name) => {
      const fullPath = path.join(botDir, name);
      if (!fs.existsSync(fullPath)) return null;
      return {
        name,
        content: fs.readFileSync(fullPath, 'utf-8'),
      };
    })
    .filter(Boolean);
  res.json({ files });
});

async function registerTelegramWebhookIfConfigured() {
  if (!BOT_TOKEN || !PUBLIC_APP_URL.startsWith('https://')) return;
  try {
    await callTelegramApi('setWebhook', {
      url: `${PUBLIC_APP_URL}/api/telegram/webhook`,
      allowed_updates: ['message', 'callback_query'],
    });
    await callTelegramApi('setChatMenuButton', {
      menu_button: {
        type: 'web_app',
        text: 'Играть в METROPOLIS',
        web_app: { url: PUBLIC_APP_URL },
      },
    });
    console.log(`Telegram webhook & Mini App menu button registered for ${PUBLIC_APP_URL}`);
  } catch (err) {
    console.warn('Could not register Telegram webhook automatically:', err);
  }
}

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`METROPOLIS server running on http://0.0.0.0:${PORT}`);
    void registerTelegramWebhookIfConfigured();
  });
}

startServer();
