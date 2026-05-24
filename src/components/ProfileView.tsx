import { useState } from 'react';
import { Player, Weapon, Skin } from '../types';
import { ALL_WEAPONS, ALL_SKINS, synths } from '../gameData';
import { Award, Zap, Coins, Check, Lock, Swords, ShoppingCart, Calendar, Target, Shield, Flame } from 'lucide-react';

interface ProfileViewProps {
  player: Player;
  onUpdatePlayer: (updated: Player) => void;
  onOpenCharge: () => void;
}

export default function ProfileView({ player, onUpdatePlayer, onOpenCharge }: ProfileViewProps) {
  const [dailyClaimed, setDailyClaimed] = useState(false);
  const [activeTab, setActiveTab] = useState<'weapons' | 'skins'>('weapons');

  const kdRatio = player.deaths === 0 ? player.kills : (player.kills / player.deaths).toFixed(2);
  const xpNeeded = player.level * 450;
  const xpPercent = Math.min(100, Math.round((player.xp / xpNeeded) * 100));

  // Handle free daily coin reward click
  const handleClaimDaily = () => {
    if (dailyClaimed) return;
    synths.playLevelUp();
    const updated = {
      ...player,
      coins: player.coins + 75,
      xp: player.xp + 50
    };
    
    // Check level up from XP grant
    const checkXpNeeded = updated.level * 450;
    if (updated.xp >= checkXpNeeded) {
      updated.xp = updated.xp - checkXpNeeded;
      updated.level += 1;
      synths.playLevelUp();
    }

    onUpdatePlayer(updated);
    setDailyClaimed(true);
  };

  const handleEquipWeapon = (weaponId: string) => {
    synths.playClick();
    onUpdatePlayer({
      ...player,
      selectedWeapon: weaponId
    });
  };

  const handlePurchaseWeapon = (weapon: Weapon) => {
    if (player.coins < weapon.cost) {
      synths.playClick();
      // Open deposit automatically as a gorgeous proactive trigger
      onOpenCharge();
      return;
    }

    synths.playLevelUp();
    onUpdatePlayer({
      ...player,
      coins: player.coins - weapon.cost,
      unlockedWeapons: [...player.unlockedWeapons, weapon.id],
      selectedWeapon: weapon.id
    });
  };

  const handleEquipSkin = (skinId: string) => {
    synths.playClick();
    onUpdatePlayer({
      ...player,
      selectedSkin: skinId
    });
  };

  const handlePurchaseSkin = (skin: Skin) => {
    if (player.coins < skin.cost) {
      synths.playClick();
      onOpenCharge();
      return;
    }

    synths.playLevelUp();
    onUpdatePlayer({
      ...player,
      coins: player.coins - skin.cost,
      unlockedSkins: [...player.unlockedSkins, skin.id],
      selectedSkin: skin.id
    });
  };

  return (
    <div className="space-y-6 text-right">
      
      {/* 1. Tactical Soldier Rank HUD */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row gap-6 justify-between items-center relative overflow-hidden">
        
        {/* Absolute visual highlight decoration line */}
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-yellow-500 via-indigo-500 to-red-500" />
        
        {/* Daily reward & coins action */}
        <div className="flex flex-col items-center sm:items-end gap-3 w-full md:w-auto">
          <div className="flex gap-2.5">
            <button
              id="claim_daily_gold"
              disabled={dailyClaimed}
              onClick={handleClaimDaily}
              className={`px-5 py-3 rounded-xl font-bold text-xs transition flex items-center gap-2 shadow-lg leading-none cursor-pointer ${
                dailyClaimed
                  ? 'bg-slate-800 text-slate-500 border border-slate-800'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500/20'
              }`}
            >
              <Calendar className="w-4 h-4 bg-emerald-500/10" />
              {dailyClaimed ? 'تم استلام مكافأة اليوم' : 'استلام هدية الذهب اليومية (+75 🪙)'}
            </button>

            <div className="px-5 py-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-2.5">
              <span className="text-yellow-500 font-extrabold text-lg">{player.coins}</span>
              <Coins className="w-5 h-5 text-yellow-500 animate-pulse" />
            </div>
          </div>

          <button
            id="open_shop_charge_btn"
            onClick={onOpenCharge}
            className="w-full sm:w-auto px-5 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black text-xs rounded-lg transition duration-150 flex items-center justify-center gap-1 cursor-pointer"
          >
            شحن رصيد إضافي عبر InstaPay ⚡
          </button>
        </div>

        {/* Level bar progress & Display details */}
        <div className="w-full md:flex-1 text-center md:text-right space-y-3 max-w-lg">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">
              نقاط الخبرة: {player.xp} / {xpNeeded} XP ({xpPercent}%)
            </span>
            <div className="text-right">
              <h3 className="text-xl font-black text-white flex items-center gap-2 justify-center md:justify-end">
                <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 border border-red-500/20 text-red-400 font-mono uppercase tracking-wide">
                  رتبة: ملازم أول
                </span>
                <span>{player.displayName}</span>
              </h3>
              <p className="text-xs font-mono text-slate-500 mt-1">{player.email}</p>
            </div>
          </div>

          {/* Level up rating line */}
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${xpPercent}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
            <span>المستوى التالي Lvl {player.level + 1}</span>
            <span>مستوى قتالي Lvl {player.level}</span>
          </div>
        </div>

      </div>

      {/* 2. Combat Performance Statistics dashboard summary (Military layout) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between text-right">
          <div className="p-2.5 rounded bg-green-500/10 text-green-400">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-500">قتل الأعداء</span>
            <span className="text-xl font-black text-white">{player.kills}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between text-right">
          <div className="p-2.5 rounded bg-red-500/10 text-red-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-500">مرات الموت</span>
            <span className="text-xl font-black text-white">{player.deaths}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between text-right">
          <div className="p-2.5 rounded bg-indigo-500/10 text-indigo-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-500">معدل K/D</span>
            <span className="text-xl font-black text-white">{kdRatio}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between text-right">
          <div className="p-2.5 rounded bg-yellow-500/10 text-yellow-400">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-500">إجمالي الذهب</span>
            <span className="text-xl font-black text-white">{player.coins}</span>
          </div>
        </div>
      </div>

      {/* 3. Shop & Inventory Management */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
          
          <div className="flex gap-2">
            <button
              id="sub_tab_weapons"
              onClick={() => { setActiveTab('weapons'); synths.playClick(); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'weapons' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              ترسانة الأسلحة
            </button>
            <button
              id="sub_tab_skins"
              onClick={() => { setActiveTab('skins'); synths.playClick(); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'skins' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              الملابس و الدروع التكتيكية
            </button>
          </div>

          <h4 className="text-base font-black text-white">ترقية وحيازة المعدات</h4>
        </div>

        {/* Weapons tab display */}
        {activeTab === 'weapons' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ALL_WEAPONS.map((weapon) => {
              const isUnlocked = player.unlockedWeapons.includes(weapon.id) || weapon.cost === 0;
              const isEquipped = player.selectedWeapon === weapon.id;
              
              return (
                <div key={weapon.id} className={`bg-slate-900 border rounded-xl p-5 text-right flex flex-col justify-between gap-4 transition hover:shadow-lg ${
                  isEquipped ? 'border-yellow-500 bg-yellow-500/5' : 'border-slate-800'
                }`}>
                  <div className="flex justify-between items-start gap-4">
                    {/* Lock state mark */}
                    <div className="text-left font-sans">
                      {isEquipped ? (
                        <span className="px-2.5 py-1 bg-yellow-500 text-slate-950 font-extrabold text-[9px] rounded-lg">
                          المُجهز حالياً 🔋
                        </span>
                      ) : isUnlocked ? (
                        <button
                          id={`equip_weapon_${weapon.id}`}
                          onClick={() => handleEquipWeapon(weapon.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] rounded-lg cursor-pointer"
                        >
                          تجهيز السلاح ⚔️
                        </button>
                      ) : (
                        <button
                          id={`buy_weapon_${weapon.id}`}
                          onClick={() => handlePurchaseWeapon(weapon)}
                          className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-extrabold text-[10px] rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <ShoppingCart className="w-3 h-3" />
                          شراء ({weapon.cost} 🪙)
                        </button>
                      )}
                    </div>

                    <div className="flex-1 text-right">
                      <h5 className="font-bold text-white text-base flex items-center gap-2 justify-end">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: weapon.color }}
                        />
                        {weapon.nameAr}
                      </h5>
                      <p className="text-xs text-slate-500 mt-1">{weapon.name}</p>
                    </div>
                  </div>

                  {/* Weapon parameters status sliders info */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-3 rounded-lg text-center text-[10px]">
                    <div>
                      <span className="block text-slate-500">معدل الضرر</span>
                      <span className="font-black text-rose-400">{weapon.damage} HP</span>
                    </div>
                    <div>
                      <span className="block text-slate-500">سعة الذخيرة</span>
                      <span className="font-black text-green-400">{weapon.ammoCapacity} رصاصة</span>
                    </div>
                    <div>
                      <span className="block text-slate-500">المدى</span>
                      <span className="font-black text-indigo-400">{weapon.range} م</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 font-sans leading-relaxed">
                    {weapon.descriptionAr}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          /* Clothing/Skins tab display */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ALL_SKINS.map((skin) => {
              const isUnlocked = player.unlockedSkins.includes(skin.id) || skin.cost === 0;
              const isEquipped = player.selectedSkin === skin.id;
              
              return (
                <div key={skin.id} className={`bg-slate-900 border rounded-xl p-5 text-right flex flex-col justify-between gap-4 transition hover:shadow-lg ${
                  isEquipped ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-800'
                }`}>
                  <div className="flex justify-between items-start gap-4">
                    {/* Equip action */}
                    <div className="text-left font-sans">
                      {isEquipped ? (
                        <span className="px-2.5 py-1 bg-indigo-500 text-white font-extrabold text-[9px] rounded-lg">
                          المُرتدى حالياً 🥋
                        </span>
                      ) : isUnlocked ? (
                        <button
                          id={`equip_skin_${skin.id}`}
                          onClick={() => handleEquipSkin(skin.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] rounded-lg cursor-pointer"
                        >
                          ارتداء البدلة
                        </button>
                      ) : (
                        <button
                          id={`buy_skin_${skin.id}`}
                          onClick={() => handlePurchaseSkin(skin)}
                          className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-extrabold text-[10px] rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <ShoppingCart className="w-3 h-3" />
                          شراء ({skin.cost} 🪙)
                        </button>
                      )}
                    </div>

                    <div className="flex-1 text-right">
                      <h5 className="font-bold text-white text-base flex items-center gap-2 justify-end">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-slate-700"
                          style={{ backgroundColor: skin.color }}
                        />
                        {skin.nameAr}
                      </h5>
                      <p className="text-xs text-slate-500 mt-1">{skin.name}</p>
                    </div>
                  </div>

                  {/* Attributes and shield factor */}
                  <div className="flex justify-between items-center bg-slate-950/80 px-4 py-2.5 rounded-lg text-xs">
                    <span className="text-emerald-400 font-bold">
                      {( (1 - skin.armorMultiplier) * 100 ).toFixed(0)}% تخفيض الضرر
                    </span>
                    <span className="text-slate-500">حماية الدرع</span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    {skin.descriptionAr}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
