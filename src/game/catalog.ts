import type {
  AutoDrillDef,
  BusinessDef,
  CarDef,
  DistrictDef,
  EducationLevel,
  FactionDef,
  MiningPoolDef,
  OreTierDef,
  PressDef,
  ProfessionDef,
  PropertyDef,
} from './types';

export const CREATOR_TELEGRAM_ID = '630771271';
export const TELEGRAM_MINI_APP_LINK = 'https://t.me/Metrop0lis_bot/myapp';

// Currency exchange base rates (in RUB)
export const EXCHANGE_RATES_RUB = {
  RUB: 1,
  USD: 95,
  EUR: 104,
  BTC: 8_400_000,
} as const;

export const EDUCATION_CATALOG: {
  id: EducationLevel;
  name: string;
  costRub: number;
  minKarma: number;
}[] = [
  { id: 'none', name: 'Без диплома', costRub: 0, minKarma: -999999 },
  { id: 'college', name: 'Колледж Метрополиса', costRub: 15_000, minKarma: 5 },
  { id: 'bachelor', name: 'Госуниверситет (Бакалавр)', costRub: 120_000, minKarma: 25 },
  { id: 'mba', name: 'Финансовая Академия MBA', costRub: 850_000, minKarma: 75 },
  { id: 'academy', name: 'Академия Госслужбы', costRub: 4_500_000, minKarma: 200 },
];

