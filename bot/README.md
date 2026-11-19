# METROPOLIS v3.0 — Telegram Bot (`aiogram 3.x`)

Полноценный Telegram-бот с inline-кликером, защитой от автокликеров (`0.5s` Rate-Limit + `1.5s` UI cooldown + система варнов `3/3` -> бан 24ч) и кнопкой запуска полного **Telegram Mini App** (`WebAppInfo`).

## Быстрый запуск

```bash
cd bot
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

export BOT_TOKEN="ваш_токен_от_BotFather"
export MINI_APP_URL="https://<ваш-ник>.github.io/<репозиторий>/"
export CREATOR_TELEGRAM_ID="630771271"

python main.py
```
