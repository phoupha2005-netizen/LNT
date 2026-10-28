import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  Calendar, 
  Users, 
  Award, 
  PlusCircle, 
  RefreshCw, 
  CheckCircle2, 
  Trophy, 
  SlidersHorizontal, 
  Sparkles,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { PostCard } from './components/PostCard';
import { PostDetailModal } from './components/PostDetailModal';
import { CreateEditPostModal } from './components/CreateEditPostModal';
import { ChallengeModal } from './components/ChallengeModal';
import { ChatModal } from './components/ChatModal';
import { ProfileModal } from './components/ProfileModal';
import { AuthModal } from './components/AuthModal';
import { ReportModal } from './components/ReportModal';
import { NotificationsModal } from './components/NotificationsModal';
import { MyMatchesView } from './components/MyMatchesView';
import { AdminDashboard } from './components/AdminDashboard';
import { FootballPost, AppNotification, MatchRequest } from './types';
import { 
  DEFAULT_PROVINCE, 
  LAO_PROVINCES, 
  MATCH_FORMATS, 
  SKILL_LEVELS, 
  PRESET_TEAM_LOGOS, 
  POPULAR_PITCHES_LNT 
} from './constants/laoData';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  doc, 
  deleteDoc, 
  addDoc, 
  getDocs,
  setDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