// 16 Legal Professions (50 RUB -> 100k RUB) + 7 Illegal Professions (100k -> 2.5M RUB)
export const PROFESSIONS: ProfessionDef[] = [
  // 16 Legal
  { id: 'flyer', name: 'Листовщик', type: 'legal', payRub: 50, energyCost: 20, minExperience: 0, minKarma: null, maxKarma: null, xpGain: 12, karmaDelta: 1 },
  { id: 'courier', name: 'Курьер', type: 'legal', payRub: 180, energyCost: 20, minExperience: 2, minKarma: 0, maxKarma: null, xpGain: 18, karmaDelta: 1 },
  { id: 'barista', name: 'Бариста', type: 'legal', payRub: 420, energyCost: 20, minExperience: 5, minKarma: 2, maxKarma: null, xpGain: 24, karmaDelta: 2 },
  { id: 'taxi', name: 'Водитель такси', type: 'legal', payRub: 850, energyCost: 20, minExperience: 9, minKarma: 4, maxKarma: null, xpGain: 30, karmaDelta: 2 },
  { id: 'mechanic', name: 'Автомеханик', type: 'legal', payRub: 1_500, energyCost: 20, minExperience: 14, minKarma: 6, maxKarma: null, requiredEducation: 'college', xpGain: 40, karmaDelta: 2 },
  { id: 'manager', name: 'Менеджер продаж', type: 'legal', payRub: 2_800, energyCost: 20, minExperience: 20, minKarma: 10, maxKarma: null, requiredEducation: 'college', xpGain: 52, karmaDelta: 3 },
  { id: 'accountant', name: 'Бухгалтер', type: 'legal', payRub: 4_600, energyCost: 20, minExperience: 28, minKarma: 15, maxKarma: null, requiredEducation: 'college', xpGain: 66, karmaDelta: 3 },
  { id: 'engineer', name: 'Инженер-технолог', type: 'legal', payRub: 7_500, energyCost: 20, minExperience: 36, minKarma: 25, maxKarma: null, requiredEducation: 'bachelor', xpGain: 80, karmaDelta: 4 },
  { id: 'developer', name: 'Senior Разработчик', type: 'legal', payRub: 12_500, energyCost: 20, minExperience: 46, minKarma: 30, maxKarma: null, requiredEducation: 'bachelor', xpGain: 98, karmaDelta: 4 },
  { id: 'lawyer', name: 'Корпоративный юрист', type: 'legal', payRub: 19_000, energyCost: 20, minExperience: 58, minKarma: 45, maxKarma: null, requiredEducation: 'bachelor', xpGain: 120, karmaDelta: 5 },
  { id: 'surgeon', name: 'Главный хирург', type: 'legal', payRub: 28_000, energyCost: 20, minExperience: 72, minKarma: 65, maxKarma: null, requiredEducation: 'bachelor', xpGain: 145, karmaDelta: 6 },
  { id: 'fin_director', name: 'Финансовый директор', type: 'legal', payRub: 42_000, energyCost: 20, minExperience: 90, minKarma: 90, maxKarma: null, requiredEducation: 'mba', xpGain: 180, karmaDelta: 6 },
  { id: 'banker', name: 'Инвестбанкир', type: 'legal', payRub: 58_000, energyCost: 20, minExperience: 112, minKarma: 120, maxKarma: null, requiredEducation: 'mba', xpGain: 220, karmaDelta: 7 },
  { id: 'prosecutor', name: 'Городской прокурор', type: 'legal', payRub: 72_000, energyCost: 20, minExperience: 138, minKarma: 160, maxKarma: null, requiredEducation: 'academy', xpGain: 265, karmaDelta: 9 },
  { id: 'mayor_deputy', name: 'Зам. Мэра', type: 'legal', payRub: 86_000, energyCost: 20, minExperience: 170, minKarma: 210, maxKarma: null, requiredEducation: 'academy', xpGain: 310, karmaDelta: 10 },
  { id: 'minister', name: 'Министр Экономики', type: 'legal', payRub: 100_000, energyCost: 20, minExperience: 210, minKarma: 260, maxKarma: null, requiredEducation: 'academy', xpGain: 380, karmaDelta: 12 },

  // 7 Illegal (100k -> 2.5M RUB)
  { id: 'speculator', name: 'Спекулянт', type: 'illegal', payRub: 100_000, energyCost: 20, minExperience: 10, minKarma: null, maxKarma: -1, requiresBlackMarketGear: true, xpGain: 90, karmaDelta: -8 },
  { id: 'smuggler', name: 'Контрабандист', type: 'illegal', payRub: 240_000, energyCost: 20, minExperience: 25, minKarma: null, maxKarma: -25, requiresBlackMarketGear: true, xpGain: 140, karmaDelta: -14 },
  { id: 'counterfeiter', name: 'Фальшивомонетчик', type: 'illegal', payRub: 480_000, energyCost: 20, minExperience: 45, minKarma: null, maxKarma: -60, requiresBlackMarketGear: true, xpGain: 210, karmaDelta: -22 },
  { id: 'arms_dealer', name: 'Торговец оружием', type: 'illegal', payRub: 850_000, energyCost: 20, minExperience: 70, minKarma: null, maxKarma: -110, requiresBlackMarketGear: true, xpGain: 290, karmaDelta: -30 },
  { id: 'burglar', name: 'Взломщик хранилищ', type: 'illegal', payRub: 1_300_000, energyCost: 20, minExperience: 100, minKarma: null, maxKarma: -180, requiresBlackMarketGear: true, xpGain: 380, karmaDelta: -40 },
  { id: 'hacker', name: 'Кибер-Хакер Синдиката', type: 'illegal', payRub: 1_850_000, energyCost: 20, minExperience: 140, minKarma: null, maxKarma: -260, requiresBlackMarketGear: true, xpGain: 490, karmaDelta: -55 },
  { id: 'pharma_shadow', name: 'Теневые лекарства', type: 'illegal', payRub: 2_500_000, energyCost: 20, minExperience: 190, minKarma: null, maxKarma: -380, requiresBlackMarketGear: true, xpGain: 640, karmaDelta: -75 },
];

