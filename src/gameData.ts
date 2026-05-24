import { Weapon, Skin, GameMap } from './types';

export const ALL_WEAPONS: Weapon[] = [
  {
    id: 'm4a1',
    name: 'M4A1 Assault',
    nameAr: 'رشاش M4A1 هجومي',
    damage: 25,
    fireRate: 150, // 150ms between shots
    ammoCapacity: 30,
    cost: 0, // Unlocked by default
    color: '#34d399', // Emerald
    range: 120,
    description: 'Versatile standard military rifle with high rate of fire.',
    descriptionAr: 'رشاش عسكري قياسي متعدد الاستخدامات مع سرعة إطلاق عالية.'
  },
  {
    id: 'awp',
    name: 'AWP Sniper',
    nameAr: 'بندقية قنص AWP',
    damage: 100,
    fireRate: 1200, // Slow reload
    ammoCapacity: 5,
    cost: 500, // Coins
    color: '#fbbf24', // Amber
    range: 300,
    description: 'Ultra high damage, long-range sniper rifle. Shoots slowly.',
    descriptionAr: 'بندقية قنص ذات ضرر هائل ومدى بعيد جداً. سرعة إطلاق بطيئة.'
  },
  {
    id: 'shotgun',
    name: 'Remington Shotgel',
    nameAr: 'بندقية الخرطوش',
    damage: 60,
    fireRate: 800,
    ammoCapacity: 8,
    cost: 250,
    color: '#f87171', // Red
    range: 45,
    description: 'Deconstructive close-range weapon that sprays bullets.',
    descriptionAr: 'سلاح مدمر للمدى القريب يُطلق وابلاً من الطلقات المتفرقة.'
  },
  {
    id: 'plasma',
    name: 'Vortex Plasma Gun',
    nameAr: 'مسدس البلازما المتطور',
    damage: 40,
    fireRate: 250,
    ammoCapacity: 20,
    cost: 1000,
    color: '#60a5fa', // Blue
    range: 150,
    description: 'Fires high-tech glowing energy spheres at enemy targets.',
    descriptionAr: 'يطلق كرات طاقة مضيئة ومتطورة للتخلص من الأعداء بسرعة.'
  }
];

export const ALL_SKINS: Skin[] = [
  {
    id: 'recruit',
    name: 'Tactical Recruit',
    nameAr: 'المجند التكتيكي',
    color: '#4b5563', // Gray
    cost: 0,
    armorMultiplier: 1.0,
    description: 'Standard army gear with lightweight Kevlar protection.',
    descriptionAr: 'البذلة العسكرية القياسية مع حماية خفيفة.'
  },
  {
    id: 'desert_ranger',
    name: 'Desert Ranger',
    nameAr: 'مغوار الصحراء',
    color: '#d97706', // Sandy amber
    cost: 200,
    armorMultiplier: 0.85, // 15% damage reduction
    description: 'Reinforced desert fatigues built to withstand harsh combat.',
    descriptionAr: 'بذلة رملية معززة مصممة لتحمل ظروف القتال القاسية.'
  },
  {
    id: 'urban_shadow',
    name: 'Urban shadow',
    nameAr: 'شبح المدينة',
    color: '#111827', // Obsidian
    cost: 450,
    armorMultiplier: 0.75, // 25% damage reduction
    description: 'Advanced stealth armor optimizing defense and weight distribution.',
    descriptionAr: 'درع تخفي متطور يوفر حماية عالية ورؤية منخفضة للأعداء.'
  },
  {
    id: 'golden_commander',
    name: 'Golden Commander',
    nameAr: 'القائد الذهبي الملوكي',
    color: '#f59e0b', // Glowing Gold
    cost: 1200,
    armorMultiplier: 0.60, // 40% damage reduction
    description: 'Ultra-rare masterpiece composite armor reserved for veterans.',
    descriptionAr: 'درع مركب نادر للغاية ومطلي بالذهب مخصص لقادة النخبة.'
  }
];

