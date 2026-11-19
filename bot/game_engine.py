"""
METROPOLIS v3.0 — Игровой движок и хранилище SQLite (aiosqlite) для aiogram 3.x
Реализует:
- Единый ресурс Энергия (100⚡, реген +1⚡ / 2 мин, ускорение жильем до +100%)
- Бесплатный Кофе (+25⚡ / 24 ч от Студии и выше)
- Прокачку персонажа кликами (Смена -20⚡, Шахта -2⚡, Уровень, XP, Карма -∞..+∞)
- Варны 3/3 -> BANNED 24ч -> автосброс 0/3
- 4 валюты (RUB, USD, BTC, EUR) + Сейф (0%)
"""

from __future__ import annotations

import math
import random
import time
from dataclasses import dataclass
from typing import Tuple

import aiosqlite

UI_CLICK_DELAY_SEC = 1.5
ENERGY_REGEN_BASE_SEC = 120.0
COFFEE_COOLDOWN_SEC = 24 * 3600
BAN_DURATION_SEC = 24 * 3600


@dataclass
class Player:
    telegram_id: int
    username: str
    level: int = 1
    xp: int = 0
    shifts: int = 0
    click_power: int = 1
    energy: int = 100
    max_energy: int = 100
    last_energy_ts: float = 0.0
    last_click_ts: float = 0.0
    last_coffee_ts: float = 0.0
    warnings: int = 0
    banned_until: float = 0.0
    karma: int = 5
    rub: int = 1500
    usd: float = 0.0
    btc: float = 0.0
    eur: float = 10.0
    safe_rub: int = 0
    property_tier: int = 0  # 0=Хостел, 1=Студия (+кофе), ..., 9=Частный остров
    ore_stock: int = 0

    def xp_needed(self) -> int:
        return int(round(100 * (1.38 ** (self.level - 1))))

    def regen_interval(self) -> float:
        bonus_pct = min(100, self.property_tier * 11)
        return ENERGY_REGEN_BASE_SEC / (1.0 + bonus_pct / 100.0)

    def prestige_numeral(self) -> str:
        net = self.rub + self.safe_rub + int(self.usd * 95 + self.eur * 104 + self.btc * 8_400_000)
        thresholds = [
            (35_000_000_000, "X (Апекс)"),
            (10_000_000_000, "IX"),
            (2_800_000_000, "VIII"),
            (650_000_000, "VII"),
            (120_000_000, "VI"),
            (20_000_000, "V"),
            (3_500_000, "IV"),
            (500_000, "III"),
            (50_000, "II"),
            (0, "I"),
        ]
        for limit, numeral in thresholds:
            if net >= limit:
                return numeral
        return "I"


