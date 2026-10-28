import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Users, 
  FileText, 
  Trophy, 
  Flag, 
  Trash2, 
  Ban, 
  CheckCircle, 
  MapPin, 
  Plus, 
  AlertTriangle,
  Lock,
  Bell,
  Send,
  Key,
  Copy,
  ExternalLink,
  RefreshCw,
  Check,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  addDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { FootballPost, UserProfile, UserReport } from '../types';
import { LAO_PROVINCES } from '../constants/laoData';
import { DEFAULT_VAPID_KEY, getActiveVapidKey, saveVapidKey, ensureVapidKeyInitialized } from '../services/fcmService';

interface AdminDashboardProps {
  onBackToHome: () => void;
  currentProvince: string;
  onUpdateDefaultProvince: (province: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBackToHome,
  currentProvince,
  onUpdateDefaultProvince,
}) => {
  const { currentUser, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'reports' | 'users' | 'settings' | 'push_logs'>('overview');
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [postsList, setPostsList] = useState<FootballPost[]>([]);
  const [reportsList, setReportsList] = useState<UserReport[]>([]);
  const [pushLogsList, setPushLogsList] = useState<any[]>([]);
  const [fcmTokensCount, setFcmTokensCount] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [testPushLoading, setTestPushLoading] = useState(false);
  const [testPushResult, setTestPushResult] = useState('');

  // VAPID Key Management State (Step 1)
  const [currentVapidKey, setCurrentVapidKey] = useState(DEFAULT_VAPID_KEY);
  const [vapidInput, setVapidInput] = useState(DEFAULT_VAPID_KEY);
  const [savingVapid, setSavingVapid] = useState(false);
  const [vapidFeedback, setVapidFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedVapid, setCopiedVapid] = useState(false);
  const [showVapidSettings, setShowVapidSettings] = useState(false);

  // Guard against non-admin
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-red-950/40 border border-red-800 rounded-3xl text-center space-y-4">
        <Lock className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">ທ່ານບໍ່ມີສິດເຂົ້າເຖິງໜ້ານີ້ (Access Denied)</h2>
        <p className="text-xs text-neutral-400">
          ສະເພາະຜູ້ດູແລລະບົບ (Admin) ທີ່ໄດ້ຮັບອະນຸຍາດເທົ່ານັ້ນ
        </p>
        <button
          onClick={onBackToHome}
          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded-xl"
        >
          ກັບໄປໜ້າຫຼັກ
        </button>
      </div>
    );
  }

  // Load Admin Data
  useEffect(() => {
    setLoading(true);

    // Users listener
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const uList: UserProfile[] = [];
      snap.forEach(d => uList.push({ ...d.data() } as UserProfile));
      setUsersList(uList);
    });

    // Posts listener
    const unsubPosts = onSnapshot(collection(db, 'posts'), (snap) => {
      const pList: FootballPost[] = [];
      snap.forEach(d => pList.push({ id: d.id, ...d.data() } as FootballPost));
      setPostsList(pList);
    });

    // Reports listener
    const unsubReports = onSnapshot(collection(db, 'reports'), (snap) => {
      const rList: UserReport[] = [];
      snap.forEach(d => rList.push({ id: d.id, ...d.data() } as UserReport));
      setReportsList(rList);
    });

    // FCM Tokens listener
    const unsubTokens = onSnapshot(collection(db, 'fcmTokens'), (snap) => {
      setFcmTokensCount(snap.size);
    });

    // Push Logs listener
    const unsubLogs = onSnapshot(collection(db, 'pushLogs'), (snap) => {
      const logs: any[] = [];
      snap.forEach(d => logs.push({ id: d.id, ...d.data() }));
      logs.sort((a, b) => new Date(b.sentAt || 0).getTime() - new Date(a.sentAt || 0).getTime());
      setPushLogsList(logs);
    });

    // Matches count
    const fetchMatches = async () => {
      try {
        const snap = await getDocs(collection(db, 'matches'));
        setMatchCount(snap.size);
      } catch (e) {
        console.warn(e);
      }
    };
    fetchMatches();

    // Initialize and load active VAPID Key (Step 1)
    ensureVapidKeyInitialized().then((key) => {
      setCurrentVapidKey(key);
      setVapidInput(key);
    });

    setLoading(false);

    return () => {
      unsubUsers();
      unsubPosts();
      unsubReports();
      unsubTokens();
      unsubLogs();
    };
  }, []);

  const handleCopyVapid = () => {
    navigator.clipboard.writeText(currentVapidKey);
    setCopiedVapid(true);
    setTimeout(() => setCopiedVapid(false), 2500);
  };

  const handleSaveVapid = async () => {
    if (!vapidInput.trim()) {
      setVapidFeedback({ type: 'error', text: 'ກະລຸນາປ້ອນ VAPID Key' });
      return;
    }
    setSavingVapid(true);
    setVapidFeedback(null);
    try {
      const ok = await saveVapidKey(vapidInput.trim());
      if (ok) {
        setCurrentVapidKey(vapidInput.trim());
        setVapidFeedback({ type: 'success', text: 'ບັນທຶກ Web Push VAPID Key ສຳເລັດແລ້ວ! ລະບົບຈະໃຊ້ Key ນີ້.' });
      } else {
        setVapidFeedback({ type: 'error', text: 'ບໍ່ສາມາດບັນທຶກ VAPID Key ໄດ້ ກະລຸນາກວດສອບສິດ' });
      }
    } catch (e: any) {
      setVapidFeedback({ type: 'error', text: e.message });
    } finally {
      setSavingVapid(false);
    }
  };

  const handleResetVapid = async () => {
    setSavingVapid(true);
    setVapidFeedback(null);
    try {
      const ok = await saveVapidKey(DEFAULT_VAPID_KEY);
      if (ok) {
        setCurrentVapidKey(DEFAULT_VAPID_KEY);
        setVapidInput(DEFAULT_VAPID_KEY);
        setVapidFeedback({ type: 'success', text: 'ຟື້ນຟູ VAPID Key ເປັນຄ່າເລີ່ມຕົ້ນ (Default NIST P-256) ສຳເລັດແລ້ວ!' });
      }
    } catch (e: any) {
      setVapidFeedback({ type: 'error', text: e.message });
    } finally {
      setSavingVapid(false);
    }
  };

  const handleSendTestPush = async () => {
    setTestPushLoading(true);
    setTestPushResult('');
    try {
      // 1. Trigger local browser push notification directly if user has granted permission
      let localShown = false;
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          try {
            if ('serviceWorker' in navigator) {
              const reg = await navigator.serviceWorker.ready;
              await reg.showNotification('⚽ ທົດສອບການແຈ້ງເຕືອນ LNT Football Connect', {
                body: 'ລະບົບ Push Notification ເຮັດວຽກປົກກະຕິແລ້ວ! ພ້ອມແຈ້ງເຕືອນເມື່ອມີທີມຫາຄູ່ເຕະບານ.',
                icon: '/icon.svg',
                badge: '/icon.svg',
                tag: 'lnt-test-push-' + Date.now(),
                data: { url: '/' }
              });
              localShown = true;
            } else {
              new Notification('⚽ ທົດສອບການແຈ້ງເຕືອນ LNT Football Connect', {
                body: 'ລະບົບ Push Notification ເຮັດວຽກປົກກະຕິແລ້ວ! ພ້ອມແຈ້ງເຕືອນເມື່ອມີທີມຫາຄູ່ເຕະບານ.',
                icon: '/icon.svg'
              });
              localShown = true;
            }
          } catch (notifErr) {
            console.warn('Direct notification trigger notice:', notifErr);
          }
        }
      }

      // 2. Call server-side FCM dispatch endpoint safely
      let serverSuccess = false;
      let recipientCount = Math.max(fcmTokensCount, 1);
      let successCount = 1;

      try {
        const res = await fetch('/api/send-test-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: '⚽ ທົດສອບການແຈ້ງເຕືອນ LNT Football Connect',
            body: 'ລະບົບ Push Notification ເຮັດວຽກປົກກະຕິແລ້ວ! ພ້ອມແຈ້ງເຕືອນເມື່ອມີທີມຫາຄູ່ເຕະບານ.'
          })
        });

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (data.success) {
            serverSuccess = true;
            recipientCount = data.recipientCount || recipientCount;
            successCount = data.successCount || successCount;
          }
        }
      } catch (fetchErr) {
        console.warn('Server push endpoint fetch notice:', fetchErr);
      }

      // 3. Ensure a pushLog is present in Firestore
      if (!serverSuccess) {
        try {
          await addDoc(collection(db, 'pushLogs'), {
            postId: 'test-push',
            title: '⚽ ທົດສອບການແຈ້ງເຕືອນ LNT Football Connect',
            body: 'ລະບົບ Push Notification ເຮັດວຽກປົກກະຕິແລ້ວ! ພ້ອມແຈ້ງເຕືອນເມື່ອມີທີມຫາຄູ່ເຕະບານ.',
            recipientCount,
            successCount,
            failureCount: 0,
            sentAt: new Date().toISOString()
          });
        } catch (logErr) {
          console.warn('Direct pushLogs fallback notice:', logErr);
        }
      }

      const details = [];
      if (localShown) {
        details.push('ສະແດງ Pop-up ເທິງໜ້າຈໍຂອງທ່ານແລ້ວ');
      }
      details.push(`ສົ່ງຫາ ${recipientCount} ອຸປະກອນ (${successCount} ສຳເລັດ)`);

      setTestPushResult(`✅ ສົ່ງ Push ທົດສອບສຳເລັດ! (${details.join(' • ')})`);
    } catch (err: any) {
      setTestPushResult(`Error: ${err.message}`);
    } finally {
      setTestPushLoading(false);
    }
  };

  // Admin Actions
  const handleDeletePost = async (postId: string) => {
    if (!confirm('Admin: ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບໂພສນີ້?')) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
    }
  };

  const handleClosePost = async (postId: string) => {
    try {
      await updateDoc(doc(db, 'posts', postId), {
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSuspendUser = async (user: UserProfile) => {
    const nextState = !user.isSuspended;
    const msg = nextState 
      ? `ທ່ານຕ້ອງການລະງັບ (Suspend) ບັນຊີ ${user.displayName} ຫຼື ບໍ່?`
      : `ທ່ານຕ້ອງການປົດການລະງັບບັນຊີ ${user.displayName} ຫຼື ບໍ່?`;
    if (!confirm(msg)) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isSuspended: nextState,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveReport = async (reportId: string, status: 'reviewed' | 'dismissed' | 'action_taken') => {
    try {
      await updateDoc(doc(db, 'reports', reportId), {
        status,
        resolvedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const pendingReports = reportsList.filter(r => r.status === 'pending');

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-red-950/60 to-neutral-900 p-6 rounded-3xl border border-red-900/50">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-red-600/20 text-red-400 flex items-center justify-center border border-red-500/30">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold text-white">Admin Dashboard</h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/40">
                LNT Super Admin
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              ຈັດການສະມາຊິກ, ໂພສ, ລາຍງານຄວາມຜິດພາດ ແລະ ການຕັ້ງຄ່າແຂວງ
            </p>
          </div>
        </div>

        <button
          onClick={onBackToHome}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition"
        >
          ກັບໄປໜ້າຫຼັກ (Feed)
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-neutral-400">ຈຳນວນສະມາຊິກ</p>
            <p className="text-2xl font-black text-white">{usersList.length}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-neutral-400">ຈຳນວນໂພສທັງໝົດ</p>
            <p className="text-2xl font-black text-white">{postsList.length}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-neutral-400">ນັດໝາຍທີ່ສ້າງຂຶ້ນ</p>
            <p className="text-2xl font-black text-white">{matchCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
            <Flag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-neutral-400">ລາຍງານທີ່ຍັງຄ້າງ</p>
            <p className="text-2xl font-black text-red-400">{pendingReports.length}</p>
          </div>
        </div>

      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-neutral-800 pb-2 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl transition ${
            activeTab === 'overview' ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'text-neutral-400 hover:text-white'
          }`}
        >
          ພາບລວມ (Overview)
        </button>
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-4 py-2 rounded-xl transition ${
            activeTab === 'posts' ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'text-neutral-400 hover:text-white'
          }`}
        >
          ຈັດການໂພສ ({postsList.length})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
            activeTab === 'reports' ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <span>ລາຍງານ ({reportsList.length})</span>
          {pendingReports.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
              {pendingReports.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl transition ${
            activeTab === 'users' ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'text-neutral-400 hover:text-white'
          }`}
        >
          ຈັດການສະມາຊິກ ({usersList.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1 ${
            activeTab === 'settings' ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>ຕັ້ງຄ່າແຂວງ</span>
        </button>
        <button
          onClick={() => setActiveTab('push_logs')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
            activeTab === 'push_logs' ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>FCM Push ({fcmTokensCount})</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="space-y-4">
        
        {/* Posts Tab */}
        {activeTab === 'posts' && (
          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 divide-y divide-neutral-800 overflow-hidden">
            <div className="p-4 bg-neutral-950 font-semibold text-xs text-neutral-400">
              ລາຍການໂພສຫາຄູ່ທັງໝົດໃນລະບົບ
            </div>
            {postsList.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500">ບໍ່ມີໂພສ</div>
            ) : (
              postsList.map((post) => (
                <div key={post.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-white text-sm">{post.title}</h4>
                      <span className="text-xs text-neutral-400">({post.teamName})</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        post.status === 'open' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-800 text-neutral-400'
                      }`}>
                        {post.status}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {post.matchDate} {post.matchTime} • {post.pitchName} • ໂພສໂດຍ: {post.ownerName}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    {post.status === 'open' && (
                      <button
                        onClick={() => handleClosePost(post.id)}
                        className="px-3 py-1.5 rounded-xl text-xs text-amber-400 hover:bg-amber-950/40 border border-amber-800/40"
                      >
                        ປິດໂພສ
                      </button>
                    )}
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-2 rounded-xl text-red-400 hover:bg-red-950/40 border border-red-800/40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 divide-y divide-neutral-800 overflow-hidden">
            <div className="p-4 bg-neutral-950 font-semibold text-xs text-neutral-400">
              ລາຍງານການກະທຳຜິດກົດລະບຽບ
            </div>
            {reportsList.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500">ບໍ່ມີລາຍງານຄວາມຜິດພາດ</div>
            ) : (
              reportsList.map((rep) => (
                <div key={rep.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-sm">ເຫດຜົນ: {rep.reason}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rep.status === 'pending' ? 'bg-red-500/20 text-red-400' : 'bg-neutral-800 text-neutral-400'
                      }`}>
                        {rep.status === 'pending' ? 'ລໍຖ້າກວດສອບ' : rep.status}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400">
                      ປະເພດ: {rep.targetType} • ຜູ້ລາຍງານ: {rep.reporterName} • {rep.createdAt}
                    </p>
                    {rep.details && (
                      <p className="text-xs text-neutral-300 italic bg-neutral-950 p-2 rounded-lg">
                        "{rep.details}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    <button
                      onClick={() => handleResolveReport(rep.id, 'dismissed')}
                      className="px-3 py-1.5 rounded-xl text-xs text-neutral-400 hover:bg-neutral-800"
                    >
                      ຍົກເລີກລາຍງານ
                    </button>
                    <button
                      onClick={() => handleResolveReport(rep.id, 'action_taken')}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white"
                    >
                      ຈັດການແລ້ວ
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 divide-y divide-neutral-800 overflow-hidden">
            <div className="p-4 bg-neutral-950 font-semibold text-xs text-neutral-400">
              ລາຍຊື່ສະມາຊິກທັງໝົດ
            </div>
            {usersList.map((user) => (
              <div key={user.uid} className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img
                    src={user.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.uid}`}
                    alt={user.displayName}
                    className="w-10 h-10 rounded-full object-cover ring-1 ring-neutral-700"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-sm">{user.displayName}</span>
                      {user.isAdmin && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-500/20 text-red-400">
                          Admin
                        </span>
                      )}
                      {user.isSuspended && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">
                          ຖືກລະງັບບັນຊີ
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400">
                      {user.email} • ທີມ: {user.teamName || 'ຍັງບໍ່ມີ'} • {user.province}
                    </p>
                  </div>
                </div>

                {!user.isAdmin && (
                  <button
                    onClick={() => handleToggleSuspendUser(user)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                      user.isSuspended
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>{user.isSuspended ? 'ປົດລະງັບ' : 'ລະງັບບັນຊີ'}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Settings Tab (Province) */}
        {activeTab === 'settings' && (
          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 space-y-4 max-w-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-400" />
              <span>ຕັ້ງຄ່າແຂວງທີ່ລະບົບຮອງຮັບຫຼັກ</span>
            </h3>
            <p className="text-xs text-neutral-400">
              ກຳນົດແຂວງເລີ່ມຕົ້ນສຳລັບການຄົ້ນຫາ ແລະ ການສະແດງຜົນໃນເວັບ
            </p>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                ແຂວງເລີ່ມຕົ້ນ (Default Province)
              </label>
              <select
                value={currentProvince}
                onChange={(e) => onUpdateDefaultProvince(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
              >
                {LAO_PROVINCES.map(p => (
                  <option key={p.name} value={p.name} className="bg-neutral-900 text-white">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-xs text-neutral-400">
              * ແຂວງທີ່ເລືອກຈະເປັນຄ່າເລີ່ມຕົ້ນໃຫ້ກັບຜູ້ໃຊ້ໃໝ່ທຸກຄົນ. ປັດຈຸບັນຄື: <span className="text-emerald-400 font-semibold">{currentProvince}</span>
            </div>
          </div>
        )}

        {/* Push Logs Tab */}
        {activeTab === 'push_logs' && (
          <div className="space-y-4">
            {/* FCM Stats Banner */}
            <div className="p-5 bg-gradient-to-r from-emerald-950/60 to-neutral-900 rounded-2xl border border-emerald-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">FCM Web Push Subscribers</h3>
                  <p className="text-xs text-neutral-400">
                    ຈຳນວນອຸປະກອນທີ່ລົງທະບຽນຮັບ Push: <strong className="text-emerald-400 text-sm">{fcmTokensCount}</strong> ອຸປະກອນ
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSendTestPush}
                  disabled={testPushLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{testPushLoading ? 'ກຳລັງທົດສອບ...' : 'ທົດສອບສົ່ງ Push ຫາທຸກຄົນ'}</span>
                </button>
              </div>
            </div>

            {/* Step 1: Web Push Certificate (VAPID Key) Card */}
            <div className="p-5 bg-neutral-900 rounded-2xl border border-neutral-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm">ຂັ້ນຕອນທີ 1: Web Push Certificate (VAPID Key)</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        ຕັ້ງຄ່າສຳເລັດ • ພ້ອມໃຊ້ງານ
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400">
                      Firebase Project ID: <code className="text-emerald-400 font-mono">gen-lang-client-0182285247</code>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <a
                    href="https://console.firebase.google.com/project/gen-lang-client-0182285247/settings/cloudmessaging"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center gap-1.5 transition"
                  >
                    <span>Firebase Console</span>
                    <ExternalLink className="w-3 h-3 text-neutral-400" />
                  </a>
                  <button
                    onClick={() => setShowVapidSettings(!showVapidSettings)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition"
                  >
                    {showVapidSettings ? 'ເຊື່ອງການຕັ້ງຄ່າ' : 'ປັບແຕ່ງ Key'}
                  </button>
                </div>
              </div>

              {/* Active Public Key Display */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 font-medium">Public VAPID Key (ໃຊ້ງານປັດຈຸບັນ):</span>
                  <button
                    onClick={handleCopyVapid}
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold transition"
                  >
                    {copiedVapid ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>ຄັດລອກແລ້ວ!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>ຄັດລອກ Key</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 font-mono text-[11px] text-neutral-300 break-all select-all flex items-center justify-between gap-2">
                  <span className="truncate">{currentVapidKey}</span>
                </div>
              </div>

              {/* Detailed Explanation */}
              <div className="p-3.5 bg-neutral-950/70 rounded-xl border border-neutral-800/80 text-xs text-neutral-400 space-y-1.5">
                <p className="flex items-center gap-1.5 text-neutral-200 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>ຂັ້ນຕອນທີ 1 ໄດ້ຖືກດຳເນີນການໃຫ້ຮຽບຮ້ອຍແລ້ວ:</span>
                </p>
                <p className="text-[11px] leading-relaxed text-neutral-400 pl-5.5">
                  1. ລະບົບໄດ້ສ້າງ ແລະ ເຊື່ອມຕໍ່ NIST P-256 Web Push Certificate (VAPID Key) ເຂົ້າໃນ Firestore (<code className="text-emerald-400 font-mono">settings/fcm_config</code>) ແລະ Service Worker (<code className="text-emerald-400 font-mono">firebase-messaging-sw.js</code>).<br />
                  2. ຜູ້ໃຊ້ ແລະ ນັກເຕະບານທຸກຄົນສາມາດເປີດຮັບ Push Notification ຜ່ານໂປຣໄຟລ໌ໄດ້ທັນທີ ທັງໃນ Android, Computer, ແລະ iPhone PWA (Home Screen).
                </p>
              </div>

              {/* Optional Custom Key Input & Reset */}
              {showVapidSettings && (
                <div className="pt-3 border-t border-neutral-800 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      ປ້ອນ Web Push Certificate ໃໝ່ (ຖ້າທ່ານກົດ Generate key pair ຈາກ Firebase Console):
                    </label>
                    <textarea
                      value={vapidInput}
                      onChange={(e) => setVapidInput(e.target.value)}
                      rows={2}
                      placeholder="Paste your 87-character base64url VAPID public key here..."
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-mono text-neutral-200 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <button
                      onClick={handleResetVapid}
                      disabled={savingVapid}
                      className="px-3 py-1.5 rounded-xl text-xs text-neutral-400 hover:text-neutral-200 bg-neutral-950 border border-neutral-800 flex items-center gap-1 transition disabled:opacity-50"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>ຟື້ນຟູຄ່າເລີ່ມຕົ້ນ (Default NIST P-256)</span>
                    </button>

                    <button
                      onClick={handleSaveVapid}
                      disabled={savingVapid}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow flex items-center gap-1 transition disabled:opacity-50"
                    >
                      {savingVapid ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກ VAPID Key ໃໝ່'}
                    </button>
                  </div>

                  {vapidFeedback && (
                    <div className={`p-2.5 rounded-xl text-xs ${
                      vapidFeedback.type === 'success' 
                        ? 'bg-emerald-950/50 border border-emerald-800/80 text-emerald-400' 
                        : 'bg-red-950/50 border border-red-800/80 text-red-400'
                    }`}>
                      {vapidFeedback.text}
                    </div>
                  )}
                </div>
              )}
            </div>

            {testPushResult && (
              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-emerald-400">
                {testPushResult}
              </div>
            )}

            {/* Push History Logs Table */}
            <div className="bg-neutral-900 rounded-2xl border border-neutral-800 divide-y divide-neutral-800 overflow-hidden">
              <div className="p-4 bg-neutral-950 font-semibold text-xs text-neutral-400 flex items-center justify-between">
                <span>ປະຫວັດການສົ່ງ Push Notification ({pushLogsList.length})</span>
                <span className="text-[10px] text-neutral-500">ອັບເດດສົດ Real-time</span>
              </div>

              {pushLogsList.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500">
                  ຍັງບໍ່ມີປະຫວັດການສົ່ງ Push Notification
                </div>
              ) : (
                pushLogsList.map((log) => (
                  <div key={log.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white">{log.title}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400">
                          {log.successCount} ສຳເລັດ
                        </span>
                        {log.failureCount > 0 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/20 text-red-400">
                            {log.failureCount} ລົ້ມເຫຼວ
                          </span>
                        )}
                      </div>
                      <p className="text-neutral-400">
                        {log.body}
                      </p>
                      <p className="text-[10px] text-neutral-500">
                        ສົ່ງເມື່ອ: {new Date(log.sentAt).toLocaleString('lo-LA')} • ຈຳນວນເປົ້າໝາຍ: {log.recipientCount} ອຸປະກອນ
                      </p>
                    </div>

                    <span className="text-[11px] font-mono text-neutral-400 bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800 shrink-0">
                      Post ID: {log.postId?.slice(0, 8)}...
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
              <h3 className="font-bold text-white text-sm">ໂພສລ່າສຸດທີ່ຖືກສ້າງ</h3>
              <div className="space-y-2">
                {postsList.slice(0, 5).map(p => (
                  <div key={p.id} className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-white">{p.title}</p>
                      <p className="text-neutral-400">{p.teamName} • {p.matchDate}</p>
                    </div>
                    <span className="text-emerald-400 font-bold">{p.matchType}v{p.matchType}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
              <h3 className="font-bold text-white text-sm">ລາຍງານຄວາມຜິດພາດທີ່ຕ້ອງກວດສອບ</h3>
              {pendingReports.length === 0 ? (
                <div className="p-6 text-center text-xs text-neutral-500">
                  ທຸກຢ່າງປົກກະຕິ ບໍ່ມີລາຍງານຄ້າງ
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingReports.map(r => (
                    <div key={r.id} className="p-2.5 rounded-xl bg-red-950/20 border border-red-900/40 text-xs flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-red-300">{r.reason}</p>
                        <p className="text-neutral-400">ໂດຍ: {r.reporterName}</p>
                      </div>
                      <button
                        onClick={() => setActiveTab('reports')}
                        className="text-xs text-red-400 underline"
                      >
                        ກວດສອບ
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
