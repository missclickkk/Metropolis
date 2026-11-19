export type Currency = 'RUB' | 'USD' | 'BTC' | 'EUR';

export type TabId = 'profile' | 'business' | 'city' | 'garage' | 'dev';

export type CitySubTab = 'bank' | 'realestate' | 'factions' | 'casino' | 'politics';

export type FactionId = 'none' | 'government' | 'consortium' | 'syndicate' | 'miners';

export type EducationLevel = 'none' | 'college' | 'bachelor' | 'mba' | 'academy';

export type ClanRank = 'Рекрут' | 'Боец' | 'Капо' | 'Консильери' | 'Босс';

export interface Wallet {
  RUB: number;
  USD: number;
  BTC: number;
  EUR: number;
}

export interface ProfessionDef {
  id: string;
  name: string;
  type: 'legal' | 'illegal';
  payRub: number;
  energyCost: number;
  minExperience: number;
  minKarma: number | null;
  maxKarma: number | null;
  requiredEducation?: EducationLevel;
  requiresBlackMarketGear?: boolean;
  xpGain: number;
  karmaDelta: number;
}

export interface BusinessDef {
  id: string;
  name: string;
  type: 'legal' | 'illegal';
  costRub: number;
  hourlyIncome: number;
  currency: 'RUB' | 'USD';
  requiredKarma: 'positive' | 'negative' | 'any';
}

export interface PressDef {
  id: string;
  name: string;
  costRub: number;
  orePerCycle: number;
  minOreTier: number;
  rubPerCycle: number;
}

export interface MiningPoolDef {
  id: string;
  name: string;
  costRub: number;
  btcPerHourPerRack: number;
  powerKwPerRack: number;
}

export interface OreTierDef {
  tier: number;
  id: string;
  name: string;
  basePriceRub: number;
  dropWeight: number;
  color: string;
}

export interface AutoDrillDef {
  id: string;
  name: string;
  costRub: number;
  orePerHour: number;
  fuelCostRub: number;
  wearPerHour: number;
  maxHours: number;
  maxOreTier: number;
}

export interface CarDef {
  id: string;
  name: string;
  tier: number;
  costRub: number;
  speed: number;
  handling: number;
  repairBaseRub: number;
}

export interface PropertyDef {
  id: string;
  name: string;
  costRub: number;
  regenBonusPct: number;
  unlocksCoffee: boolean;
  prestigeBonus: number;
}

export interface FactionDef {
  id: Exclude<FactionId, 'none'>;
  name: string;
  alignment: string;
  summary: string;
  perkShort: string;
  karmaRequirement: 'positive' | 'negative' | 'any';
}

export interface DistrictDef {
  id: string;
  name: string;
  dailyVolumeRub: number;
  controllingClan: string;
  defensePower: number;
}

export interface OwnedAutoDrill {
  drillId: string;
  active: boolean;
  startedAt: number;
  lastCollectedAt: number;
  fuelPct: number; // 0-100
  wearPct: number; // 0-100 (100 = broken crown)
  needsInspection: boolean;
}

export interface OwnedCar {
  carId: string;
  conditionPct: number; // 0-100
  wins: number;
  races: number;
}

export interface ClanState {
  name: string;
  tag: string;
  rank: ClanRank;
  taxPct: number; // 0-10
  hqLevel: number; // 1-10
  treasuryRub: number;
  membersCount: number;
  controlledDistricts: string[];
}

export interface PoliticsState {
  presidentName: string;
  bankFeePct: number; // 1.5 - 3.0
  stateOreOrderActive: boolean; // +30% ore price
  stateOreOrderCapLeft: number; // 50M RUB cap
  electionEndsAt: number;
  votedCandidateId: string | null;
  impeachmentVotes: number;
  impeachmentTriggered: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  category: 'work' | 'mine' | 'business' | 'bank' | 'race' | 'casino' | 'politics' | 'warn' | 'dev';
  text: string;
}

export interface PlayerState {
  telegramId: string;
  username: string;
  isCreator: boolean;
  level: number;
  xp: number;
  experienceShifts: number;
  totalClicks: number;
  clickPowerLevel: number;
  pickaxeLevel: number;

  // Physiology & Anti-Bot
  energy: number;
  maxEnergy: number;
  lastEnergyTickAt: number;
  lastCoffeeAt: number;
  lastClickAt: number;

  // Rules & Warnings (3/3 -> 24h ban)
  warnings: number;
  bannedUntil: number;

  // Karma (-inf ... +inf) & Education
  karma: number;
  education: EducationLevel;
  hasBlackMarketGear: boolean;

  // Currencies & Safe
  wallet: Wallet;
  safe: Wallet;
  bankDepositRub: number;
  lastDepositYieldAt: number;
  hasZeroSpreadLicense: boolean; // 150 EUR

  // Profession
  currentProfessionId: string;

  // Business (strictly 1)
  ownedBusinessId: string | null;
  businessCashbox: number;
  businessLastTickAt: number;

  // Printing Presses & BTC Mining
  ownedPresses: Record<string, number>;
  miningRacks: Record<string, number>;
  maxMiningRacksCap: number; // Base 5, expandable to Hard Cap 100
  miningLastTickAt: number;
  miningDifficulty: number;

  // Mine & Ores & Auto-Drills
  ores: Record<string, number>;
  ownedDrills: OwnedAutoDrill[];

  // Real Estate
  ownedPropertyId: string;

  // Cars & Racing
  garage: OwnedCar[];
  activeCarId: string | null;

  // Casino & Black Market
  casinoTicketTier: 'none' | 'standard' | 'vip' | 'azart_pack';
  lastWheelSpinAt: number;
  blackMarketSeedAt: number;

  // Faction, Clan, Prestige, Plates
  factionId: FactionId;
  clan: ClanState | null;
  prestigeTier: number; // 1..10
  prestigeGraceUntil: number;
  ownedPlates: string[];

  // Politics
  politics: PoliticsState;

  // Districts snapshot
  districts: DistrictDef[];

  // Recent activity log
  logs: LogEntry[];
}

export interface ActionResult {
  ok: boolean;
  state: PlayerState;
  message: string;
  rewardText?: string;
  warningTriggered?: boolean;
  raidTriggered?: boolean;
}
