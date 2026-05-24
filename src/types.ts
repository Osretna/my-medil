export interface Weapon {
  id: string;
  name: string;
  nameAr: string;
  damage: number;
  fireRate: number; // millseconds interval between shots
  ammoCapacity: number;
  cost: number;
  color: string; // Hex color represent in 3D block
  range: number;
  description: string;
  descriptionAr: string;
}

export interface Skin {
  id: string;
  name: string;
  nameAr: string;
  color: string; // Base diffuse color representing the player block
  cost: number;
  armorMultiplier: number; // Reduces incoming damage slightly
  description: string;
  descriptionAr: string;
}

export interface Player {
  id: string;
  displayName: string;
  email: string;
  level: number;
  xp: number;
  kills: number;
  deaths: number;
  coins: number;
  selectedSkin: string;
  selectedWeapon: string;
  unlockedSkins: string[]; // List of Skin IDs
  unlockedWeapons: string[]; // List of Weapon IDs
  role: 'player' | 'admin';
  lastOnline: string;
}

export interface Transaction {
  id: string;
  userId: string;
  userEmail: string;
  amountEGP: number;
  coinsGranted: number;
  instapayPhone: string;
  status: 'pending' | 'approved' | 'rejected';
  whatsappRef?: string;
  createdAt: string;
  approvedAt?: string;
}

export interface GameMap {
  id: string;
  name: string;
  nameAr: string;
  primaryColor: string; // Hex (desert sandy, city slate, forest green)
  obstacleColor: string; // Secondary accent color
  fogColor: string;
  groundSize: number;
  obstaclesCount: number;
  description: string;
  descriptionAr: string;
}

export interface MatchScore {
  kills: number;
  xpEarned: number;
  coinsEarned: number;
  survivalTimeSeconds: number;
  victory: boolean;
}