// 18 Legal Businesses (Ларёк -> Космодром) + 6 Illegal Syndicates (USD)
export const BUSINESSES: BusinessDef[] = [
  // 18 Legal
  { id: 'kiosk', name: 'Уличный ларёк', type: 'legal', costRub: 2_500, hourlyIncome: 380, currency: 'RUB', requiredKarma: 'any' },
  { id: 'coffee_point', name: 'Кофе-точка', type: 'legal', costRub: 12_000, hourlyIncome: 1_650, currency: 'RUB', requiredKarma: 'any' },
  { id: 'barbershop', name: 'Барбершоп', type: 'legal', costRub: 45_000, hourlyIncome: 5_200, currency: 'RUB', requiredKarma: 'any' },
  { id: 'carwash', name: 'Автомойка 24/7', type: 'legal', costRub: 140_000, hourlyIncome: 14_500, currency: 'RUB', requiredKarma: 'any' },
  { id: 'bakery', name: 'Сеть пекарен', type: 'legal', costRub: 420_000, hourlyIncome: 39_000, currency: 'RUB', requiredKarma: 'any' },
  { id: 'fitness', name: 'Фитнес-клуб', type: 'legal', costRub: 1_100_000, hourlyIncome: 95_000, currency: 'RUB', requiredKarma: 'any' },
  { id: 'restaurant', name: 'Панорамный ресторан', type: 'legal', costRub: 2_800_000, hourlyIncome: 225_000, currency: 'RUB', requiredKarma: 'positive' },
  { id: 'logistics', name: 'Логистический хаб', type: 'legal', costRub: 6_500_000, hourlyIncome: 490_000, currency: 'RUB', requiredKarma: 'positive' },
  { id: 'clinic', name: 'Частная клиника', type: 'legal', costRub: 14_000_000, hourlyIncome: 1_020_000, currency: 'RUB', requiredKarma: 'positive' },
  { id: 'hotel', name: 'Бутик-отель 5★', type: 'legal', costRub: 32_000_000, hourlyIncome: 2_250_000, currency: 'RUB', requiredKarma: 'positive' },
  { id: 'mall', name: 'Торговый центр', type: 'legal', costRub: 75_000_000, hourlyIncome: 5_100_000, currency: 'RUB', requiredKarma: 'positive' },
  { id: 'it_corp', name: 'IT-Корпорация', type: 'legal', costRub: 160_000_000, hourlyIncome: 10_600_000, currency: 'RUB', requiredKarma: 'positive' },
  { id: 'factory', name: 'Завод электроники', type: 'legal', costRub: 350_000_000, hourlyIncome: 22_000_000, currency: 'RUB', requiredKarma: 'positive' },
  { id: 'media_holding', name: 'Медиахолдинг', type: 'legal', costRub: 720_000_000, hourlyIncome: 43_000_000, currency: 'RUB', requiredKarma: 'positive' },
  { id: 'airline', name: 'Авиакомпания', type: 'legal', costRub: 1_500_000_000, hourlyIncome: 86_000_000, currency: 'RUB', requiredKarma: 'positive' },
  { id: 'bank_chain', name: 'Коммерческий банк', type: 'legal', costRub: 3_200_000_000, hourlyIncome: 175_000_000, currency: 'RUB', requiredKarma: 'positive' },
  { id: 'energy_grid', name: 'Энергокорпорация', type: 'legal', costRub: 7_500_000_000, hourlyIncome: 390_000_000, currency: 'RUB', requiredKarma: 'positive' },
  { id: 'spaceport', name: 'Частный космодром', type: 'legal', costRub: 18_000_000_000, hourlyIncome: 920_000_000, currency: 'RUB', requiredKarma: 'positive' },

  // 6 Illegal Syndicates (USD payouts)
  { id: 'syn_cards', name: 'Подпольный покер-рум', type: 'illegal', costRub: 900_000, hourlyIncome: 1_250, currency: 'USD', requiredKarma: 'negative' },
  { id: 'syn_docks', name: 'Контрабандный док', type: 'illegal', costRub: 8_500_000, hourlyIncome: 11_400, currency: 'USD', requiredKarma: 'negative' },
  { id: 'syn_mint', name: 'Подпольная типография', type: 'illegal', costRub: 45_000_000, hourlyIncome: 58_000, currency: 'USD', requiredKarma: 'negative' },
  { id: 'syn_cyber', name: 'Офшорный кибер-синдикат', type: 'illegal', costRub: 220_000_000, hourlyIncome: 270_000, currency: 'USD', requiredKarma: 'negative' },
  { id: 'syn_arms', name: 'Теневой арсенал', type: 'illegal', costRub: 1_100_000_000, hourlyIncome: 1_280_000, currency: 'USD', requiredKarma: 'negative' },
  { id: 'syn_shadow_hq', name: 'Картель «Метрополис»', type: 'illegal', costRub: 5_500_000_000, hourlyIncome: 6_200_000, currency: 'USD', requiredKarma: 'negative' },
];

