import { useState } from 'react';
import { Player, Transaction } from '../types';
import { ALL_WEAPONS, ALL_SKINS, synths } from '../gameData';
import { Shield, Users, CreditCard, Check, X, Search, Coins, Award, LogIn, HardDrive, Sparkles } from 'lucide-react';

interface AdminPanelProps {
  players: Player[];
  transactions: Transaction[];
  onUpdatePlayer: (p: Player) => void;
  onUpdateTransaction: (t: Transaction) => void;
  onApproveTransaction: (t: Transaction) => void;
}

export default function AdminPanel({
  players,
  transactions,
  onUpdatePlayer,
  onUpdateTransaction,
  onApproveTransaction
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'players' | 'transactions'>('transactions');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPlayers = players.filter(p =>
    p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTransactions = transactions.filter(t =>
    t.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.status === searchQuery
  );

  // Quick action adjust player parameters
  const adjustPlayerField = (player: Player, field: keyof Player, amount: number) => {
    synths.playClick();
    const updated = { ...player };
    const val = updated[field];
    if (typeof val === 'number') {
      (updated[field] as number) = Math.max(0, val + amount);
      onUpdatePlayer(updated);
    }
  };

  const handleManualUnlock = (player: Player, type: 'skin' | 'weapon', itemId: string) => {
    synths.playClick();
    const updated = { ...player };
    if (type === 'skin') {
      if (!updated.unlockedSkins.includes(itemId)) {
        updated.unlockedSkins = [...updated.unlockedSkins, itemId];
        onUpdatePlayer(updated);
      }
    } else {
      if (!updated.unlockedWeapons.includes(itemId)) {
        updated.unlockedWeapons = [...updated.unlockedWeapons, itemId];
        onUpdatePlayer(updated);
      }
    }
  };

  const handleManualApproval = (tx: Transaction) => {
    synths.playLevelUp();
    onApproveTransaction(tx);
  };

  const handleManualRejection = (tx: Transaction) => {
    synths.playClick();
    const rej: Transaction = {
      ...tx,
      status: 'rejected',
      approvedAt: new Date().toISOString()
    };
    onUpdateTransaction(rej);
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-right space-y-6">
      
      {/* Admin header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-xl text-indigo-400">
          <Shield className="w-5 h-5 animate-pulse" />
          <span className="text-xs font-bold font-mono">لوحة تحكم المشرف (Admin Interface)</span>
        </div>
        
        <div>
          <h2 className="text-2xl font-black text-white">إشراف النظام والتحصيل التلقائي ⚙️</h2>
          <p className="text-xs text-slate-400 mt-1">المشرف الافتراضي: nesmanagah53@gmail.com (من حسابك الحالي وعبر كود اللعبة)</p>
        </div>
      </div>

      {/* Tabs selectors and search bar */}
      <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <input
            id="admin_search_bar"
            type="text"
            placeholder="البحث بالبريد الإلكتروني للّاعب..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 p-2.5 pr-10 rounded-xl text-sm text-white text-right focus:border-indigo-500 focus:outline-none"
          />
          <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 w-full md:w-auto">
          <button
            id="tab_admin_players"
            onClick={() => { setActiveTab('players'); synths.playClick(); }}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'players' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            إدارة اللاعبين ({players.length})
          </button>
          
          <button
            id="tab_admin_transactions"
            onClick={() => { setActiveTab('transactions'); synths.playClick(); }}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'transactions' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            طلبات الشحن InstaPay ({transactions.filter(t => t.status === 'pending').length})
          </button>
        </div>
      </div>

      {/* Tab 1: Players Management */}
      {activeTab === 'players' && (
        <div className="space-y-4">
          {filteredPlayers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 border border-slate-800 rounded-xl bg-slate-950 text-sm">
              لم يتم العثور على لاعبين بفلترك الحالي.
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredPlayers.map(p => (
                <div key={p.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-slate-700 transition">
                  {/* Player header */}
                  <div className="flex justify-between items-start">
                    <div className="text-left">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.role === 'admin' ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
                      }`}>
                        {p.role === 'admin' ? 'مشرف' : 'لاعب قتالي'}
                      </span>
                      <span className="block text-[10px] text-slate-500 mt-1">تاريخ الدخول: {new Date(p.lastOnline).toLocaleDateString()}</span>
                    </div>

                    <div className="text-right">
                      <h4 className="font-bold text-white text-base">{p.displayName}</h4>
                      <span className="text-xs text-slate-500 font-mono">{p.email}</span>
                    </div>
                  </div>

                  {/* Player stats matrix */}
                  <div className="grid grid-cols-4 gap-2 bg-slate-900/60 p-3 rounded-lg text-center border border-slate-800">
                    <div>
                      <span className="block text-[10px] text-slate-500">الذهب 🪙</span>
                      <span className="font-extrabold text-xs text-yellow-500">{p.coins}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500">الرتبة / لفل</span>
                      <span className="font-extrabold text-xs text-white">Lvl {p.level}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500">القتلى 🎯</span>
                      <span className="font-extrabold text-xs text-green-400">{p.kills}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500">موت</span>
                      <span className="font-extrabold text-xs text-red-400">{p.deaths}</span>
                    </div>
                  </div>

                  {/* Stat Adjustments Actions */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-slate-500 block">تعديل بارامترات اللعب</span>
                    <div className="flex flex-wrap gap-2 justify-end">
                      <button
                        onClick={() => adjustPlayerField(p, 'coins', 150)}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] font-semibold text-yellow-500 flex items-center gap-1 cursor-pointer"
                      >
                        <Coins className="w-3 h-3" />
                        حفظ +150 ذهب
                      </button>
                      <button
                        onClick={() => adjustPlayerField(p, 'coins', 500)}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] font-semibold text-yellow-400 flex items-center gap-1 cursor-pointer"
                      >
                        <Coins className="w-3 h-3" />
                        حفظ +500 ذهب
                      </button>
                      <button
                        onClick={() => adjustPlayerField(p, 'level', 1)}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] font-semibold text-white flex items-center gap-1 cursor-pointer"
                      >
                        <Award className="w-3 h-3" />
                        ترقية مستوى +1
                      </button>
                      <button
                        onClick={() => adjustPlayerField(p, 'kills', 10)}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] font-semibold text-green-400 flex items-center gap-1 cursor-pointer"
                      >
                        +10 قتيل
                      </button>
                    </div>
                  </div>

                  {/* Manual Unlocks Shop */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 block">منح تراخيص المخزون (الملابس والأسلحة)</span>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {ALL_WEAPONS.map(w => {
                        const hasW = p.unlockedWeapons.includes(w.id);
                        return (
                          <button
                            key={w.id}
                            disabled={hasW}
                            onClick={() => handleManualUnlock(p, 'weapon', w.id)}
                            className={`px-2 py-1.5 rounded text-[10px] font-bold border transition ${
                              hasW 
                                ? 'bg-slate-900 border-slate-800 text-slate-500' 
                                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 cursor-pointer'
                            }`}
                          >
                            منح: {w.name}
                          </button>
                        );
                      })}
                      {ALL_SKINS.map(s => {
                        const hasS = p.unlockedSkins.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            disabled={hasS}
                            onClick={() => handleManualUnlock(p, 'skin', s.id)}
                            className={`px-2 py-1.5 rounded text-[10px] font-bold border transition ${
                              hasS 
                                ? 'bg-slate-900 border-slate-800 text-slate-500' 
                                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 cursor-pointer'
                            }`}
                          >
                            منح درع: {s.nameAr}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Transactions Approval */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-slate-500 border border-slate-800 rounded-xl bg-slate-950 text-sm">
              لا يوجد طلبات تأكيد شحن معلقة حالياً.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
              <table className="w-full text-right border-collapse min-w-[700px] text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px] font-extrabold h-12">
                    <th className="px-5 text-right">معرف المعاملة</th>
                    <th className="px-5 text-right">اللاعب / البريد</th>
                    <th className="px-2 text-center text-yellow-500">القيمة والذهب الكلي</th>
                    <th className="px-5 text-right">رقم هاتف المحول وملاحظات الدفع</th>
                    <th className="px-5 text-center">تاريخ الطلب</th>
                    <th className="px-5 text-center">حالة الطلب</th>
                    <th className="px-5 text-center">إجراء تفعيل الباقة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-100">
                  {filteredTransactions.map(t => (
                    <tr key={t.id} className="hover:bg-slate-900/40 transition h-14">
                      {/* ID */}
                      <td className="px-5 font-mono text-slate-500">{t.id}</td>
                      
                      {/* Email */}
                      <td className="px-5">
                        <span className="block font-bold text-slate-200">{t.userEmail}</span>
                        <span className="text-[10px] text-slate-500 font-mono">UID: {t.userId.substring(0, 9)}...</span>
                      </td>

                      {/* EGP & Gold */}
                      <td className="px-2 text-center">
                        <span className="block font-black text-white text-sm">{t.amountEGP} جنيه</span>
                        <span className="text-[10px] font-bold text-yellow-500">+{t.coinsGranted} 🪙</span>
                      </td>

                      {/* Phone note */}
                      <td className="px-5 max-w-xs truncate text-[11px] text-slate-300">
                        {t.whatsappRef || 'لا توجد تفاصيل'}
                      </td>

                      {/* Created date */}
                      <td className="px-5 text-center font-mono text-slate-400">
                        {new Date(t.createdAt).toLocaleTimeString()}
                      </td>

                      {/* Status */}
                      <td className="px-5 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          t.status === 'approved' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : t.status === 'rejected'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/10 animate-pulse'
                        }`}>
                          {t.status === 'approved' ? 'مؤكد/مشحون' : t.status === 'rejected' ? 'مرفوض' : 'معلق في الانتظار'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 text-center">
                        {t.status === 'pending' ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              id={`approve_tx_${t.id}`}
                              onClick={() => handleManualApproval(t)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg flex items-center gap-1 transition cursor-pointer"
                              title="تأكيد الدفع وإضافة الذهب تلقائياً لملف اللاعب"
                            >
                              <Check className="w-3.5 h-3.5" />
                              تأكيد الشحن ✅
                            </button>
                            <button
                              id={`reject_tx_${t.id}`}
                              onClick={() => handleManualRejection(t)}
                              className="p-1.5 bg-slate-800 hover:bg-red-950 rounded-lg text-slate-400 hover:text-red-400 transition cursor-pointer"
                              title="رفض"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[10px] font-mono">
                            تمت التسوية الساعة {t.approvedAt ? new Date(t.approvedAt).toLocaleTimeString() : ''}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
