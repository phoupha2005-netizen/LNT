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
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { FootballPost, UserProfile, UserReport } from '../types';
import { LAO_PROVINCES } from '../constants/laoData';

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

  const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'reports' | 'users' | 'settings'>('overview');
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [postsList, setPostsList] = useState<FootballPost[]>([]);
  const [reportsList, setReportsList] = useState<UserReport[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [loading, setLoading] = useState(true);

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

    setLoading(false);

    return () => {
      unsubUsers();
      unsubPosts();
      unsubReports();
    };
  }, []);

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