// 7 Printing Presses (require ore from mine)
export const PRINTING_PRESSES: PressDef[] = [
  { id: 'press_1', name: 'Станок МП-1 «Искра»', costRub: 18_000, orePerCycle: 5, minOreTier: 1, rubPerCycle: 1_400 },
  { id: 'press_2', name: 'Офсетный пресс «Вектор»', costRub: 85_000, orePerCycle: 12, minOreTier: 2, rubPerCycle: 6_500 },
  { id: 'press_3', name: 'Роторный блок «Монолит»', costRub: 340_000, orePerCycle: 20, minOreTier: 3, rubPerCycle: 24_000 },
  { id: 'press_4', name: 'Линия «Металлография»', costRub: 1_450_000, orePerCycle: 35, minOreTier: 4, rubPerCycle: 92_000 },
  { id: 'press_5', name: 'Гознак-Автомат PRO', costRub: 6_200_000, orePerCycle: 50, minOreTier: 5, rubPerCycle: 380_000 },
  { id: 'press_6', name: 'Крио-Чеканка «Аврора»', costRub: 28_000_000, orePerCycle: 75, minOreTier: 6, rubPerCycle: 1_650_000 },
  { id: 'press_7', name: 'Квантовый Монетный Двор', costRub: 140_000_000, orePerCycle: 120, minOreTier: 8, rubPerCycle: 8_200_000 },
];

// 8 Bitcoin Mining Pools (GBMiners ... JetPool)
export const MINING_POOLS: MiningPoolDef[] = [
  { id: 'gbminers', name: 'GBMiners', costRub: 65_000, btcPerHourPerRack: 0.00018, powerKwPerRack: 1.4 },
  { id: 'antnode', name: 'AntNode Pool', costRub: 190_000, btcPerHourPerRack: 0.00052, powerKwPerRack: 2.2 },
  { id: 'sibhash', name: 'SibHash Grid', costRub: 540_000, btcPerHourPerRack: 0.00145, powerKwPerRack: 3.5 },
  { id: 'foundryx', name: 'FoundryX', costRub: 1_600_000, btcPerHourPerRack: 0.0041, powerKwPerRack: 5.0 },
  { id: 'viablock', name: 'ViaBlock Pro', costRub: 4_800_000, btcPerHourPerRack: 0.0118, powerKwPerRack: 7.4 },
  { id: 'luxorcore', name: 'LuxorCore', costRub: 14_500_000, btcPerHourPerRack: 0.034, powerKwPerRack: 11.0 },
  { id: 'titanmesh', name: 'TitanMesh ASIC', costRub: 42_000_000, btcPerHourPerRack: 0.095, powerKwPerRack: 16.5 },
  { id: 'jetpool', name: 'JetPool', costRub: 125_000_000, btcPerHourPerRack: 0.28, powerKwPerRack: 24.0 },
];

// 10 Ore Tiers (2⚡ per hit, 1-25 units)
export const ORE_TIERS: OreTierDef[] = [
  { tier: 1, id: 'coal', name: 'Угольная порода', basePriceRub: 18, dropWeight: 34, color: '#9CA3AF' },
  { tier: 2, id: 'iron', name: 'Железная руда', basePriceRub: 42, dropWeight: 24, color: '#CBD5E1' },
  { tier: 3, id: 'copper', name: 'Медный колчедан', basePriceRub: 88, dropWeight: 16, color: '#D97706' },
  { tier: 4, id: 'silver', name: 'Серебряная жила', basePriceRub: 195, dropWeight: 10, color: '#E2E8F0' },
  { tier: 5, id: 'gold', name: 'Золотой самородок', basePriceRub: 440, dropWeight: 6.5, color: '#F59E0B' },
  { tier: 6, id: 'titanium', name: 'Титановый сплав', basePriceRub: 960, dropWeight: 4.0, color: '#60A5FA' },
  { tier: 7, id: 'platinum', name: 'Платиновый концентрат', basePriceRub: 2_200, dropWeight: 2.5, color: '#93C5FD' },
  { tier: 8, id: 'emerald', name: 'Изумрудный кристалл', basePriceRub: 5_400, dropWeight: 1.5, color: '#10B981' },
  { tier: 9, id: 'rhodium', name: 'Родий-99', basePriceRub: 13_500, dropWeight: 1.0, color: '#F472B6' },
  { tier: 10, id: 'aetherium', name: 'Метрополит (Тир 10)', basePriceRub: 36_000, dropWeight: 0.5, color: '#D4A853' },
];

