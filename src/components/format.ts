export function fmtRub(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} млрд ₽`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} млн ₽`;
  return `${Math.round(value).toLocaleString('ru-RU')} ₽`;
}

export function fmtNum(value: number): string {
  return Math.round(value).toLocaleString('ru-RU');
}

export function fmtUsd(value: number): string {
  return `$${value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}`;
}

export function fmtEur(value: number): string {
  return `€${value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}`;
}

export function fmtBtc(value: number): string {
  return `${value.toFixed(5)} BTC`;
}

export function fmtCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}ч ${String(m).padStart(2, '0')}м`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
