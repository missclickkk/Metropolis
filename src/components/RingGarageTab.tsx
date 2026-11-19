import { useState } from 'react';
import { Car, Flag, Wrench, Gauge } from 'lucide-react';
import { CARS } from '../game/catalog';
import type { PlayerState } from '../game/types';
import { fmtRub } from './format';

interface RingGarageTabProps {
  state: PlayerState;
  onBuyCar: (carId: string) => void;
  onSelectCar: (carId: string) => void;
  onRepairCar: (carId: string) => void;
  onRunRace: (mode: 'pve' | 'pvp', betRub: number) => void;
}

export function RingGarageTab({
  state,
  onBuyCar,
  onSelectCar,
  onRepairCar,
  onRunRace,
}: RingGarageTabProps) {
  const [raceBet, setRaceBet] = useState('5000');

  const activeOwned = state.garage.find((c) => c.carId === state.activeCarId) ?? null;
  const activeDef = activeOwned ? CARS.find((c) => c.id === activeOwned.carId) ?? null : null;

  return (
    <div className="space-y-6">
      <div className="border-b border-white/[0.08] pb-4">
        <h2 className="font-display text-2xl font-bold text-white">Ринг & Гараж</h2>
        <p className="text-xs text-[#8C96A9]">
          20 автомобилей (ВАЗ-2107 → Koenigsegg Jesko) · Трек «Метрополис Ринг» (PvE и PvP дуэли, комиссия 5%, риск ДПС 25% и аварий)
        </p>
      </div>

      {/* Top Row: Racing Track + Active Garage */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="lg:col-span-7 rounded-xl border border-white/[0.08] bg-[#12161E] p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Flag className="h-5 w-5 text-[#D4A853]" aria-hidden="true" />
            <h3 className="font-display text-xl font-bold text-white">Гоночный трек «Метрополис Ринг»</h3>
          </div>

          {activeDef && activeOwned ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-y border-white/[0.07] py-4">
                <div>
                  <p className="text-xs text-[#8C96A9]">Болид на старте (Тир {activeDef.tier}/20)</p>
                  <p className="font-display text-2xl font-bold text-white">{activeDef.name}</p>
                  <p className="font-mono-num mt-1 text-xs text-[#A3ACBE]">
                    Скорость {activeDef.speed} · Управляемость {activeDef.handling} · Побед {activeOwned.wins}/{activeOwned.races}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#8C96A9]">Состояние</p>
                  <p
                    className={`font-mono-num text-xl font-bold ${
                      activeOwned.conditionPct < 40 ? 'text-[#E11D48]' : 'text-[#10B981]'
                    }`}
                  >
                    {activeOwned.conditionPct}%
                  </p>
                  {activeOwned.conditionPct < 100 && (
                    <button
                      type="button"
                      onClick={() => onRepairCar(activeDef.id)}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#D4A853] hover:underline"
                    >
                      <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Ремонт</span>
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-[#8C96A9]" htmlFor="race-bet-input">
                  Ставка на заезд (RUB)
                </label>
                <input
                  id="race-bet-input"
                  type="number"
                  min={1000}
                  value={raceBet}
                  onChange={(e) => setRaceBet(e.target.value)}
                  className="w-full rounded-lg border border-white/12 bg-[#0D1017] px-3.5 py-2.5 font-mono-num text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => onRunRace('pve', Number(raceBet))}
                  className="flex min-h-[46px] items-center justify-center gap-2 rounded-lg bg-[#D4A853] px-4 py-2.5 text-sm font-bold text-[#0A0C10]"
                >
                  <Gauge className="h-4 w-4" aria-hidden="true" />
                  <span>Заезд PvE (против бота)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRunRace('pvp', Number(raceBet))}
                  className="flex min-h-[46px] items-center justify-center gap-2 rounded-lg border border-white/12 bg-[#181D27] px-4 py-2.5 text-sm font-semibold text-white hover:border-[#D4A853]"
                >
                  <Flag className="h-4 w-4 text-[#E11D48]" aria-hidden="true" />
                  <span>Дуэль PvP (комиссия 5%)</span>
                </button>
              </div>
            </div>
          ) : (
            <p className="py-6 text-sm text-[#8C96A9]">
              У вас еще нет автомобиля. Приобретите первый автомобиль (от ВАЗ-2107 за 18,000 ₽) в автосалоне ниже, чтобы выйти на трек.
            </p>
          )}
        </section>

        {/* Owned Garage */}
        <section className="lg:col-span-5 rounded-xl border border-white/[0.08] bg-[#12161E] p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2">
            <Car className="h-5 w-5 text-[#D4A853]" aria-hidden="true" />
            <h3 className="font-display text-xl font-bold text-white">Ваш гараж ({state.garage.length}/20)</h3>
          </div>
          {state.garage.length === 0 ? (
            <p className="py-6 text-xs text-[#8C96A9]">Гараж пуст.</p>
          ) : (
            <div className="max-h-64 divide-y divide-white/[0.06] overflow-y-auto pr-1">
              {state.garage.map((owned) => {
                const def = CARS.find((c) => c.id === owned.carId)!;
                const isSelected = state.activeCarId === owned.carId;
                return (
                  <div key={owned.carId} className="flex items-center justify-between gap-2 py-2.5">
                    <div>
                      <p className="text-sm font-semibold text-white">{def.name}</p>
                      <p className="font-mono-num text-xs text-[#8C96A9]">
                        Сост. {owned.conditionPct}% · Побед {owned.wins}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectCar(owned.carId)}
                      className={`min-h-[34px] rounded-md px-3 py-1 text-xs font-bold whitespace-nowrap ${
                        isSelected
                          ? 'bg-[#D4A853] text-[#0A0C10]'
                          : 'bg-[#1F2635] text-white hover:bg-[#2A3347]'
                      }`}
                    >
                      {isSelected ? 'Выбран' : 'На старт'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* 20-Car Dealership */}
      <section className="rounded-xl border border-white/[0.08] bg-[#12161E] p-5 sm:p-6">
        <h3 className="font-display mb-4 text-xl font-bold text-white">Автосалон Метрополиса (20 моделей)</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CARS.map((car) => {
            const owned = state.garage.some((g) => g.carId === car.id);
            return (
              <div
                key={car.id}
                className="flex flex-col justify-between rounded-lg border border-white/[0.08] bg-[#161B25] p-4"
              >
                <div>
                  <p className="text-xs text-[#8C96A9]">Тир {car.tier}</p>
                  <p className="text-sm font-bold text-white">{car.name}</p>
                  <p className="mt-1 font-mono-num text-xs text-[#A3ACBE]">
                    Скорость {car.speed} · Управл. {car.handling}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={owned}
                  onClick={() => onBuyCar(car.id)}
                  className="mt-3 min-h-[38px] w-full rounded-lg bg-[#202736] px-3 py-2 font-mono-num text-xs font-bold text-white hover:bg-[#D4A853] hover:text-[#0A0C10] disabled:opacity-45"
                >
                  {owned ? 'В гараже' : fmtRub(car.costRub)}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
