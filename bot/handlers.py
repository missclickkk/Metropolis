"""
METROPOLIS v3.0 — Роутер команд и Inline-кликера на aiogram 3.x
"""

import os
from aiogram import F, Router
from aiogram.filters import Command, CommandStart
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message, WebAppInfo

from game_engine import Database, Player, click_mine_ore, click_work_shift, drink_coffee

router = Router(name="metropolis")

MINI_APP_URL = (
    os.getenv("MINI_APP_URL")
    or os.getenv("APP_URL")
    or "https://ais-pre-etvqdz2pqn5c3dvqxcwmsd-77322769736.europe-west2.run.app"
)
CREATOR_TELEGRAM_ID = int(os.getenv("CREATOR_TELEGRAM_ID", "630771271"))


def main_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🚀 Открыть METROPOLIS Mini App",
                    web_app=WebAppInfo(url=MINI_APP_URL),
                )
            ],
            [
                InlineKeyboardButton(text="💼 Смена (-20⚡)", callback_data="click:work"),
                InlineKeyboardButton(text="⛏ Шахта (-2⚡)", callback_data="click:mine"),
            ],
            [
                InlineKeyboardButton(text="⬆️ Сила клика", callback_data="upgrade:click"),
                InlineKeyboardButton(text="☕ Кофе (+25⚡)", callback_data="action:coffee"),
            ],
            [
                InlineKeyboardButton(text="💰 Продать руду", callback_data="action:sell_ore"),
                InlineKeyboardButton(text="🔄 Обновить профиль", callback_data="action:refresh"),
            ],
        ]
    )


def format_profile(p: Player, note: str = "") -> str:
    header = (
        f"🏛 <b>METROPOLIS v3.0</b> — Профиль игрока\n"
        f"👤 <b>{p.username}</b> · Ур. <b>{p.level}</b> ({p.xp}/{p.xp_needed()} XP)\n"
        f"🏆 Престиж: <b>{p.prestige_numeral()}</b> · Карма: <b>{p.karma:+d}</b> · Варны: <b>[{p.warnings}/3]</b>\n"
        f"⚡ Энергия: <b>{p.energy}/{p.max_energy}</b> · Сила клика: <b>ур. {p.click_power}</b>\n\n"
        f"💳 <b>Кошелек:</b> {p.rub:,} RUB · {p.usd:,.2f} USD · {p.btc:.5f} BTC · {p.eur:,.2f} EUR\n"
        f"🔐 <b>Сейф (0%):</b> {p.safe_rub:,} RUB · ⛏ Руда: {p.ore_stock} шт."
    )
    return f"{header}\n\n{note}" if note else header


@router.message(CommandStart())
async def cmd_start(message: Message, player: Player) -> None:
    await message.answer(
        format_profile(
            player,
            "Добро пожаловать в METROPOLIS! Прокачивайте персонажа кликами прямо в чате или откройте полный Telegram Mini App.",
        ),
        reply_markup=main_keyboard(),
    )


@router.message(Command("profile"))
async def cmd_profile(message: Message, player: Player) -> None:
    await message.answer(format_profile(player), reply_markup=main_keyboard())


@router.callback_query(F.data == "click:work")
async def cb_work(callback: CallbackQuery, db: Database, player: Player) -> None:
    ok, msg = await click_work_shift(db, player)
    await callback.answer(msg[:190], show_alert=not ok)
    if ok and callback.message:
        await callback.message.edit_text(format_profile(player, msg), reply_markup=main_keyboard())


@router.callback_query(F.data == "click:mine")
async def cb_mine(callback: CallbackQuery, db: Database, player: Player) -> None:
    ok, msg = await click_mine_ore(db, player)
    await callback.answer(msg[:190], show_alert=not ok)
    if ok and callback.message:
        await callback.message.edit_text(format_profile(player, msg), reply_markup=main_keyboard())


@router.callback_query(F.data == "upgrade:click")
async def cb_upgrade_click(callback: CallbackQuery, db: Database, player: Player) -> None:
    cost = int(round(800 * (1.9 ** (player.click_power - 1))))
    if player.rub < cost:
        await callback.answer(f"Нужно {cost:,} RUB для улучшения силы клика.", show_alert=True)
        return
    player.rub -= cost
    player.click_power += 1
    await db.save_player(player)
    msg = f"⬆️ Сила клика повышена до ур. {player.click_power} (+15% дохода)!"
    await callback.answer(msg)
    if callback.message:
        await callback.message.edit_text(format_profile(player, msg), reply_markup=main_keyboard())


@router.callback_query(F.data == "action:coffee")
async def cb_coffee(callback: CallbackQuery, db: Database, player: Player) -> None:
    ok, msg = await drink_coffee(db, player)
    await callback.answer(msg, show_alert=not ok)
    if ok and callback.message:
        await callback.message.edit_text(format_profile(player, msg), reply_markup=main_keyboard())


@router.callback_query(F.data == "action:sell_ore")
async def cb_sell_ore(callback: CallbackQuery, db: Database, player: Player) -> None:
    if player.ore_stock <= 0:
        await callback.answer("Склад руды пуст.", show_alert=True)
        return
    earned = player.ore_stock * 65
    sold = player.ore_stock
    player.ore_stock = 0
    player.rub += earned
    await db.save_player(player)
    msg = f"💰 Продано {sold} ед. руды за {earned:,} RUB."
    await callback.answer(msg)
    if callback.message:
        await callback.message.edit_text(format_profile(player, msg), reply_markup=main_keyboard())


@router.callback_query(F.data == "action:refresh")
async def cb_refresh(callback: CallbackQuery, player: Player) -> None:
    await callback.answer("Профиль синхронизирован")
    if callback.message:
        await callback.message.edit_text(format_profile(player), reply_markup=main_keyboard())


@router.message(Command("dev"))
async def cmd_dev_grant(message: Message, db: Database, player: Player) -> None:
    """Dev Mode (Панель Создателя) — закрытая команда по telegram_id."""
    if not message.from_user or message.from_user.id != CREATOR_TELEGRAM_ID:
        await message.answer("⛔ Доступ запрещен: требуется Telegram ID Создателя.")
        return
    player.rub += 1_000_000
    player.energy = player.max_energy
    player.property_tier = max(1, player.property_tier)
    await db.save_player(player)
    await message.answer(
        format_profile(player, "🛠 Dev Mode: выдано +1,000,000 RUB, 100⚡ и открыта Студия."),
        reply_markup=main_keyboard(),
    )