class Database:
    def __init__(self, path: str) -> None:
        self.path = path

    async def init(self) -> None:
        async with aiosqlite.connect(self.path) as conn:
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS players (
                    telegram_id INTEGER PRIMARY KEY,
                    username TEXT NOT NULL,
                    level INTEGER DEFAULT 1,
                    xp INTEGER DEFAULT 0,
                    shifts INTEGER DEFAULT 0,
                    click_power INTEGER DEFAULT 1,
                    energy INTEGER DEFAULT 100,
                    max_energy INTEGER DEFAULT 100,
                    last_energy_ts REAL DEFAULT 0,
                    last_click_ts REAL DEFAULT 0,
                    last_coffee_ts REAL DEFAULT 0,
                    warnings INTEGER DEFAULT 0,
                    banned_until REAL DEFAULT 0,
                    karma INTEGER DEFAULT 5,
                    rub INTEGER DEFAULT 1500,
                    usd REAL DEFAULT 0,
                    btc REAL DEFAULT 0,
                    eur REAL DEFAULT 10,
                    safe_rub INTEGER DEFAULT 0,
                    property_tier INTEGER DEFAULT 0,
                    ore_stock INTEGER DEFAULT 0
                )
                """
            )
            await conn.commit()

    async def get_or_create_player(self, telegram_id: int, username: str) -> Player:
        now = time.time()
        async with aiosqlite.connect(self.path) as conn:
            conn.row_factory = aiosqlite.Row
            cur = await conn.execute("SELECT * FROM players WHERE telegram_id = ?", (telegram_id,))
            row = await cur.fetchone()
            if row is None:
                p = Player(telegram_id=telegram_id, username=username, last_energy_ts=now)
                await self.save_player(p)
                return p
            p = Player(**dict(row))

        # Автоснятие бана после 24ч и обнуление варнов 0/3
        if p.banned_until > 0 and now >= p.banned_until:
            p.banned_until = 0.0
            p.warnings = 0

        # Строгая регенерация энергии +1⚡ каждые 2 мин (ускоряется жильем)
        interval = p.regen_interval()
        if p.energy < p.max_energy:
            elapsed = max(0.0, now - p.last_energy_ts)
            gained = int(elapsed // interval)
            if gained > 0:
                p.energy = min(p.max_energy, p.energy + gained)
                p.last_energy_ts = now if p.energy >= p.max_energy else p.last_energy_ts + gained * interval
        else:
            p.last_energy_ts = now

        await self.save_player(p)
        return p

    async def save_player(self, p: Player) -> None:
        async with aiosqlite.connect(self.path) as conn:
            await conn.execute(
                """
                INSERT INTO players (
                    telegram_id, username, level, xp, shifts, click_power,
                    energy, max_energy, last_energy_ts, last_click_ts, last_coffee_ts,
                    warnings, banned_until, karma, rub, usd, btc, eur, safe_rub, property_tier, ore_stock
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(telegram_id) DO UPDATE SET
                    username=excluded.username, level=excluded.level, xp=excluded.xp,
                    shifts=excluded.shifts, click_power=excluded.click_power,
                    energy=excluded.energy, last_energy_ts=excluded.last_energy_ts,
                    last_click_ts=excluded.last_click_ts, last_coffee_ts=excluded.last_coffee_ts,
                    warnings=excluded.warnings, banned_until=excluded.banned_until,
                    karma=excluded.karma, rub=excluded.rub, usd=excluded.usd,
                    btc=excluded.btc, eur=excluded.eur, safe_rub=excluded.safe_rub,
                    property_tier=excluded.property_tier, ore_stock=excluded.ore_stock
                """,
                (
                    p.telegram_id, p.username, p.level, p.xp, p.shifts, p.click_power,
                    p.energy, p.max_energy, p.last_energy_ts, p.last_click_ts, p.last_coffee_ts,
                    p.warnings, p.banned_until, p.karma, p.rub, p.usd, p.btc, p.eur,
                    p.safe_rub, p.property_tier, p.ore_stock,
                ),
            )
            await conn.commit()


async def issue_warning(db: Database, p: Player, reason: str) -> str:
    p.warnings += 1
    if p.warnings >= 3:
        p.warnings = 3
        p.banned_until = time.time() + BAN_DURATION_SEC
        await db.save_player(p)
        return f"⛔ Варн 3/3 ({reason}). Аккаунт заблокирован (BANNED) на 24 часа."
    await db.save_player(p)
    return f"⚠️ Варн [{p.warnings}/3]: {reason}"


async def click_work_shift(db: Database, p: Player) -> Tuple[bool, str]:
    now = time.time()
    if p.last_click_ts > 0 and (now - p.last_click_ts) < UI_CLICK_DELAY_SEC:
        wait = UI_CLICK_DELAY_SEC - (now - p.last_click_ts)
        return False, f"⏳ Анти-бот задержка UI: подождите {wait:.1f}с"
    if p.energy < 20:
        return False, f"⚡ Недостаточно энергии (нужно 20⚡, есть {p.energy}⚡)."

    mult = 1.0 + (p.click_power - 1) * 0.15 + (p.level - 1) * 0.05
    base_pay = 50 + min(99_950, p.shifts * 350)
    earned = int(round(base_pay * mult))
    xp_gain = 16 + p.level * 4

    p.energy -= 20
    p.last_click_ts = now
    p.shifts += 1
    p.rub += earned
    p.karma += 1
    p.xp += xp_gain
    leveled_up = False
    while p.xp >= p.xp_needed():
        p.xp -= p.xp_needed()
        p.level += 1
        leveled_up = True

    await db.save_player(p)
    lvl_note = f"\n🎉 Новый уровень персонажа: <b>{p.level}</b>!" if leveled_up else ""
    return True, f"💼 Смена выполнена: <b>+{earned:,} RUB</b> · +{xp_gain} XP (-20⚡){lvl_note}"


async def click_mine_ore(db: Database, p: Player) -> Tuple[bool, str]:
    now = time.time()
    if p.last_click_ts > 0 and (now - p.last_click_ts) < UI_CLICK_DELAY_SEC:
        wait = UI_CLICK_DELAY_SEC - (now - p.last_click_ts)
        return False, f"⏳ Анти-бот задержка UI: подождите {wait:.1f}с"
    if p.energy < 2:
        return False, "⚡ Для удара киркой нужно 2⚡."

    qty = random.randint(1, min(25, 4 + p.click_power * 2))
    p.energy -= 2
    p.last_click_ts = now
    p.ore_stock += qty
    p.xp += 10
    while p.xp >= p.xp_needed():
        p.xp -= p.xp_needed()
        p.level += 1
    await db.save_player(p)
    return True, f"⛏ Удар киркой (-2⚡): добыто <b>{qty} шт.</b> руды (на складе: {p.ore_stock} шт.)"


async def drink_coffee(db: Database, p: Player) -> Tuple[bool, str]:
    now = time.time()
    if p.property_tier < 1:
        return False, "☕ Бесплатный кофе доступен от жилья «Студия» и выше."
    if p.last_coffee_ts > 0 and (now - p.last_coffee_ts) < COFFEE_COOLDOWN_SEC:
        hours = math.ceil((COFFEE_COOLDOWN_SEC - (now - p.last_coffee_ts)) / 3600)
        return False, f"☕ Домашний кофе будет готов через ~{hours} ч."
    p.energy = min(p.max_energy, p.energy + 25)
    p.last_coffee_ts = now
    await db.save_player(p)
    return True, f"☕ Бесплатный домашний кофе выпит! Энергия: <b>{p.energy}/{p.max_energy}⚡</b>"
