import { useState, useEffect, FormEvent } from 'react';
import { Player, Transaction, GameMap, MatchScore } from './types';
import { ALL_MAPS, ALL_WEAPONS, ALL_SKINS, synths } from './gameData';
import Battlefield from './components/Battlefield';
import ProfileView from './components/ProfileView';
import AdminPanel from './components/AdminPanel';
import ChargeModal from './components/ChargeModal';
import { isFirebaseLive, auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, onSnapshot, query, getDocs, limit } from 'firebase/firestore';
import { Swords, Play, Shield, Users, Coins, LogIn, LogOut, Award, Flame, Zap, Compass, Sparkles, MessageSquare, AlertCircle } from 'lucide-react';

export default function App() {
  // Authentication & session state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestMode, setGuestMode] = useState(false);
  const [guestEmail, setGuestEmail] = useState('nesmanagah53@gmail.com');

  // Admin credentials states (initially empty as requested by user)
  const [loginMode, setLoginMode] = useState<'player' | 'admin'>('player');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  // Player inventory/profile stats
  const [playerData, setPlayerData] = useState<Player | null>(null);

  // Lists for global sync
  const [playersList, setPlayersList] = useState<Player[]>([]);
  const [transactionsList, setTransactionsList] = useState<Transaction[]>([]);

  // Page routing
  const [currentTab, setCurrentTab] = useState<'lobby' | 'inventory' | 'admin'>('lobby');
  const [selectedMap, setSelectedMap] = useState<GameMap>(ALL_MAPS[0]);
  const [inBattle, setInBattle] = useState(false);
  
  // Modals
  const [isChargeOpen, setIsChargeOpen] = useState(false);

  // Progressive Web App (PWA) installation states for mobile devices
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Initial check for standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
       setShowInstallBtn(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      alert('ميزة التثبيت متاحة عند فتح اللعبة على متصفح الهاتف أو الكروم مباشرة كـ تطبيق Progressive Web App (PWA).');
      return;
    }
    synths.playClick();
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User installation choice outcome: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  // 1. Hook up real Firebase Authentication listeners
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setGuestMode(false);
        // Load or create player profile inside Firebase
        await syncPlayerProfile(user.uid, user.displayName || 'لاعب قتالي', user.email || '');
      } else {
        setCurrentUser(null);
        if (!guestMode) {
          setPlayerData(null);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [guestMode]);

  // 2. Synchronize Player Profile (Dual mode: Firebase Firestore or LocalStorage proxy)
  const syncPlayerProfile = async (uid: string, name: string, email: string) => {
    if (isFirebaseLive) {
      try {
        const docRef = doc(db, 'players', uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const loaded = docSnap.data() as Player;
          setPlayerData(loaded);
        } else {
          // Setup a new fresh profile
          const initial: Player = {
            id: uid,
            displayName: name,
            email: email,
            level: 1,
            xp: 0,
            kills: 0,
            deaths: 0,
            coins: 300, // starting gold bonus!
            selectedSkin: 'recruit',
            selectedWeapon: 'm4a1',
            unlockedSkins: ['recruit'],
            unlockedWeapons: ['m4a1'],
            role: email === 'nesmanagah53@gmail.com' ? 'admin' : 'player', // Assign admin role properly to target user
            lastOnline: new Date().toISOString()
          };
          await setDoc(docRef, initial);
          setPlayerData(initial);
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, `players/${uid}`);
      }
    } else {
      // LocalStorage local sandbox fallback
      const cached = localStorage.getItem(`war_player_${uid}`);
      if (cached) {
        setPlayerData(JSON.parse(cached));
      } else {
        const initial: Player = {
          id: uid,
          displayName: name,
          email: email,
          level: 1,
          xp: 0,
          kills: 0,
          deaths: 0,
          coins: 600, // high sandbox starting budget for immediate testing!
          selectedSkin: 'recruit',
          selectedWeapon: 'm4a1',
          unlockedSkins: ['recruit'],
          unlockedWeapons: ['m4a1'],
          role: email === 'nesmanagah53@gmail.com' ? 'admin' : 'player',
          lastOnline: new Date().toISOString()
        };
        localStorage.setItem(`war_player_${uid}`, JSON.stringify(initial));
        setPlayerData(initial);
      }
    }
  };

  // 3. Listen to transaction pipelines + global admins listings
  useEffect(() => {
    if (!playerData) return;

    if (isFirebaseLive) {
      // Stream players listing for administrative overview (only if current is admin)
      let unsubPlayers = () => {};
      let unsubTx = () => {};

      if (playerData.role === 'admin') {
        const playersRef = collection(db, 'players');
        unsubPlayers = onSnapshot(playersRef, (snap) => {
          const list: Player[] = [];
          snap.forEach(doc => list.push(doc.data() as Player));
          setPlayersList(list);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'players');
        });
      }

      // Stream transactions
      const txRef = collection(db, 'transactions');
      unsubTx = onSnapshot(txRef, (snap) => {
        const list: Transaction[] = [];
        snap.forEach(doc => list.push(doc.data() as Transaction));
        // Sort newest first
        list.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
        setTransactionsList(list);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'transactions');
      });

      return () => {
        unsubPlayers();
        unsubTx();
      };
    } else {
      // Local simulation polling loader
      const loadLocalData = () => {
        // Load offline transactions lists
        const localTxs = localStorage.getItem('war_transactions_sim');
        const transactions: Transaction[] = localTxs ? JSON.parse(localTxs) : [];
        setTransactionsList(transactions);

        // Load offline player list
        const ids = Object.keys(localStorage).filter(k => k.startsWith('war_player_'));
        const players: Player[] = ids.map(id => JSON.parse(localStorage.getItem(id)!));
        
        // Ensure current is in players list
        if (!players.some(p => p.id === playerData.id)) {
          players.push(playerData);
        }
        setPlayersList(players);
      };
      
      loadLocalData();
    }
  }, [playerData]);

  // 4. Update player profile stats
  const handleUpdatePlayerData = async (updated: Player) => {
    setPlayerData(updated);
    
    // Save state back to direct storage
    if (isFirebaseLive) {
      try {
        const docRef = doc(db, 'players', updated.id);
        await updateDoc(docRef, updated as any);
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `players/${updated.id}`);
      }
    } else {
      localStorage.setItem(`war_player_${updated.id}`, JSON.stringify(updated));
      // Trigger instant update into players state listing
      setPlayersList(prev => prev.map(p => p.id === updated.id ? updated : p));
    }
  };

  // 5. Submit a new payments claim request
  const handleNewTransaction = async (tx: Transaction) => {
    // Add to lists
    if (isFirebaseLive) {
      try {
        await setDoc(doc(db, 'transactions', tx.id), tx);
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `transactions/${tx.id}`);
      }
    } else {
      const updated = [tx, ...transactionsList];
      setTransactionsList(updated);
      localStorage.setItem('war_transactions_sim', JSON.stringify(updated));
    }
  };

  // 6. Admin modifies a player parameters (e.g. adding coins directly or upgrading level)
  const handleUpdatePlayerAdmin = async (targetPlayer: Player) => {
    if (isFirebaseLive) {
      try {
        await setDoc(doc(db, 'players', targetPlayer.id), targetPlayer);
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `players/${targetPlayer.id}`);
      }
    } else {
      localStorage.setItem(`war_player_${targetPlayer.id}`, JSON.stringify(targetPlayer));
      setPlayersList(prev => prev.map(p => p.id === targetPlayer.id ? targetPlayer : p));
      
      // If we are editing ourselves, sync state
      if (playerData && targetPlayer.id === playerData.id) {
        setPlayerData(targetPlayer);
      }
    }
  };

  // 7. General Transactions updater (e.g. rejection)
  const handleUpdateTransaction = async (tx: Transaction) => {
    if (isFirebaseLive) {
      try {
        await setDoc(doc(db, 'transactions', tx.id), tx);
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `transactions/${tx.id}`);
      }
    } else {
      const updated = transactionsList.map(t => t.id === tx.id ? tx : t);
      setTransactionsList(updated);
      localStorage.setItem('war_transactions_sim', JSON.stringify(updated));
    }
  };

  // 8. Transaction Approval (Crediting coins dynamically)
  const handleApproveTransaction = async (tx: Transaction) => {
    const updatedTx: Transaction = {
      ...tx,
      status: 'approved',
      approvedAt: new Date().toISOString()
    };

    // Credit coins to target player
    if (isFirebaseLive) {
      try {
        // Edit transaction status
        await setDoc(doc(db, 'transactions', tx.id), updatedTx);
        
        // Load target player profile
        const pRef = doc(db, 'players', tx.userId);
        const pSnap = await getDoc(pRef);
        if (pSnap.exists()) {
          const loadedUser = pSnap.data() as Player;
          const updatedUser = {
            ...loadedUser,
            coins: loadedUser.coins + tx.coinsGranted
          };
          await setDoc(pRef, updatedUser);
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `transactions/${tx.id}`);
      }
    } else {
      // Local proxy approval
      const updatedTxs = transactionsList.map(t => t.id === tx.id ? updatedTx : t);
      setTransactionsList(updatedTxs);
      localStorage.setItem('war_transactions_sim', JSON.stringify(updatedTxs));

      const targetCached = localStorage.getItem(`war_player_${tx.userId}`);
      if (targetCached) {
        const loaded: Player = JSON.parse(targetCached);
        const updatedUser = {
          ...loaded,
          coins: loaded.coins + tx.coinsGranted
        };
        localStorage.setItem(`war_player_${tx.userId}`, JSON.stringify(updatedUser));
        setPlayersList(prev => prev.map(p => p.id === tx.userId ? updatedUser : p));
        
        // Sync itself if admin approved own transaction for testing
        if (playerData && tx.userId === playerData.id) {
          setPlayerData(updatedUser);
        }
      }
    }
  };

  // 9. Login actions
  const handleGoogleSignIn = async () => {
    synths.playClick();
    if (isFirebaseLive) {
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (error) {
        console.error('Google Sign In failed', error);
      }
    } else {
      // Simulate login immediately on Sandbox mode with active custom parameters
      setLoading(true);
      setTimeout(() => {
        const cleanUid = `GUEST_ID_${Date.now().toString().slice(-6)}`;
        setCurrentUser({
          uid: cleanUid,
          displayName: 'المشرف التكتيكي',
          email: guestEmail,
          emailVerified: true
        } as any);
        setGuestMode(true);
        syncPlayerProfile(cleanUid, 'المشرف التكتيكي', guestEmail);
        setLoading(false);
      }, 500);
    }
  };

  const handleAdminCredentialsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    synths.playClick();
    if (adminUsername === 'admin' && adminPassword === 'admin1234') {
      setLoading(true);
      setAdminError('');
      
      const adminUid = 'ADMIN_SUPER_SECURE_KEY_53';
      const adminEmail = 'nesmanagah53@gmail.com';
      const adminDisplayName = 'المشرف العام (Admin)';
      
      setCurrentUser({
        uid: adminUid,
        displayName: adminDisplayName,
        email: adminEmail,
        emailVerified: true
      } as any);
      
      setGuestMode(true);
      
      // Synchronize player profile as admin
      await syncPlayerProfile(adminUid, adminDisplayName, adminEmail);
      
      // Clear credentials
      setAdminUsername('');
      setAdminPassword('');
      
      // Auto routing into the secure Admin Tab
      setCurrentTab('admin');
      setLoading(false);
    } else {
      setAdminError('خطأ: بيانات الدخول الفنية للمشرف غير صحيحة!');
      synths.playClick();
    }
  };

  const handleSignOut = async () => {
    synths.playClick();
    if (isFirebaseLive) {
      await signOut(auth);
    } else {
      setCurrentUser(null);
      setGuestMode(false);
      setPlayerData(null);
    }
  };

  // 10. Process Three.js Arena Match Outcome stats rewards!
  const handleMatchFinished = (score: MatchScore) => {
    if (!playerData) return;

    // Build the post-game upgrades
    const updated = { ...playerData };
    updated.kills += score.kills;
    updated.deaths += score.victory ? updated.deaths : updated.deaths + 1; // died if lost
    updated.coins += score.coinsEarned;
    updated.xp += score.xpEarned;

    // Assess level-ups
    const xpBonusNeeded = updated.level * 450;
    if (updated.xp >= xpBonusNeeded) {
      updated.xp = updated.xp - xpBonusNeeded;
      updated.level += 1;
      synths.playLevelUp();
    }

    handleUpdatePlayerData(updated);
    setInBattle(false);
    setSelectedMap(ALL_MAPS[0]);
  };

  const activeWeapon = ALL_WEAPONS.find(w => w.id === playerData?.selectedWeapon) || ALL_WEAPONS[0];
  const activeSkin = ALL_SKINS.find(s => s.id === playerData?.selectedSkin) || ALL_SKINS[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased text-right selection:bg-indigo-500 selection:text-white pb-12">
      
      {/* Dynamic Background Image overlay for tactical battlefield immersion (referencing image generation recommendation standard React code) */}
      <div 
        className="absolute inset-0 h-[480px] bg-cover bg-center pointer-events-none opacity-15 select-none"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2000')` }}
      />
      <div className="absolute inset-0 h-[480px] bg-gradient-to-b from-slate-950/0 to-slate-950 pointer-events-none select-none" />

      {/* Global Navbar Header */}
      <header className="relative z-10 border-b border-slate-900 bg-slate-950/90 backdrop-blur-md sticky top-0 mb-6">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          
          {/* User profile actions */}
          <div className="flex items-center gap-3">
            {loading ? (
              <span className="text-slate-500 text-xs font-mono">تحميل الجلسة...</span>
            ) : playerData ? (
              <div className="flex items-center gap-3">
                {/* Sign out */}
                <button
                  id="sign_out_btn"
                  onClick={handleSignOut}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:text-red-400 text-xs text-slate-400 font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  خروج الحساب
                </button>

                {/* Profile display summary */}
                <div className="text-left hidden md:block">
                  <span className="block text-xs font-bold text-white">{playerData.displayName}</span>
                  <span className="text-[10px] text-yellow-500 font-mono">🪙 {playerData.coins} ذهب</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {/* Non-configured workspace guide */}
                <span className="text-[10px] text-slate-500 hidden lg:inline-block">للاستخدام السريع، أدخل كبريد مشرف واضغط دخول</span>
                <input
                  id="guest_email_input"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="nesmanagah53@gmail.com"
                  className="bg-slate-900 border border-slate-800 p-1 px-2.5 rounded text-[11px] text-white font-mono placeholder-slate-700 focus:outline-none focus:border-indigo-500"
                />
                <button
                  id="login_demo_btn"
                  onClick={handleGoogleSignIn}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  دخول سريع للمشرف ⚡
                </button>
              </div>
            )}
          </div>

          {/* Database cloud sync badge indicator */}
          <div className="hidden sm:flex items-center gap-2">
            {isFirebaseLive ? (
              <span className="px-2.5 py-1 rounded bg-emerald-950/50 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                سحابة فايبريز نشطة ✅
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded bg-amber-950/50 border border-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center gap-1">
                تشغيل الـ Sandbox المحلي 🕹️
              </span>
            )}
            <span className="text-xs text-slate-500 hidden md:inline">رقم الدعم: 01120194940</span>
          </div>

          {/* Big title with custom font */}
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>حرب الصحراء مـ3Dـطلق 💥</span>
              <Swords className="w-6 h-6 text-red-500 animate-pulse" />
            </h1>
          </div>

        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 relative z-10">

        {/* 1. If not authenticated, render splash login page */}
        {!playerData ? (
          <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl space-y-6 text-center mt-8 animate-fade-in text-slate-100">
            <div className="p-4 rounded-full bg-indigo-600/10 border border-indigo-600/30 inline-block text-indigo-400 mb-2">
              <Swords className="w-12 h-12 text-indigo-500 animate-bounce" />
            </div>

            <h2 className="text-3xl font-black text-white">ساحة المعركة الكبرى بانتظارك 🌐</h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
              لعبة حرب تكتيكية ثلاثية الأبعاد كاملة، يمكنك ترقية الأسلحة وحفظ تقدمك وشراء الملابس العسكرية عبر حسابك.
            </p>

            {/* PWA Mobile App Install Feature Banner */}
            <div className="mx-auto max-w-sm p-3 bg-gradient-to-r from-indigo-950/40 to-slate-950/60 border border-indigo-500/20 rounded-xl flex items-center justify-between gap-3 text-right">
              <div className="space-y-0.5">
                <span className="text-xs font-black text-indigo-300 block">📱 تثبيت التطبيق على الأندرويد والهاتف</span>
                <span className="text-[10px] text-slate-400 block font-semibold leading-tight">العب بملء الشاشة مع سرعة كاملة وبدون متصفح مكرر!</span>
              </div>
              <button
                id="install_pwa_banner_btn"
                onClick={handleInstallApp}
                className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[11px] rounded-lg shadow-lg shadow-indigo-900/40 active:scale-95 transition cursor-pointer shrink-0"
              >
                تنزيل الآن ⚡
              </button>
            </div>

            {/* Login Tabs Selector */}
            <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800/80">
              <button
                id="splash_tab_admin"
                type="button"
                onClick={() => { setLoginMode('admin'); synths.playClick(); }}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  loginMode === 'admin' ? 'bg-indigo-600 text-white shadow-md font-extrabold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                لوحة تحكم المسؤول (admin) ⚙️
              </button>
              <button
                id="splash_tab_player"
                type="button"
                onClick={() => { setLoginMode('player'); synths.playClick(); }}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  loginMode === 'player' ? 'bg-indigo-600 text-white shadow-md font-extrabold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                دخول اللاعبين (Players)
              </button>
            </div>

            {loginMode === 'admin' ? (
              /* Administrative Custom Login Form */
              <form onSubmit={handleAdminCredentialsSubmit} className="space-y-4 text-right bg-slate-950/40 p-5 rounded-xl border border-slate-800/60">
                <div className="text-center pb-2">
                  <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                    🔐 يرجى إدخال بيانات الإشراف الفني
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 block font-bold">اسم المستخدم (Username)</label>
                  <input
                    id="admin_username_input"
                    type="text"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="اكتب هنا اسم المستخدم الفني..."
                    className="w-full bg-slate-950 border border-slate-850 p-3 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 text-right pr-4 font-mono"
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 block font-bold">كلمة المرور الإدارية (Password)</label>
                  <input
                    id="admin_password_input"
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="اكتب هنا رمز المرور السري..."
                    className="w-full bg-slate-950 border border-slate-850 p-3 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 text-right pr-4 font-mono"
                    autoComplete="off"
                  />
                </div>

                {adminError && (
                  <div className="p-3 bg-red-950/50 border border-red-500/20 text-red-400 text-xs rounded-lg text-center font-bold">
                    ⚠️ {adminError}
                  </div>
                )}

                <button
                  id="admin_submit_btn"
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-extrabold rounded-xl transition duration-150 text-center flex items-center justify-center gap-2 text-sm shadow-xl cursor-pointer"
                >
                  <Shield className="w-4 h-4" />
                  تسجيل الدخول وعرض الطلبات فورا ⚡
                </button>
              </form>
            ) : (
              /* Normal Player access tab options */
              <div className="space-y-5">
                <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2.5 text-right text-xs">
                  <span className="font-bold text-yellow-500 block mb-1">🎮 خصائص اللعبة الرئيسية:</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                    <div>● رسوميات WebGL بمؤثرات قوية</div>
                    <div>● متجر أسلحة وترقيات ودروع</div>
                    <div>● دعم شحن سريع عبر InstaPay</div>
                    <div>● تفعيل تلقائي وآمن للمنصة</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <button
                    id="big_google_login_btn"
                    onClick={handleGoogleSignIn}
                    className="w-full py-4 bg-indigo-600 hover:bg-slate-100 active:bg-slate-200 hover:text-slate-900 text-white font-extrabold rounded-xl transition duration-200 text-center flex items-center justify-center gap-2 text-base shadow-xl cursor-pointer"
                  >
                    <Sparkles className="w-5 h-5 animate-spin" />
                    دخول المعركة الآن (حساب لاعب قتالي) ⚡
                  </button>

                  <p className="text-[10px] text-slate-500 leading-normal block max-w-md mx-auto">
                    ملاحظة: يمكنك إدخال أي بريد إلكتروني في الخانة العلوية للدخول تحت هويته كلاعب تجريبي، لمست بريد المشرف المعتمد <span className="font-mono text-indigo-400">nesmanagah53@gmail.com</span> وسيتم تفعيل صلاحيات الإدارة الكاملة تلقائياً!
                  </p>
                </div>
              </div>
            )}

          </div>
        ) : inBattle ? (
          /* 2. active three.js battlefield screen */
          <div className="space-y-4 animate-fade-in">
            <Battlefield
              activeMap={selectedMap}
              equippedWeapon={activeWeapon}
              equippedSkin={activeSkin}
              playerLevel={playerData.level}
              onMatchFinished={handleMatchFinished}
              onExit={() => {
                synths.playClick();
                setInBattle(false);
              }}
            />
          </div>
        ) : (
          /* 3. Main Dashboard screen */
          <div className="space-y-6">
            
            {/* Quick action warnings / notifications */}
            {!isFirebaseLive && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-center justify-between text-right text-xs text-amber-500 gap-4">
                <button
                  onClick={() => setIsChargeOpen(true)}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-slate-900 text-[10px] border border-amber-500/30 rounded-lg transition shrink-0"
                >
                  تجربة نظام الشحن والتحصيل تفصيليًا 💳
                </button>
                <div className="flex items-center gap-2">
                  <span>تم التوجيه نحو الخادم المحلي: يمكنك تجربة اللعب وحفظ النقاط والشراء مباشرة. انقر لتجربة الشحن مجاناً ومحاكاة موافقة المشرف!</span>
                  <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                </div>
              </div>
            )}

            {/* Tabs Controller */}
            <div className="flex gap-2 border-b border-slate-900 pb-2">
              {playerData.role === 'admin' && (
                <button
                  id="tab_nav_admin"
                  onClick={() => { setCurrentTab('admin'); synths.playClick(); }}
                  className={`px-4.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    currentTab === 'admin' ? 'bg-indigo-600/25 border border-indigo-500 text-indigo-400' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  لوحة التحكم الإدارية (Admin)
                </button>
              )}
              
              <button
                id="tab_nav_inventory"
                onClick={() => { setCurrentTab('inventory'); synths.playClick(); }}
                className={`px-4.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  currentTab === 'inventory' ? 'bg-indigo-600/25 border border-indigo-500 text-indigo-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shield className="w-4 h-4 bg-indigo-500/10 text-indigo-400" />
                مخزني وترقياتي (Armory)
              </button>

              <button
                id="tab_nav_lobby"
                onClick={() => { setCurrentTab('lobby'); synths.playClick(); }}
                className={`px-4.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  currentTab === 'lobby' ? 'bg-indigo-600/25 border border-indigo-500 text-indigo-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Compass className="w-4 h-4" />
                ساحة اللعب (Lobby)
              </button>
            </div>

            {/* Tab: Lobby layout with map selections */}
            {currentTab === 'lobby' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Visual maps lists selector */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex justify-between items-center bg-slate-900/60 p-4 border border-slate-800 rounded-xl">
                    <span className="text-xs text-slate-400">اختر الخريطة التكتيكية لبدء قتال ثلاثي الأبعاد</span>
                    <h3 className="text-base font-black text-white">خرائط الاشتباك المتوفرة ({ALL_MAPS.length})</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {ALL_MAPS.map((map) => {
                      const isSelected = selectedMap.id === map.id;
                      return (
                        <div
                          id={`map_card_${map.id}`}
                          key={map.id}
                          onClick={() => { setSelectedMap(map); synths.playClick(); }}
                          className={`border rounded-xl p-5 text-right flex flex-col justify-between h-[180px] transition cursor-pointer ${
                            isSelected 
                              ? 'border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/30' 
                              : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <span className="text-xs text-slate-500">موت ومستوى قتالي</span>
                            <h4 className="font-bold text-white text-base mt-1">{map.nameAr}</h4>
                            <p className="text-[10px] text-slate-400 mt-2 font-sans line-clamp-2 leading-relaxed">
                              {map.descriptionAr}
                            </p>
                          </div>

                          <div className="flex justify-between items-center border-t border-slate-800/80 pt-3 text-[10px]">
                            <span className="text-indigo-400 font-bold">● {map.obstaclesCount} حواجز تكتيكية</span>
                            <span 
                              className="px-2 py-0.5 rounded text-[8px] font-sans font-extrabold uppercase"
                              style={{ backgroundColor: `${map.primaryColor}20`, color: map.primaryColor }}
                            >
                              قياس {map.groundSize}م
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Battle Launcher Hero section */}
                  <div className="bg-slate-900/80 border border-slate-800/80 p-6 rounded-2xl flex flex-col md:flex-row gap-6 justify-between items-center relative overflow-hidden">
                    <div className="flex flex-col items-center sm:items-end w-full md:w-auto">
                      <button
                        id="launch_battle_action"
                        onClick={() => {
                          synths.playLevelUp();
                          setInBattle(true);
                        }}
                        className="px-8 py-4.5 bg-red-600 hover:bg-red-700 text-white font-black text-lg rounded-2xl shadow-xl hover:shadow-red-600/10 hover:shadow-2xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
                      >
                        <Play className="w-5.5 h-5.5 fill-current" />
                        بدء القتال في {selectedMap.nameAr} 💥
                      </button>
                      <span className="text-[10px] text-slate-500 text-right mt-2 font-sans">تتحمل الرتبة التكتيكية مسؤولية تأمين النصر.</span>
                    </div>

                    <div className="text-center md:text-right space-y-1 md:flex-1">
                      <span className="text-yellow-500 font-bold text-xs uppercase block">أنت جاهز تمامًا!</span>
                      <h4 className="text-xl font-black text-white">تأهب للتدخل السريع</h4>
                      <p className="text-xs text-slate-400 max-w-sm ml-auto leading-relaxed">
                        السلاح المجهز: <span className="text-white font-bold">{activeWeapon.nameAr}</span> | الدرع النشط: <span className="text-white font-bold">{activeSkin.nameAr}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sidebar fast overview logs & Quick rewards */}
                <div className="space-y-4">
                  {/* Free cash charge banner */}
                  <div className="bg-gradient-to-l from-indigo-900/80 to-slate-950 border border-indigo-500/20 p-5 rounded-2xl text-right">
                    <Coins className="w-8 h-8 text-yellow-500 mb-3 animate-bounce" />
                    <h4 className="font-extrabold text-white text-base">متجر الباقات الفورية 🪙</h4>
                    <p className="text-xs text-slate-300 mt-1 lines-clamp-3 leading-relaxed">
                      هل ينقصك المزيد من العملات لشراء بندقية القنص AWP أو بدلة القائد الملوكي؟ اشحن الآن فورا من 50 إلى 500 جنيه.
                    </p>
                    <button
                      onClick={() => { synths.playClick(); setIsChargeOpen(true); }}
                      className="mt-4 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black text-xs rounded-lg transition"
                    >
                      افتح باقات التحويل (InstaPay) ⚡
                    </button>
                  </div>

                  {/* Player micro leaderboard or recent logins simulation */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-right space-y-3">
                    <span className="text-[10px] font-bold text-slate-500 block">رتب اللاعبين النشطين مؤخرًا ({playersList.length})</span>
                    <div className="space-y-2 max-h-[160px] overflow-y-auto">
                      {playersList
                        .sort((a,b) => b.kills - a.kills)
                        .slice(0, 5)
                        .map((p, index) => (
                          <div key={p.id} className="flex justify-between items-center text-xs p-2 bg-slate-950/40 rounded border border-slate-900">
                            <span className="text-green-400 font-bold">{p.kills} قتلة</span>
                            <div className="flex items-center gap-1.5 font-sans">
                              {index === 0 && <span className="text-yellow-400">👑</span>}
                              <span className="text-slate-200">{p.displayName}</span>
                            </div>
                          </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Tab: Armory profile customization */}
            {currentTab === 'inventory' && (
              <ProfileView
                player={playerData}
                onUpdatePlayer={handleUpdatePlayerData}
                onOpenCharge={() => setIsChargeOpen(true)}
              />
            )}

            {/* Tab: Admin Interface panel */}
            {currentTab === 'admin' && playerData.role === 'admin' && (
              <AdminPanel
                players={playersList}
                transactions={transactionsList}
                onUpdatePlayer={handleUpdatePlayerAdmin}
                onUpdateTransaction={handleUpdateTransaction}
                onApproveTransaction={handleApproveTransaction}
              />
            )}

          </div>
        )}

      </main>

      {/* Charge Packages instapay dialog */}
      {isChargeOpen && playerData && (
        <ChargeModal
          userId={playerData.id}
          userEmail={playerData.email}
          onNewTransaction={(tx) => {
            handleNewTransaction(tx);
            setIsChargeOpen(false);
          }}
          onClose={() => {
            synths.playClick();
            setIsChargeOpen(false);
          }}
        />
      )}

    </div>
  );
}