// 4 Auto-Drills («Крот», «Витязь», «Урал», «Титан») — stop after 6h, fuel & crown wear
export const AUTO_DRILLS: AutoDrillDef[] = [
  { id: 'krot', name: 'Авто-бур «Крот»', costRub: 45_000, orePerHour: 48, fuelCostRub: 3_200, wearPerHour: 11, maxHours: 6, maxOreTier: 4 },
  { id: 'vityaz', name: 'Авто-бур «Витязь»', costRub: 280_000, orePerHour: 115, fuelCostRub: 14_000, wearPerHour: 10, maxHours: 6, maxOreTier: 6 },
  { id: 'ural', name: 'Авто-бур «Урал»', costRub: 1_900_000, orePerHour: 240, fuelCostRub: 58_000, wearPerHour: 9, maxHours: 6, maxOreTier: 8 },
  { id: 'titan', name: 'Авто-бур «Титан»', costRub: 12_500_000, orePerHour: 520, fuelCostRub: 240_000, wearPerHour: 8, maxHours: 6, maxOreTier: 10 },
];

// 20 Cars (ВАЗ-2107 -> Koenigsegg Jesko)
export const CARS: CarDef[] = [
  { id: 'vaz_2107', name: 'ВАЗ-2107', tier: 1, costRub: 18_000, speed: 42, handling: 38, repairBaseRub: 2_500 },
  { id: 'lada_priora', name: 'Lada Priora', tier: 2, costRub: 48_000, speed: 50, handling: 45, repairBaseRub: 5_000 },
  { id: 'kia_rio', name: 'Kia Rio', tier: 3, costRub: 125_000, speed: 56, handling: 54, repairBaseRub: 11_000 },
  { id: 'vw_polo', name: 'Volkswagen Polo GT', tier: 4, costRub: 240_000, speed: 62, handling: 60, repairBaseRub: 18_000 },
  { id: 'toyota_camry', name: 'Toyota Camry V6', tier: 5, costRub: 490_000, speed: 68, handling: 64, repairBaseRub: 32_000 },
  { id: 'bmw_330i', name: 'BMW 330i M-Sport', tier: 6, costRub: 980_000, speed: 74, handling: 73, repairBaseRub: 60_000 },
  { id: 'audi_s5', name: 'Audi S5 Coupe', tier: 7, costRub: 1_850_000, speed: 79, handling: 78, repairBaseRub: 95_000 },
  { id: 'mb_e63', name: 'Mercedes-AMG E63 S', tier: 8, costRub: 3_600_000, speed: 84, handling: 80, repairBaseRub: 165_000 },
  { id: 'bmw_m5cs', name: 'BMW M5 CS', tier: 9, costRub: 6_800_000, speed: 88, handling: 85, repairBaseRub: 280_000 },
  { id: 'nissan_gtr', name: 'Nissan GT-R Nismo', tier: 10, costRub: 12_000_000, speed: 91, handling: 88, repairBaseRub: 440_000 },
  { id: 'porsche_911', name: 'Porsche 911 Turbo S', tier: 11, costRub: 21_000_000, speed: 94, handling: 93, repairBaseRub: 720_000 },
  { id: 'audi_r8', name: 'Audi R8 V10 Performance', tier: 12, costRub: 34_000_000, speed: 96, handling: 92, repairBaseRub: 1_100_000 },
  { id: 'mclaren_720s', name: 'McLaren 720S', tier: 13, costRub: 56_000_000, speed: 99, handling: 96, repairBaseRub: 1_750_000 },
  { id: 'ferrari_sf90', name: 'Ferrari SF90 Stradale', tier: 14, costRub: 92_000_000, speed: 103, handling: 98, repairBaseRub: 2_800_000 },
  { id: 'lambo_revuelto', name: 'Lamborghini Revuelto', tier: 15, costRub: 145_000_000, speed: 106, handling: 100, repairBaseRub: 4_200_000 },
  { id: 'aston_valkyrie', name: 'Aston Martin Valkyrie', tier: 16, costRub: 240_000_000, speed: 110, handling: 106, repairBaseRub: 6_800_000 },
  { id: 'pagani_utopia', name: 'Pagani Utopia', tier: 17, costRub: 390_000_000, speed: 113, handling: 108, repairBaseRub: 10_500_000 },
  { id: 'bugatti_chiron', name: 'Bugatti Chiron Super Sport', tier: 18, costRub: 650_000_000, speed: 118, handling: 110, repairBaseRub: 17_000_000 },
  { id: 'rimac_nevera', name: 'Rimac Nevera R', tier: 19, costRub: 1_100_000_000, speed: 122, handling: 114, repairBaseRub: 26_000_000 },
  { id: 'koenigsegg_jesko', name: 'Koenigsegg Jesko', tier: 20, costRub: 1_950_000_000, speed: 128, handling: 120, repairBaseRub: 45_000_000 },
];