function MainApp() {
  const { currentUser, userProfile, isAdmin, isSuspended } = useAuth();

  // Navigation View State
  const [activeView, setActiveView] = useState<'home' | 'my-matches' | 'admin'>('home');

  // Province State
  const [currentProvince, setCurrentProvince] = useState(DEFAULT_PROVINCE);

  // Posts State
  const [posts, setPosts] = useState<FootballPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [selectedSkill, setSelectedSkill] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Notifications & Badges
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [myPendingRequestsCount, setMyPendingRequestsCount] = useState(0);
  const [mySentRequests, setMySentRequests] = useState<string[]>([]); // postIds that I've challenged

  // Modals State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false);
  const [postToEdit, setPostToEdit] = useState<FootballPost | null>(null);
  const [selectedDetailPost, setSelectedDetailPost] = useState<FootballPost | null>(null);
  const [selectedChallengePost, setSelectedChallengePost] = useState<FootballPost | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [targetChatUser, setTargetChatUser] = useState<{ uid: string; displayName: string; photoURL?: string } | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [targetReport, setTargetReport] = useState<{ type: 'post' | 'user' | 'chat'; id: string; name: string } | null>(null);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);

  // Load Settings (Default province from Firestore)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'system_config'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.currentProvince) {
          setCurrentProvince(data.currentProvince);
        }
      }
    });
    return () => unsub();
  }, []);

  // Update System Default Province by Admin
  const handleUpdateDefaultProvince = async (newProv: string) => {
    setCurrentProvince(newProv);
    try {
      await setDoc(doc(db, 'settings', 'system_config'), {
        currentProvince: newProv,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn(e);
    }
  };

  // Real-time Posts Listener (Filtered to current province)
  useEffect(() => {
    setLoadingPosts(true);

    const postsQuery = query(collection(db, 'posts'));
    const unsub = onSnapshot(postsQuery, (snapshot) => {
      const list: FootballPost[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as FootballPost);
      });
      // Sort desc by creation date
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setPosts(list);
      setLoadingPosts(false);
    }, (error) => {
      console.warn('Posts listener error:', error);
      setLoadingPosts(false);
    });

    return () => unsub();
  }, []);

  // Seed sample initial posts for Louang Namtha if empty
  const handleSeedSampleData = async () => {
    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);
      const dayAfterStr = dayAfter.toISOString().split('T')[0];

      const sample1: Omit<FootballPost, 'id'> = {
        ownerId: currentUser.uid,
        ownerName: 'ບິກ ນ້ຳທາ (Namtha FC)',
        ownerPhotoURL: PRESET_TEAM_LOGOS[0].url,
        title: 'ຫາຄູ່ເຕະບານ 7 ຄົນ ແລງວັນເສົາ ນ້ຳທາ ອາຣີນາ',
        teamName: 'LNT Tigers',
        teamLogo: PRESET_TEAM_LOGOS[0].url,
        matchType: '7',
        matchDate: tomorrowStr,
        matchTime: '17:30',
        pitchName: POPULAR_PITCHES_LNT[1],
        province: 'ຫຼວງນ້ຳທາ (LNT)',
        district: 'ເມືອງນ້ຳທາ',
        skillLevel: 'ປານກາງ / ທົ່ວໄປ',
        pitchFee: '250,000 ກີບ',
        feeType: 'split',
        details: 'ຫາທີມເຕະບານມ່ວນຊື່ນ ຮັກສາສຸຂະພາບ ຫຼິ້ນສະອາດ ບໍ່ມີເລື່ອງ. ກຽມເສື້ອທີມສີດຳ ຫຼື ສີຂຽວ.',
        contactPhone: '020 5566 7788',
        contactWhatsapp: '020 5566 7788',
        hidePhone: false,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const sample2: Omit<FootballPost, 'id'> = {
        ownerId: 'sample_host_2',
        ownerName: 'ອາຈານ ສົມພອນ (Sing FC)',
        ownerPhotoURL: PRESET_TEAM_LOGOS[1].url,
        title: 'ນັດເຕະບານກະຊັບມິດຕະພາບ 5 ຄົນ ທີ່ເມືອງສິງ',
        teamName: 'Golden Dragon FC',
        teamLogo: PRESET_TEAM_LOGOS[1].url,
        matchType: '5',
        matchDate: dayAfterStr,
        matchTime: '18:00',
        pitchName: POPULAR_PITCHES_LNT[2],
        province: 'ຫຼວງນ້ຳທາ (LNT)',
        district: 'ເມືອງສິງ',
        skillLevel: 'ມ່ວນຊື່ນ / ອອກກຳລັງກາຍ',
        pitchFee: '180,000 ກີບ',
        feeType: 'split',
        details: 'ສາຍອອກກຳລັງກາຍຫຼັງເລີກວຽກ ເຕະມ່ວນໆ ເສື້ອສີແດງ ພ້ອມນ້ຳດື່ມຟຣີ!',
        contactPhone: '020 9988 1122',
        contactWhatsapp: '020 9988 1122',
        hidePhone: false,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'posts'), sample1);
      await addDoc(collection(db, 'posts'), sample2);
    } catch (e) {
      console.error(e);
    }
  };

  // Real-time Notifications & Requests Badge for current user
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setMyPendingRequestsCount(0);
      setMySentRequests([]);
      return;
    }

    // Notifications
    const notifQuery = query(
      collection(db, 'notifications'),
      where('recipientId', '==', currentUser.uid)
    );
    const unsubNotif = onSnapshot(notifQuery, (snapshot) => {
      const list: AppNotification[] = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as AppNotification));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(list);
    });

    // My incoming pending requests count
    const reqQuery = query(
      collection(db, 'matchRequests'),
      where('ownerId', '==', currentUser.uid),
      where('status', '==', 'pending')
    );
    const unsubReq = onSnapshot(reqQuery, (snapshot) => {
      setMyPendingRequestsCount(snapshot.size);
    });

    // Sent requests by me (to show "Sent Request" status on post cards)
    const sentReqQuery = query(
      collection(db, 'matchRequests'),
      where('requesterId', '==', currentUser.uid)
    );
    const unsubSent = onSnapshot(sentReqQuery, (snapshot) => {
      const pIds: string[] = [];
      snapshot.forEach(d => {
        const data = d.data();
        if (data.postId && (data.status === 'pending' || data.status === 'accepted')) {
          pIds.push(data.postId);
        }
      });
      setMySentRequests(pIds);
    });

    return () => {
      unsubNotif();
      unsubReq();
      unsubSent();
    };
  }, [currentUser]);

  // Handlers for Post Actions
  const handleCreatePostClick = () => {
    if (!currentUser) {
      setAuthMode('login');
      setAuthModalOpen(true);
      return;
    }
    setPostToEdit(null);
    setCreatePostModalOpen(true);
  };

  const handleEditPost = (post: FootballPost) => {
    setPostToEdit(post);
    setCreatePostModalOpen(true);
  };

  const handleDeletePost = async (post: FootballPost) => {
    if (!confirm(`ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບໂພສ "${post.title}"?`)) return;
    try {
      await deleteDoc(doc(db, 'posts', post.id));
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.DELETE, `posts/${post.id}`);
    }
  };

  const handleOpenChallenge = (post: FootballPost) => {
    if (!currentUser) {
      setAuthMode('login');
      setAuthModalOpen(true);
      return;
    }
    setSelectedChallengePost(post);
  };

  const handleOpenChatWithUser = (userId: string, userName: string, userPhoto?: string) => {
    if (!currentUser) {
      setAuthMode('login');
      setAuthModalOpen(true);
      return;
    }
    setTargetChatUser({ uid: userId, displayName: userName, photoURL: userPhoto });
    setChatModalOpen(true);
  };

  const handleReportPost = (post: FootballPost) => {
    if (!currentUser) {
      setAuthMode('login');
      setAuthModalOpen(true);
      return;
    }
    setTargetReport({ type: 'post', id: post.id, name: `ໂພສ: ${post.title} (ທີມ ${post.teamName})` });
    setReportModalOpen(true);
  };

  const handleReportUser = (userId: string, userName: string) => {
    if (!currentUser) {
      setAuthMode('login');
      setAuthModalOpen(true);
      return;
    }
    setTargetReport({ type: 'user', id: userId, name: `ຜູ້ໃຊ້: ${userName}` });
    setReportModalOpen(true);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedDistrict('all');
    setSelectedFormat('all');
    setSelectedSkill('all');
    setSelectedStatus('all');
    setSelectedDate('');
  };

  // Filter posts logic
  const activeProvinceObj = LAO_PROVINCES.find(p => p.name === currentProvince);
  const currentDistricts = activeProvinceObj ? activeProvinceObj.districts : [];

  const filteredPosts = posts.filter((post) => {
    // 1. Must be in current selected province
    if (post.province !== currentProvince) return false;

    // 2. Search query (team name, pitch, title, district)
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        post.teamName.toLowerCase().includes(q) ||
        post.pitchName.toLowerCase().includes(q) ||
        post.title.toLowerCase().includes(q) ||
        post.district.toLowerCase().includes(q);
      if (!matchSearch) return false;
    }

    // 3. District filter
    if (selectedDistrict !== 'all' && post.district !== selectedDistrict) {
      return false;
    }

    // 4. Format (5, 7, 11)
    if (selectedFormat !== 'all' && post.matchType !== selectedFormat) {
      return false;
    }

    // 5. Skill Level
    if (selectedSkill !== 'all' && post.skillLevel !== selectedSkill) {
      return false;
    }

    // 6. Status filter
    if (selectedStatus !== 'all' && post.status !== selectedStatus) {
      return false;
    }

    // 7. Date filter
    if (selectedDate && post.matchDate !== selectedDate) {
      return false;
    }

    return true;
  });

  const unreadNotifCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans pb-16 lg:pb-0">
      
      {/* Account Suspended Alert */}
      {isSuspended && (
        <div className="bg-red-600 text-white py-2 px-4 text-xs font-bold text-center flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>ບັນຊີຂອງທ່ານຖືກລະງັບຊົ່ວຄາວ ເນື່ອງຈາກການລະເມີດກົດລະບຽບ. ກະລຸນາຕິດຕໍ່ Admin ເພື່ອກວດສອບ.</span>
        </div>
      )}

      {/* Top Navigation */}
      <Navbar
        currentProvince={currentProvince}
        onSelectProvince={(prov) => setCurrentProvince(prov)}
        onOpenCreatePost={handleCreatePostClick}
        onOpenAuth={(mode) => {
          setAuthMode(mode || 'login');
          setAuthModalOpen(true);
        }}
        onOpenProfile={() => setProfileModalOpen(true)}
        onOpenChat={() => {
          setTargetChatUser(null);
          setChatModalOpen(true);
        }}
        onOpenNotifications={() => setNotificationsModalOpen(true)}
        onOpenAdmin={() => setActiveView('admin')}
        onNavigateHome={() => setActiveView('home')}
        onNavigateMyMatches={() => {
          if (!currentUser) {
            setAuthMode('login');
            setAuthModalOpen(true);
            return;
          }
          setActiveView('my-matches');
        }}
        activeView={activeView}
        unreadChatCount={0}
        unreadNotifCount={unreadNotifCount}
        pendingRequestsCount={myPendingRequestsCount}
      />

      {/* Views Routing */}
      {activeView === 'admin' ? (
        <AdminDashboard
          onBackToHome={() => setActiveView('home')}
          currentProvince={currentProvince}
          onUpdateDefaultProvince={handleUpdateDefaultProvince}
        />
      ) : activeView === 'my-matches' ? (
        <MyMatchesView
          onOpenCreatePost={handleCreatePostClick}
          onOpenDetails={(p) => setSelectedDetailPost(p)}
          onEditPost={handleEditPost}
          onOpenChatWithUser={handleOpenChatWithUser}
        />
      ) : (
        /* HOME FEED VIEW */
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          
          {/* Hero Banner Section */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-950 via-neutral-900 to-neutral-950 border border-emerald-900/40 p-6 sm:p-8 shadow-2xl">
            <div className="relative z-10 max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                <MapPin className="w-3.5 h-3.5" />
                <span>ແຂວງ: {currentProvince}</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                ຫາຄູ່ເຕະບານ ໄດ້ງ່າຍໆ<br />
                <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                  LNT Football Connect
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-xl">
                ແພລດຟອມນັດເຕະບານພາຍໃນແຂວງ ສ້າງທີມ, ໂພສຫາຄູ່ແຂ່ງ, ຄົ້ນຫາທີມອື່ນ ແລະ ສົນທະນາຕິດຕໍ່ກັນໄດ້ທັນທີ
              </p>
              
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleCreatePostClick}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition transform active:scale-95 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>ສ້າງໂພສຫາຄູ່ເຕະບານ</span>
                </button>

                {posts.filter(p => p.province === currentProvince).length === 0 && (
                  <button
                    onClick={handleSeedSampleData}
                    className="px-4 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>ສ້າງໂພສຕົວຢ່າງໃນແຂວງນີ້</span>
                  </button>
                )}
              </div>
            </div>

            {/* Stadium turf graphic decoration */}
            <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 pointer-events-none hidden md:flex items-center justify-end pr-8">
              <Trophy className="w-64 h-64 text-emerald-400" />
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-neutral-900/90 rounded-2xl border border-neutral-800 p-4 space-y-3 shadow-lg">
            
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              
              {/* Text Search Input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ຄົ້ນຫາຊື່ທີມ, ຊື່ສະໜາມ, ຫຼື ຫົວຂໍ້ໂພສ..."
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none placeholder-neutral-500"
                />
              </div>

              {/* District Filter Quick Selector */}
              <div className="flex items-center space-x-2">
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 focus:border-emerald-500 text-xs text-neutral-200 rounded-xl px-3 py-2.5 focus:outline-none cursor-pointer"
                >
                  <option value="all">ທຸກເມືອງ ({currentProvince})</option>
                  {currentDistricts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                {/* Match format filter */}
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 focus:border-emerald-500 text-xs text-neutral-200 rounded-xl px-3 py-2.5 focus:outline-none cursor-pointer"
                >
                  <option value="all">ທຸກປະເພດບານ</option>
                  {MATCH_FORMATS.map((fmt) => (
                    <option key={fmt.value} value={fmt.value}>
                      {fmt.badge} ({fmt.value} ຄົນ)
                    </option>
                  ))}
                </select>

                {/* Toggle Detailed Filter Drawer button */}
                <button
                  onClick={() => setShowFilterDrawer(!showFilterDrawer)}
                  className={`p-2.5 rounded-xl border transition flex items-center gap-1.5 text-xs ${
                    showFilterDrawer || selectedSkill !== 'all' || selectedStatus !== 'all' || selectedDate
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:text-white'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="hidden sm:inline">ຕົວກັ່ນຕອງ</span>
                </button>
              </div>

            </div>

            {/* Expanded Detailed Filters */}
            {showFilterDrawer && (
              <div className="pt-3 border-t border-neutral-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Skill Level */}
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">ລະດັບຝີມື</label>
                  <select
                    value={selectedSkill}
                    onChange={(e) => setSelectedSkill(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="all">ທຸກລະດັບຝີມື</option>
                    {SKILL_LEVELS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Match Status */}
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">ສະຖານະໂພສ</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="all">ທຸກສະຖານະ</option>
                    <option value="open">ກຳລັງຫາຄູ່ (Open)</option>
                    <option value="confirmed">ຢືນຢັນຄູ່ແຂ່ງແລ້ວ (Confirmed)</option>
                  </select>
                </div>

                {/* Match Date */}
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">ວັນທີເຕະ</label>
                  <div className="flex items-center space-x-1">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                    />
                    {(selectedDate || selectedSkill !== 'all' || selectedStatus !== 'all' || selectedDistrict !== 'all' || selectedFormat !== 'all') && (
                      <button
                        onClick={handleResetFilters}
                        title="ລ້າງຕົວກັ່ນຕອງ"
                        className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* Posts Count & Current Scope Indicator */}
          <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
            <p>
              ພົບ <span className="text-white font-bold">{filteredPosts.length}</span> ໂພສຫາຄູ່ ໃນແຂວງ <span className="text-emerald-400 font-semibold">{currentProvince}</span>
            </p>
            {filteredPosts.length > 0 && (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                ອັບເດດສົດ Real-time
              </span>
            )}
          </div>

          {/* Posts Feed Grid */}
          {loadingPosts ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
              <p className="text-xs text-neutral-400">ກຳລັງໂຫຼດຂໍ້ມູນໂພສຫາຄູ່ເຕະບານ...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="bg-neutral-900/60 rounded-3xl border border-neutral-800 p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
                <Search className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">ບໍ່ພົບໂພສຫາຄູ່ເຕະບານຕາມເງື່ອນໄຂ</h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  ຍັງບໍ່ມີໂພສໃນແຂວງ {currentProvince} ທີ່ກົງກັບການຄົ້ນຫາຂອງທ່ານ. ທ່ານສາມາດເປັນທີມທຳອິດທີ່ສ້າງໂພສໄດ້!
                </p>
              </div>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  onClick={handleCreatePostClick}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs shadow-md transition"
                >
                  + ສ້າງໂພສຫາຄູ່ເລີຍ
                </button>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition"
                >
                  ລ້າງຕົວກັ່ນຕອງ
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onOpenDetails={(p) => setSelectedDetailPost(p)}
                  onOpenChallenge={handleOpenChallenge}
                  onOpenChatWithUser={handleOpenChatWithUser}
                  onEditPost={handleEditPost}
                  onDeletePost={handleDeletePost}
                  onReportPost={handleReportPost}
                  isChallengedByMe={mySentRequests.includes(post.id)}
                />
              ))}
            </div>
          )}

        </main>
      )}

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeView={activeView}
        onNavigateHome={() => setActiveView('home')}
        onNavigateMyMatches={() => {
          if (!currentUser) {
            setAuthMode('login');
            setAuthModalOpen(true);
            return;
          }
          setActiveView('my-matches');
        }}
        onOpenCreatePost={handleCreatePostClick}
        onOpenChat={() => {
          setTargetChatUser(null);
          setChatModalOpen(true);
        }}
        onOpenProfile={() => setProfileModalOpen(true)}
        onOpenAuth={() => {
          setAuthMode('login');
          setAuthModalOpen(true);
        }}
        unreadChatCount={0}
        pendingRequestsCount={myPendingRequestsCount}
      />

      {/* Modals & Dialogs */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />

      <CreateEditPostModal
        isOpen={createPostModalOpen}
        onClose={() => {
          setCreatePostModalOpen(false);
          setPostToEdit(null);
        }}
        postToEdit={postToEdit}
        currentProvince={currentProvince}
        onSuccess={() => {}}
      />

      <PostDetailModal
        isOpen={Boolean(selectedDetailPost)}
        onClose={() => setSelectedDetailPost(null)}
        post={selectedDetailPost}
        onOpenChallenge={handleOpenChallenge}
        onOpenChatWithUser={handleOpenChatWithUser}
        onReportPost={handleReportPost}
        onEditPost={handleEditPost}
      />

      <ChallengeModal
        isOpen={Boolean(selectedChallengePost)}
        onClose={() => setSelectedChallengePost(null)}
        post={selectedChallengePost}
        onChallengeSuccess={(reqId) => {
          if (selectedChallengePost) {
            setMySentRequests(prev => [...prev, selectedChallengePost.id]);
          }
        }}
      />

      <ChatModal
        isOpen={chatModalOpen}
        onClose={() => {
          setChatModalOpen(false);
          setTargetChatUser(null);
        }}
        targetUser={targetChatUser}
        onReportUser={handleReportUser}
      />

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => {
          setReportModalOpen(false);
          setTargetReport(null);
        }}
        target={targetReport}
      />

      <NotificationsModal
        isOpen={notificationsModalOpen}
        onClose={() => setNotificationsModalOpen(false)}
        notifications={notifications}
        onNavigateTo={(link, type) => {
          if (type === 'chat_message') {
            setChatModalOpen(true);
          } else {
            setActiveView('my-matches');
          }
        }}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
