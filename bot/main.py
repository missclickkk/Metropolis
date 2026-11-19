"""
METROPOLIS v3.0 — Telegram Bot (aiogram 3.x) + Mini App Bridge
Запуск:
  pip install -r requirements.txt
  export BOT_TOKEN="123456:ABC..."
  export MINI_APP_URL="https://ais-pre-etvqdz2pqn5c3dvqxcwmsd-77322769736.europe-west2.run.app"
  export CREATOR_TELEGRAM_ID="630771271"
  python main.py
"""

import asyncio
import logging
import os
import time
from typing import Any, Awaitable, Callable, Dict

from aiogram import BaseMiddleware, Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.types import CallbackQuery, Message, TelegramObject
from dotenv import load_dotenv

from game_engine import Database, issue_warning
from handlers import router

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
RATE_LIMIT_SEC = 0.5  # Бэкенд Rate-Limit 0.5 сек (макс. 2 запроса в секунду)


class AntiBotRateLimitMiddleware(BaseMiddleware):
    """Защита от ботов и автокликеров: 0.5с Rate-Limit, 3/3 варна -> бан 24ч."""

    def __init__(self, db: Database) -> None:
        self.db = db
        self._last_hit: Dict[int, float] = {}

    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any],
    ) -> Any:
        user = getattr(event, "from_user", None)
        if not user:
            return await handler(event, data)

        now = time.time()
        player = await self.db.get_or_create_player(user.id, user.username or user.full_name)

        # Проверка активного 24-часового бана
        if player.banned_until > now:
            hours = max(1, int((player.banned_until - now) // 3600) + 1)
            msg = f"⛔ Аккаунт в статусе BANNED (Варны 3/3). Осталось ~{hours} ч."
            if isinstance(event, CallbackQuery):
                await event.answer(msg, show_alert=True)
            elif isinstance(event, Message):
                await event.answer(msg)
            return None

        # Проверка Rate-Limit 0.5 секунды
        last = self._last_hit.get(user.id, 0.0)
        self._last_hit[user.id] = now
        if last > 0 and (now - last) < RATE_LIMIT_SEC:
            warn_msg = await issue_warning(self.db, player, "Превышен Rate-Limit 0.5с (автокликер)")
            if isinstance(event, CallbackQuery):
                await event.answer(warn_msg, show_alert=True)
            elif isinstance(event, Message):
                await event.answer(warn_msg)
            return None

        data["db"] = self.db
        data["player"] = player
        return await handler(event, data)


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    if not BOT_TOKEN:
        raise RuntimeError("Установите переменную окружения BOT_TOKEN перед запуском.")

    db = Database("metropolis.db")
    await db.init()

    bot = Bot(token=BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = Dispatcher()

    middleware = AntiBotRateLimitMiddleware(db)
    dp.message.middleware(middleware)
    dp.callback_query.middleware(middleware)
    dp.include_router(router)

    logging.info("METROPOLIS aiogram 3.x бот запущен (Rate-Limit %.1fs)", RATE_LIMIT_SEC)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