// 10 Real Estate properties (Хостел -> Частный остров, up to +100% energy regen, Studio+ unlocks free coffee)
export const PROPERTIES: PropertyDef[] = [
  { id: 'hostel', name: 'Койка в хостеле', costRub: 0, regenBonusPct: 0, unlocksCoffee: false, prestigeBonus: 0 },
  { id: 'studio', name: 'Студия на окраине', costRub: 25_000, regenBonusPct: 10, unlocksCoffee: true, prestigeBonus: 1 },
  { id: 'flat_1', name: 'Однушка у метро', costRub: 120_000, regenBonusPct: 20, unlocksCoffee: true, prestigeBonus: 2 },
  { id: 'loft', name: 'Дизайнерский лофт', costRub: 650_000, regenBonusPct: 30, unlocksCoffee: true, prestigeBonus: 3 },
  { id: 'business_flat', name: 'Апартаменты Бизнес-класса', costRub: 3_200_000, regenBonusPct: 42, unlocksCoffee: true, prestigeBonus: 4 },
  { id: 'townhouse', name: 'Таунхаус в парке', costRub: 16_000_000, regenBonusPct: 55, unlocksCoffee: true, prestigeBonus: 5 },
  { id: 'penthouse', name: 'Пентхаус Сити-Тауэр', costRub: 75_000_000, regenBonusPct: 68, unlocksCoffee: true, prestigeBonus: 6 },
  { id: 'villa', name: 'Вилла у залива', costRub: 320_000_000, regenBonusPct: 80, unlocksCoffee: true, prestigeBonus: 7 },
  { id: 'estate', name: 'Загородная резиденция', costRub: 1_400_000_000, regenBonusPct: 90, unlocksCoffee: true, prestigeBonus: 8 },
  { id: 'private_island', name: 'Частный остров', costRub: 6_500_000_000, regenBonusPct: 100, unlocksCoffee: true, prestigeBonus: 10 },
];

// 4 City Factions
export const FACTIONS: FactionDef[] = [
  {
    id: 'government',
    name: 'Правительство & Мэрия',
    alignment: 'Легал / Власть',
    summary: 'Снижает налог на бизнес на 5% и открывает приоритетный доступ к госзаказам руды.',
    perkShort: '-5% налог бизнеса · Госзаказы руды',
    karmaRequirement: 'positive',
  },
  {
    id: 'consortium',
    name: 'Финансовый Консорциум',
    alignment: 'Легал / Бизнес',
    summary: 'Добавляет +0.25% в день к банковским депозитам и открывает доступ к IPO.',
    perkShort: '+0.25%/день к депозитам · Доступ к IPO',
    karmaRequirement: 'positive',
  },
  {
    id: 'syndicate',
    name: 'Синдикат «Теневой Метрополис»',
    alignment: 'Нелегал / Криминал',
    summary: 'Снижает риск рейда Прокурора на 10% и открывает расширенный доступ к Черному рынку.',
    perkShort: '-10% риск Прокурора · Черный рынок',
    karmaRequirement: 'negative',
  },
  {
    id: 'miners',
    name: 'Шахтерский Профсоюз',
    alignment: 'Нейтрал / Шахта',
    summary: 'Дает +10% к шансу редкой руды и снижает износ коронок авто-буров на 15%.',
    perkShort: '+10% к редкой руде · -15% износ буров',
    karmaRequirement: 'any',
  },
];