export const ALL_MAPS: GameMap[] = [
  {
    id: 'desert',
    name: 'Sands of Fire',
    nameAr: 'رمال اللهب (الصحراء)',
    primaryColor: '#fef3c7', // Warm sandy light
    obstacleColor: '#b45309', // Brown clay/ruins
    fogColor: '#fde047',
    groundSize: 150,
    obstaclesCount: 35,
    description: 'A hot barren desert with structural stone sandstone columns.',
    descriptionAr: 'صحراء قاحلة حارة تحتوي على أعمدة أثرية وجدران طينية للاحتماء.'
  },
  {
    id: 'city',
    name: 'Concrete Warzone',
    nameAr: 'ساحة المدينة الخرسانية',
    primaryColor: '#374151', // Dark slate/asphalt
    obstacleColor: '#9ca3af', // Concrete blocks
    fogColor: '#4b5563',
    groundSize: 120,
    obstaclesCount: 30,
    description: 'Urban city grid filled with high blocks and tactical barricades.',
    descriptionAr: 'مربعات مدينة مدمرة مليئة بالكتل الخرسانية والحواجز التكتيكية.'
  },
  {
    id: 'forest',
    name: 'Green Eclipse',
    nameAr: 'غابة الكسوف الأخضر',
    primaryColor: '#064e3b', // Deep forest green
    obstacleColor: '#0f766e', // Teal/wood posts
    fogColor: '#115e59',
    groundSize: 140,
    obstaclesCount: 40,
    description: 'Dense wooded landscape providing close combat visual cover.',
    descriptionAr: 'أرض غابة كثيفة ذات توزيع أشجار يوفر غطاءً بصرياً ممتازاً في الاشتباك.'
  }
];

export const PAYMENT_PACKAGES = [
  { id: 'pkg_50', egp: 50, coins: 150, labelAr: 'الباقة البرونزية', icon: '🥉' },
  { id: 'pkg_100', egp: 100, coins: 400, labelAr: 'الباقة الفضية', icon: '🥈' },
  { id: 'pkg_250', egp: 250, coins: 1200, labelAr: 'الباقة الذهبية المتميزة', icon: '🥇' },
  { id: 'pkg_500', egp: 500, coins: 3000, labelAr: 'باقة النخبة الأسطورية', icon: '💎' }
];

// High fidelity Web Audio API sound synthesizer to avoid external assets.
// Extremely lightweight and customizable.
class SoundSynth {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  // Laser or standard gun shot sound
  playShoot(type: 'm4a1' | 'awp' | 'shotgun' | 'plasma') {
    try {
      this.init();
      if (!this.ctx) return;
      
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      if (type === 'plasma') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'awp') {
        // Loud explosion-like rifle shot
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.4);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        
        // Add metallic ring
        const oscRing = this.ctx.createOscillator();
        const gainRing = this.ctx.createGain();
        oscRing.type = 'sine';
        oscRing.frequency.setValueAtTime(120, now);
        gainRing.gain.setValueAtTime(0.2, now);
        gainRing.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        oscRing.connect(gainRing);
        gainRing.connect(this.ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.45);
        oscRing.start(now);
        oscRing.stop(now + 0.5);
      } else if (type === 'shotgun') {
        // Scatter noise & burst
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(30, now + 0.15);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else { // m4a1 assault
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      }
    } catch (e) {
      console.warn('Audio play failure', e);
    }
  }

  // Hit sound (impact)
  playHit() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.linearRampToValueAtTime(50, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {}
  }

  // Explosion sound
  playExplosion() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(10, now + 0.6);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc.start(now);
      osc.stop(now + 0.65);
    } catch (e) {}
  }

  // Simple click / UI noise
  playClick() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.setValueAtTime(900, now + 0.05);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {}
  }

  // Level up melody
  playLevelUp() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25]; // C E G C ascending
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.12, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.2);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.25);
      });
    } catch (e) {}
  }
}

export const synths = new SoundSynth();
