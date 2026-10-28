import React, { useState, useEffect } from 'react';
import { 
  CalendarDays, 
  Send, 
  Inbox, 
  CheckCircle2, 
  History, 
  XCircle, 
  Swords, 
  Clock, 
  MapPin, 
  Phone, 
  MessageSquare,
  Users,
  Trophy,
  Trash2,
  Edit3
} from 'lucide-react';
import { FootballPost, MatchRequest, MatchRecord } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { sendAppNotification } from '../services/notificationService';

interface MyMatchesViewProps {
  onOpenCreatePost: () => void;
  onOpenDetails: (post: FootballPost) => void;
  onEditPost: (post: FootballPost) => void;
  onOpenChatWithUser: (userId: string, userName: string, userPhoto?: string) => void;
}

type TabType = 'my_posts' | 'received_requests' | 'sent_requests' | 'confirmed' | 'history' | 'cancelled';

export const MyMatchesView: React.FC<MyMatchesViewProps> = ({
  onOpenCreatePost,
  onOpenDetails,
  onEditPost,
  onOpenChatWithUser,
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('confirmed');

  const [myPosts, setMyPosts] = useState<FootballPost[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<MatchRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<MatchRequest[]>([]);
  const [confirmedMatches, setConfirmedMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Load user's data
  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);

    // 1. My Posts
    const postsQuery = query(
      collection(db, 'posts'),
      where('ownerId', '==', currentUser.uid)
    );
    const unsubPosts = onSnapshot(postsQuery, (snap) => {
      const list: FootballPost[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as FootballPost));
      // Sort desc
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMyPosts(list);
    });

    // 2. Received Requests (requests sent to my posts)
    const recQuery = query(
      collection(db, 'matchRequests'),
      where('ownerId', '==', currentUser.uid)
    );
    const unsubRec = onSnapshot(recQuery, (snap) => {
      const list: MatchRequest[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as MatchRequest));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReceivedRequests(list);
    });

    // 3. Sent Requests (requests I sent to others)
    const sentQuery = query(
      collection(db, 'matchRequests'),
      where('requesterId', '==', currentUser.uid)
    );
    const unsubSent = onSnapshot(sentQuery, (snap) => {
      const list: MatchRequest[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as MatchRequest));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSentRequests(list);
    });

    // 4. Confirmed Matches (where I am host or challenger)
    const hostMatchesQuery = query(
      collection(db, 'matches'),
      where('hostTeamId', '==', currentUser.uid)
    );
    const chalMatchesQuery = query(
      collection(db, 'matches'),
      where('challengerTeamId', '==', currentUser.uid)
    );

    let hostList: MatchRecord[] = [];
    let chalList: MatchRecord[] = [];

    const updateAllMatches = () => {
      const combined = [...hostList, ...chalList];
      // Deduplicate by id
      const unique = Array.from(new Map(combined.map(m => [m.id, m])).values());
      unique.sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime());
      setConfirmedMatches(unique);
      setLoading(false);
    };

    const unsubHost = onSnapshot(hostMatchesQuery, (snap) => {
      hostList = snap.docs.map(d => ({ id: d.id, ...d.data() } as MatchRecord));
      updateAllMatches();
    });

    const unsubChal = onSnapshot(chalMatchesQuery, (snap) => {
      chalList = snap.docs.map(d => ({ id: d.id, ...d.data() } as MatchRecord));
      updateAllMatches();
    });

    return () => {
      unsubPosts();
      unsubRec();
      unsubSent();
      unsubHost();
      unsubChal();
    };
  }, [currentUser]);

  // Handle Accept Match Request
  const handleAcceptRequest = async (req: MatchRequest) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'matchRequests', req.id), {
        status: 'accepted',
        updatedAt: new Date().toISOString()
      });

      // Update post status to confirmed
      const postRef = doc(db, 'posts', req.postId);
      await updateDoc(postRef, {
        status: 'confirmed',
        opponentId: req.requesterId,
        opponentTeamName: req.requesterTeamName,
        updatedAt: new Date().toISOString()
      });

      // Add to matches collection
      await addDoc(collection(db, 'matches'), {
        postId: req.postId,
        hostTeamId: req.ownerId,
        hostTeamName: req.postTitle || 'ທີມເຈົ້າພາບ',
        challengerTeamId: req.requesterId,
        challengerTeamName: req.requesterTeamName,
        challengerContact: req.requesterPhone || req.requesterWhatsapp || '',
        matchDate: req.postMatchDate || '',
        matchTime: req.postMatchTime || '',
        pitchName: req.postPitchName || '',
        province: '',
        district: '',
        matchType: '7',
        status: 'confirmed',
        notes: req.message || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      await sendAppNotification({
        recipientId: req.requesterId,
        senderId: currentUser.uid,
        senderName: req.postTitle || 'ເຈົ້າພາບ',
        title: 'ຄຳຂໍແຂ່ງຂັນຖືກຕອບຮັບແລ້ວ!',
        message: `ຄຳຂໍແຂ່ງຂັນກັບທີມເຈົ້າພາບ ໄດ້ຮັບການຕອບຮັບແລ້ວ. ກວດສອບລາຍລະອຽດນັດເຕະໄດ້ເລີຍ!`,
        link: '/my-matches',
        type: 'request_accepted'
      });
    } catch (err) {
      console.error('Error accepting:', err);
    }
  };

  // Handle Reject Match Request
  const handleRejectRequest = async (req: MatchRequest) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'matchRequests', req.id), {
        status: 'rejected',
        updatedAt: new Date().toISOString()
      });

      await sendAppNotification({
        recipientId: req.requesterId,
        senderId: currentUser.uid,
        title: 'ຄຳຂໍແຂ່ງຂັນຖືກປະຕິເສດ',
        message: `ຄຳຂໍແຂ່ງຂັນຂອງທ່ານບໍ່ໄດ້ຮັບການຕອບຮັບໃນຄັ້ງນີ້`,
        link: '/my-matches',
        type: 'request_rejected'
      });
    } catch (err) {
      console.error('Error rejecting:', err);
    }
  };

  // Mark match completed or cancelled
  const handleUpdateMatchStatus = async (matchId: string, status: 'completed' | 'cancelled') => {
    try {
      await updateDoc(doc(db, 'matches', matchId), {
        status,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error updating match:', err);
    }
  };

  // Delete my post
  const handleDeletePost = async (postId: string) => {
    if (!confirm('ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບໂພສນີ້?')) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };

  // Filtered views
  const pendingReceived = receivedRequests.filter(r => r.status === 'pending');
  const activeConfirmed = confirmedMatches.filter(m => m.status === 'confirmed');
  const completedMatches = confirmedMatches.filter(m => m.status === 'completed');
  const cancelledMatches = confirmedMatches.filter(m => m.status === 'cancelled');

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-neutral-900/80 p-5 rounded-3xl border border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
            <CalendarDays className="w-6 h-6 text-emerald-400" />
            <span>ນັດໝາຍຂອງຂ້ອຍ (My Matches)</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            ຕິດຕາມໂພສ, ຄຳຂໍແຂ່ງຂັນ ແລະ ນັດເຕະບານທີ່ຢືນຢັນແລ້ວທັງໝົດ
          </p>
        </div>

        <button
          onClick={onOpenCreatePost}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs sm:text-sm shadow-md transition"
        >
          + ສ້າງໂພສຫາຄູ່ໃໝ່
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-neutral-800 text-xs font-semibold">
        
        {/* Confirmed Matches */}
        <button
          onClick={() => setActiveTab('confirmed')}
          className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'confirmed'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>ນັດທີ່ຢືນຢັນແລ້ວ ({activeConfirmed.length})</span>
        </button>

        {/* Received Challenges */}
        <button
          onClick={() => setActiveTab('received_requests')}
          className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'received_requests'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>ຄຳຂໍທີ່ໄດ້ຮັບ ({receivedRequests.length})</span>
          {pendingReceived.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-500 text-black text-[10px] flex items-center justify-center font-bold">
              {pendingReceived.length}
            </span>
          )}
        </button>

        {/* Sent Challenges */}
        <button
          onClick={() => setActiveTab('sent_requests')}
          className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'sent_requests'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>ຄຳຂໍທີ່ຂ້ອຍສົ່ງ ({sentRequests.length})</span>
        </button>

        {/* My Posts */}
        <button
          onClick={() => setActiveTab('my_posts')}
          className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'my_posts'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Swords className="w-4 h-4" />
          <span>ໂພສຂອງຂ້ອຍ ({myPosts.length})</span>
        </button>

        {/* Match History */}
        <button
          onClick={() => setActiveTab('history')}
          className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'history'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>ປະຫວັດການເຕະ ({completedMatches.length})</span>
        </button>

        {/* Cancelled Matches */}
        <button
          onClick={() => setActiveTab('cancelled')}
          className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'cancelled'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <XCircle className="w-4 h-4" />
          <span>ຍົກເລີກ ({cancelledMatches.length})</span>
        </button>

      </div>

      {/* Tab Panels */}
      <div className="space-y-4">
        
        {/* 1. Confirmed Matches */}
        {activeTab === 'confirmed' && (
          <div className="space-y-3">
            {activeConfirmed.length === 0 ? (
              <div className="p-12 text-center bg-neutral-900/60 rounded-3xl border border-neutral-800 text-neutral-400 text-xs">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-neutral-600" />
                ຍັງບໍ່ມີນັດໝາຍທີ່ຢືນຢັນຄູ່ແຂ່ງເທື່ອ
              </div>
            ) : (
              activeConfirmed.map((m) => {
                const isHost = m.hostTeamId === currentUser?.uid;
                const opponentName = isHost ? m.challengerTeamName : m.hostTeamName;
                const opponentContact = isHost ? m.challengerContact : m.hostContact;
                const opponentId = isHost ? m.challengerTeamId : m.hostTeamId;

                return (
                  <div
                    key={m.id}
                    className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          ຢືນຢັນຄູ່ແຂ່ງແລ້ວ
                        </span>
                        <span className="text-xs text-neutral-400">
                          {isHost ? '(ທ່ານເປັນເຈົ້າພາບ)' : '(ທ່ານເປັນທີມທ້າຊີງ)'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="text-base font-extrabold text-white">
                          {m.hostTeamName} <span className="text-emerald-400 font-sans">VS</span> {m.challengerTeamName}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-300">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {m.matchDate}
                        </span>
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Clock className="w-3.5 h-3.5" />
                          {m.matchTime} ໂມງ
                        </span>
                        <span className="flex items-center gap-1 text-neutral-400">
                          <MapPin className="w-3.5 h-3.5" />
                          {m.pitchName}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-stretch md:self-center justify-end border-t md:border-t-0 pt-3 md:pt-0 border-neutral-800">
                      {opponentContact && (
                        <a
                          href={`tel:${opponentContact}`}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-800/40 flex items-center gap-1.5 transition"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>ໂທຫາຄູ່ແຂ່ງ</span>
                        </a>
                      )}

                      <button
                        onClick={() => onOpenChatWithUser(opponentId, opponentName)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white flex items-center gap-1.5 transition"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                        <span>ແຊັດ</span>
                      </button>

                      <button
                        onClick={() => handleUpdateMatchStatus(m.id, 'completed')}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition"
                      >
                        ເຕະສຳເລັດແລ້ວ
                      </button>

                      <button
                        onClick={() => handleUpdateMatchStatus(m.id, 'cancelled')}
                        className="px-2.5 py-1.5 rounded-xl text-xs text-red-400 hover:bg-red-950/40 transition"
                      >
                        ຍົກເລີກ
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 2. Received Requests */}
        {activeTab === 'received_requests' && (
          <div className="space-y-3">
            {receivedRequests.length === 0 ? (
              <div className="p-12 text-center bg-neutral-900/60 rounded-3xl border border-neutral-800 text-neutral-400 text-xs">
                ຍັງບໍ່ມີຄຳຂໍສະໝັກແຂ່ງຂັນຈາກທີມອື່ນ
              </div>
            ) : (
              receivedRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-white text-sm">
                        ທີມ {req.requesterTeamName}
                      </h4>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        req.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' :
                        req.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {req.status === 'accepted' ? 'ຍອມຮັບແລ້ວ' :
                         req.status === 'rejected' ? 'ປະຕິເສດ' : 'ລໍຖ້າການຕອບຮັບ'}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-400">
                      ໂພສ: <span className="text-neutral-200">{req.postTitle || 'ໂພສຫາຄູ່'}</span> ({req.postMatchDate} {req.postMatchTime})
                    </p>

                    {req.message && (
                      <p className="text-xs text-neutral-300 italic bg-neutral-950 p-2 rounded-xl mt-1">
                        "{req.message}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    <button
                      onClick={() => onOpenChatWithUser(req.requesterId, req.requesterTeamName)}
                      className="p-2 rounded-xl text-neutral-300 hover:text-white bg-neutral-800"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>

                    {req.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleRejectRequest(req)}
                          className="px-3 py-1.5 rounded-xl text-xs text-red-400 hover:bg-red-950/40 border border-red-800/40"
                        >
                          ປະຕິເສດ
                        </button>
                        <button
                          onClick={() => handleAcceptRequest(req)}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-neutral-950 bg-emerald-400 hover:bg-emerald-300"
                        >
                          ຍອມຮັບຄຳຂໍ
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 3. Sent Requests */}
        {activeTab === 'sent_requests' && (
          <div className="space-y-3">
            {sentRequests.length === 0 ? (
              <div className="p-12 text-center bg-neutral-900/60 rounded-3xl border border-neutral-800 text-neutral-400 text-xs">
                ທ່ານຍັງບໍ່ເຄີຍສົ່ງຄຳຂໍສະໝັກແຂ່ງຂັນຫາທີມອື່ນ
              </div>
            ) : (
              sentRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-white text-sm">
                        {req.postTitle || 'ນັດເຕະບານ'}
                      </h4>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        req.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' :
                        req.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {req.status === 'accepted' ? 'ຍອມຮັບແລ້ວ!' :
                         req.status === 'rejected' ? 'ຖືກປະຕິເສດ' : 'ກຳລັງລໍຖ້າເຈົ້າຂອງໂພສຕອບຮັບ'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400">
                      ວັນທີ: {req.postMatchDate} ({req.postMatchTime}) • ສະໜາມ: {req.postPitchName}
                    </p>
                  </div>

                  <button
                    onClick={() => onOpenChatWithUser(req.ownerId, 'ເຈົ້າຂອງໂພສ')}
                    className="p-2 rounded-xl text-neutral-300 hover:text-white bg-neutral-800 shrink-0"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* 4. My Posts */}
        {activeTab === 'my_posts' && (
          <div className="space-y-3">
            {myPosts.length === 0 ? (
              <div className="p-12 text-center bg-neutral-900/60 rounded-3xl border border-neutral-800 text-neutral-400 text-xs">
                ທ່ານຍັງບໍ່ໄດ້ສ້າງໂພສຫາຄູ່ເຕະບານເທື່ອ
              </div>
            ) : (
              myPosts.map((post) => (
                <div
                  key={post.id}
                  className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-white text-sm">{post.title}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        post.status === 'open' ? 'bg-emerald-500/10 text-emerald-400' :
                        post.status === 'confirmed' ? 'bg-blue-500/10 text-blue-400' :
                        'bg-neutral-800 text-neutral-400'
                      }`}>
                        {post.status === 'open' ? 'ກຳລັງຫາຄູ່' :
                         post.status === 'confirmed' ? 'ຢືນຢັນແລ້ວ' : post.status}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {post.matchDate} ({post.matchTime} ໂມງ) • {post.pitchName} • ບານ {post.matchType} ຄົນ
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    <button
                      onClick={() => onOpenDetails(post)}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium text-neutral-300 bg-neutral-800 hover:text-white"
                    >
                      ລາຍລະອຽດ
                    </button>
                    <button
                      onClick={() => onEditPost(post)}
                      className="p-2 rounded-xl text-neutral-400 hover:text-emerald-400 bg-neutral-800"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-2 rounded-xl text-neutral-400 hover:text-red-400 bg-neutral-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 5. Match History */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {completedMatches.length === 0 ? (
              <div className="p-12 text-center bg-neutral-900/60 rounded-3xl border border-neutral-800 text-neutral-400 text-xs">
                ຍັງບໍ່ມີປະຫວັດການເຕະທີ່ສຳເລັດ
              </div>
            ) : (
              completedMatches.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-white text-sm">
                      {m.hostTeamName} VS {m.challengerTeamName}
                    </h4>
                    <p className="text-xs text-neutral-400">
                      ເຕະເມື່ອ: {m.matchDate} ທີ່ {m.pitchName}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-300">
                    ສຳເລັດແລ້ວ
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* 6. Cancelled Matches */}
        {activeTab === 'cancelled' && (
          <div className="space-y-3">
            {cancelledMatches.length === 0 ? (
              <div className="p-12 text-center bg-neutral-900/60 rounded-3xl border border-neutral-800 text-neutral-400 text-xs">
                ບໍ່ມີນັດໝາຍທີ່ຖືກຍົກເລີກ
              </div>
            ) : (
              cancelledMatches.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-white text-sm">
                      {m.hostTeamName} VS {m.challengerTeamName}
                    </h4>
                    <p className="text-xs text-neutral-400">
                      ວັນທີ: {m.matchDate} ທີ່ {m.pitchName}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-950/40 text-red-400 border border-red-900/40">
                    ຍົກເລີກ
                  </span>
                </div>
              ))
            )}
          </div>
        )}

      </div>

    </div>
  );
};