// 5 City Districts for Turf Wars (3% of district deal volume)
export const INITIAL_DISTRICTS: DistrictDef[] = [
  { id: 'downtown', name: 'Финансовый Центр', dailyVolumeRub: 480_000_000, controllingClan: 'AURELIA CORP', defensePower: 68 },
  { id: 'port', name: 'Южный Порт', dailyVolumeRub: 310_000_000, controllingClan: 'ТЕНИ ДОКОВ', defensePower: 52 },
  { id: 'industrial', name: 'Промзона «Сталь»', dailyVolumeRub: 220_000_000, controllingClan: 'ПРОФСОЮЗ-1', defensePower: 40 },
  { id: 'ring_quarter', name: 'Квартал Ринга', dailyVolumeRub: 275_000_000, controllingClan: 'APEX DRIFT', defensePower: 48 },
  { id: 'old_town', name: 'Старый Город', dailyVolumeRub: 165_000_000, controllingClan: 'СВОБОДНЫЙ', defensePower: 25 },
];

// Prestige I - X thresholds (Net Worth in RUB)
export const PRESTIGE_TIERS: { tier: number; numeral: string; title: string; minNetWorth: number }[] = [
  { tier: 1, numeral: 'I', title: 'Новичок', minNetWorth: 0 },
  { tier: 2, numeral: 'II', title: 'Горожанин', minNetWorth: 50_000 },
  { tier: 3, numeral: 'III', title: 'Предприниматель', minNetWorth: 500_000 },
  { tier: 4, numeral: 'IV', title: 'Финансист', minNetWorth: 3_500_000 },
  { tier: 5, numeral: 'V', title: 'Магнат', minNetWorth: 20_000_000 },
  { tier: 6, numeral: 'VI', title: 'Олигарх', minNetWorth: 120_000_000 },
  { tier: 7, numeral: 'VII', title: 'Сенатор', minNetWorth: 650_000_000 },
  { tier: 8, numeral: 'VIII', title: 'Архонт', minNetWorth: 2_800_000_000 },
  { tier: 9, numeral: 'IX', title: 'Суверен', minNetWorth: 10_000_000_000 },
  { tier: 10, numeral: 'X', title: 'Апекс', minNetWorth: 35_000_000_000 },
];

export const LICENSE_PLATES_SHOWCASE: { code: string; costRub: number; prestigeBonus: string }[] = [
  { code: 'А777АА 77', costRub: 850_000, prestigeBonus: 'Статусный номер центра' },
  { code: 'М001ММ 99', costRub: 4_200_000, prestigeBonus: 'Кортеж Мэрии' },
  { code: 'Х999ХХ 777', costRub: 12_500_000, prestigeBonus: 'Коллекционная серия' },
  { code: 'Е001КХ 01', costRub: 38_000_000, prestigeBonus: 'Спецсерия Президиума' },
];

export const BLACK_MARKET_ROTATION_POOL = [
  { id: 'gear_bundle', name: 'Пакет «Теневой доступ» (Спецсофт + ПК + Документы)', costRub: 180_000, kind: 'gear' as const },
  { id: 'fake_passport', name: 'Отбеливание досье (+35 Кармы)', costRub: 320_000, kind: 'karma_up' as const },
  { id: 'shadow_contract', name: 'Тёмный контракт (-40 Кармы, +95,000 RUB)', costRub: 0, kind: 'karma_down' as const },
  { id: 'rare_ore_crate', name: 'Контрабандный ящик руды (Титаний / Платина)', costRub: 95_000, kind: 'ore_crate' as const },
  { id: 'drill_parts', name: 'Титановые коронки (Ремонт всех буров)', costRub: 42_000, kind: 'drill_fix' as const },
  { id: 'warn_clear', name: 'Юридическая апелляция (-1 Варн)', costRub: 450_000, kind: 'clear_warn' as const },
];

export const ELECTION_CANDIDATES = [
  { id: 'cand_volkov', name: 'А. Волков', platform: 'Пошлина 1.5%, поддержка госзаказов руды (+30%)' },
  { id: 'cand_orlova', name: 'Е. Орлова', platform: 'Стабильный банк 2.0%, субсидии малому бизнесу' },
  { id: 'cand_korshun', name: 'В. Коршун', platform: 'Пошлина 2.8%, жесткий аудит и борьба с картелями' },
];
