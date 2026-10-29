import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Banknote, 
  Award, 
  Phone, 
  MessageSquare, 
  Swords, 
  CheckCircle2, 
  AlertCircle, 
  Flag,
  Share2,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { FootballPost, MatchRequest } from '../types';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { sendAppNotification } from '../services/notificationService';
import { SKILL_LEVELS, FEE_TYPES } from '../constants/laoData';

interface PostDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: FootballPost | null;
  onOpenChallenge: (post: FootballPost) => void;
  onOpenChatWithUser: (userId: string, userName: string, userPhoto?: string) => void;
  onReportPost: (post: FootballPost) => void;
  onEditPost: (post: FootballPost) => void;
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({
  isOpen,
  onClose,
  post,
  onOpenChallenge,
  onOpenChatWithUser,
  onReportPost,
  onEditPost,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isOwner = currentUser?.uid === post?.ownerId;

  // Listen to match requests for this post if owner or admin
  useEffect(() => {
    if (!isOpen || !post || (!isOwner && !isAdmin)) {
      setRequests([]);
      return;
    }

    const q = query(
      collection(db, 'matchRequests'),
      where('postId', '==', post.id)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items: MatchRequest[] = [];
      snapshot.forEach(docSnap => {
        items.push({ id: docSnap.id, ...docSnap.data() } as MatchRequest);
      });
      setRequests(items);
    }, (error) => {
      console.warn('Requests listener error:', error);
    });

    return () => unsub();
  }, [isOpen, post, isOwner, isAdmin]);

  if (!isOpen || !post) return null;

  const skillObj = SKILL_LEVELS.find(s => s.value === post.skillLevel);
  const feeTypeObj = FEE_TYPES.find(f => f.value === post.feeType) || FEE_TYPES[0];

  const cleanPhone = (post.contactWhatsapp || post.contactPhone || '').replace(/[^0-9]/g, '');
  const waPhone = cleanPhone.startsWith('856') 
    ? cleanPhone 
    : cleanPhone.startsWith('20') 
    ? `856${cleanPhone}` 
    : cleanPhone.startsWith('020') 
    ? `856${cleanPhone.substring(1)}` 
    : cleanPhone;

  const whatsappMessage = encodeURIComponent(
    `ສະບາຍດີທີມ ${post.teamName}, ຂ້ອຍເຫັນໂພສ "${post.title}" ວັນທີ ${post.matchDate} ຜ່ານ LNT Football Connect, ທີມເຮົາສົນໃຈຢາກນັດເຕະນຳ!`
  );

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Owner action: Accept match request
  const handleAcceptRequest = async (req: MatchRequest) => {
    if (!currentUser || !post) return;
    setActionLoading(req.id);
    try {
      // 1. Update the accepted request
      await updateDoc(doc(db, 'matchRequests', req.id), {
        status: 'accepted',
        updatedAt: new Date().toISOString()
      });

      // 2. Update post to confirmed
      await updateDoc(doc(db, 'posts', post.id), {
        status: 'confirmed',
        opponentId: req.requesterId,
        opponentTeamName: req.requesterTeamName,
        updatedAt: new Date().toISOString()
      });

      // 3. Create confirmed match record in `matches`
      await addDoc(collection(db, 'matches'), {
        postId: post.id,
        hostTeamId: post.ownerId,
        hostTeamName: post.teamName,
        hostTeamLogo: post.teamLogo || '',
        hostContact: post.contactPhone || '',
        challengerTeamId: req.requesterId,
        challengerTeamName: req.requesterTeamName,
        challengerTeamLogo: req.requesterPhotoURL || '',
        challengerContact: req.requesterPhone || req.requesterWhatsapp || '',
        matchDate: post.matchDate,
        matchTime: post.matchTime,
        pitchName: post.pitchName,
        province: post.province,
        district: post.district,
        matchType: post.matchType,
        status: 'confirmed',
        notes: req.message || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 4. Reject other pending requests for this post automatically
      for (const otherReq of requests) {
        if (otherReq.id !== req.id && otherReq.status === 'pending') {
          await updateDoc(doc(db, 'matchRequests', otherReq.id), {
            status: 'rejected',
            updatedAt: new Date().toISOString()
          });
          await sendAppNotification({
            recipientId: otherReq.requesterId,
            senderId: currentUser.uid,
            senderName: post.teamName,
            title: 'ຄຳຂໍແຂ່ງຂັນບໍ່ໄດ້ຮັບການຕອບຮັບ',
            message: `ທີມ ${post.teamName} ໄດ້ຢືນຢັນຄູ່ແຂ່ງອື່ນແລ້ວ ສຳລັບນັດ ${post.matchDate}`,
            link: '/my-matches',
            type: 'request_rejected'
          });
        }
      }

      // 5. Notify the accepted challenger
      await sendAppNotification({
        recipientId: req.requesterId,
        senderId: currentUser.uid,
        senderName: post.teamName,
        title: 'ຍິນດີນຳ! ຄຳຂໍແຂ່ງຂັນຖືກຕອບຮັບແລ້ວ',
        message: `ທີມ "${post.teamName}" ໄດ້ຕອບຮັບຄຳຂໍແຂ່ງຂັນຂອງທ່ານແລ້ວ! ນັດເຕະວັນທີ ${post.matchDate} ທີ່ ${post.pitchName}`,
        link: '/my-matches',
        type: 'request_accepted'
      });

    } catch (err) {
      console.error('Error accepting request:', err);
      handleFirestoreError(err, OperationType.UPDATE, `matchRequests/${req.id}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Owner action: Reject match request
  const handleRejectRequest = async (req: MatchRequest) => {
    if (!currentUser) return;
    setActionLoading(req.id);
    try {
      await updateDoc(doc(db, 'matchRequests', req.id), {
        status: 'rejected',
        updatedAt: new Date().toISOString()
      });

      await sendAppNotification({
        recipientId: req.requesterId,
        senderId: currentUser.uid,
        senderName: post.teamName,
        title: 'ຄຳຂໍແຂ່ງຂັນຖືກປະຕິເສດ',
        message: `ທີມ "${post.teamName}" ບໍ່ສາມາດຮັບນັດເຕະກັບທ່ານໄດ້ໃນຄັ້ງນີ້`,
        link: '/my-matches',
        type: 'request_rejected'
      });
    } catch (err) {
      console.error('Error rejecting request:', err);
      handleFirestoreError(err, OperationType.UPDATE, `matchRequests/${req.id}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h3 className="text-base font-bold text-white">ລາຍລະອຽດການນັດເຕະບານ</h3>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={handleShare}
              title="ຄັດລອກລິ້ງ"
              className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition text-xs flex items-center gap-1"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">{copied ? 'ຄັດລອກແລ້ວ!' : 'ແບ່ງປັນ'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Team Profile Banner */}
          <div className="flex items-center space-x-4 p-4 rounded-2xl bg-gradient-to-r from-neutral-950 to-neutral-900 border border-neutral-800">
            <div className="w-16 h-16 rounded-2xl bg-neutral-800 border border-neutral-700 p-1 shrink-0 overflow-hidden shadow-lg">
              <img
                src={post.teamLogo || `https://api.dicebear.com/7.x/identicon/svg?seed=${post.teamName}`}
                alt={post.teamName}
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-extrabold text-white truncate">{post.teamName}</h2>
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              </div>
              <p className="text-xs text-neutral-400 mt-1 flex items-center gap-2">
                <span>ໂພສໂດຍ: <span className="text-neutral-200">{post.ownerName}</span></span>
                <span>•</span>
                <span>{post.district}, {post.province}</span>
              </p>
            </div>

            {/* Status indicator */}
            <div className="shrink-0 text-right">
              {post.status === 'open' && (
                <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  ກຳລັງຫາຄູ່
                </span>
              )}
              {post.status === 'confirmed' && (
                <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  ຢືນຢັນຄູ່ແຂ່ງແລ້ວ
                </span>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-lg font-bold text-white leading-relaxed">
              {post.title}
            </h1>
          </div>

          {/* Match Specs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-neutral-950/70 p-4 rounded-2xl border border-neutral-800 text-sm">
            
            <div className="flex items-center space-x-3 text-neutral-300">
              <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-emerald-400 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-neutral-500">ວັນທີເຕະ</p>
                <p className="font-semibold text-white">{post.matchDate}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-neutral-300">
              <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-emerald-400 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-neutral-500">ເວລາເລີ່ມເຕະ</p>
                <p className="font-semibold text-white">{post.matchTime} ໂມງ</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-neutral-300 sm:col-span-2">
              <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-emerald-400 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-neutral-500">ສະໜາມເຕະບານ & ສະຖານທີ່</p>
                <p className="font-semibold text-white">{post.pitchName} ({post.district}, {post.province})</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-neutral-300">
              <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-blue-400 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-neutral-500">ປະເພດບານ</p>
                <p className="font-semibold text-white">{post.matchType} ຄົນ ({post.matchType}v{post.matchType})</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-neutral-300">
              <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-amber-400 shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-neutral-500">ລະດັບຝີມື</p>
                <p className="font-semibold text-white">{post.skillLevel}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-neutral-300 sm:col-span-2 p-3 bg-neutral-900/80 rounded-xl border border-neutral-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] text-neutral-400">ຄ່າສະໜາມ & ວິທີແບ່ງຈ່າຍ</p>
                  <p className="font-bold text-white text-base">
                    {post.pitchFee || 'ບໍ່ໄດ້ລະບຸຄ່າສະໜາມ'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-1">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${feeTypeObj.bgColor} ${feeTypeObj.color} border ${feeTypeObj.borderColor}`}>
                  {feeTypeObj.badge}
                </span>
                <span className="text-[11px] text-neutral-400">
                  {feeTypeObj.description}
                </span>
              </div>
            </div>

            {post.feeSplitDetails && (
              <div className="sm:col-span-2 p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs text-amber-300 flex items-start gap-2">
                <span className="font-bold text-amber-400 shrink-0 mt-0.5">🤝 ຂໍ້ຕົກລົງຄ່າສະໜາມ:</span>
                <span className="leading-relaxed">{post.feeSplitDetails}</span>
              </div>
            )}

          </div>

          {/* Additional details */}
          {post.details && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                ລາຍລະອຽດ / ກະຕິກາ / ສີເສື້ອ
              </h4>
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">
                {post.details}
              </div>
            </div>
          )}

          {/* Confirmed Opponent Section (if confirmed) */}
          {post.status === 'confirmed' && post.opponentTeamName && (
            <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-800/50 space-y-2">
              <div className="flex items-center space-x-2 text-blue-400">
                <UserCheck className="w-5 h-5" />
                <h4 className="text-sm font-bold">ນັດໝາຍນີ້ຢືນຢັນຄູ່ແຂ່ງຮຽບຮ້ອຍແລ້ວ!</h4>
              </div>
              <p className="text-xs text-neutral-300">
                ຄູ່ແຂ່ງ: <span className="font-bold text-white text-sm">{post.opponentTeamName}</span>
              </p>
            </div>
          )}

          {/* Owner Zone: Manage Challenges / Received Requests */}
          {isOwner && (
            <div className="border-t border-neutral-800 pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Swords className="w-4 h-4 text-emerald-400" />
                  <span>ຄຳຂໍສະໝັກແຂ່ງຂັນ ({requests.length})</span>
                </h4>
                {post.status === 'open' && (
                  <button
                    onClick={() => onEditPost(post)}
                    className="text-xs text-emerald-400 hover:underline"
                  >
                    ແກ້ໄຂຂໍ້ມູນໂພສ
                  </button>
                )}
              </div>

              {requests.length === 0 ? (
                <div className="text-center py-6 bg-neutral-950 rounded-2xl border border-neutral-800 text-xs text-neutral-400">
                  ຍັງບໍ່ທັນມີທີມໃດສົ່ງຄຳຂໍສະໝັກແຂ່ງຂັນ
                </div>
              ) : (
                <div className="space-y-2.5">
                  {requests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white text-sm">{req.requesterTeamName}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            req.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400' :
                            req.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                            'bg-amber-500/10 text-amber-400'
                          }`}>
                            {req.status === 'accepted' ? 'ຍອມຮັບແລ້ວ' :
                             req.status === 'rejected' ? 'ປະຕິເສດແລ້ວ' : 'ລໍຖ້າການຕອບຮັບ'}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          ຜູ້ຕິດຕໍ່: {req.requesterName} • {req.requesterPhone || req.requesterWhatsapp || 'ບໍ່ມີເບີ'}
                        </p>
                        {req.message && (
                          <p className="text-xs text-neutral-300 mt-1 italic">
                            "{req.message}"
                          </p>
                        )}
                      </div>

                      {req.status === 'pending' && post.status === 'open' && (
                        <div className="flex items-center space-x-2 self-end sm:self-center">
                          <button
                            onClick={() => handleRejectRequest(req)}
                            disabled={actionLoading === req.id}
                            className="px-3 py-1.5 rounded-xl text-xs font-medium text-red-400 bg-red-950/40 hover:bg-red-900/40 border border-red-800/40 transition"
                          >
                            ປະຕິເສດ
                          </button>
                          <button
                            onClick={() => handleAcceptRequest(req)}
                            disabled={actionLoading === req.id}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 shadow transition"
                          >
                            ຍອມຮັບ
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Contact Channels (if public or visible) */}
          <div className="bg-neutral-950/80 p-4 rounded-2xl border border-neutral-800 space-y-3">
            <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              ຊ່ອງທາງຕິດຕໍ່ທີມເຈົ້າພາບ
            </h4>

            <div className="flex flex-wrap gap-2.5">
              {!isOwner && (
                <button
                  onClick={() => onOpenChatWithUser(post.ownerId, post.ownerName, post.ownerPhotoURL)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold flex items-center gap-2 transition"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>ແຊັດຂໍ້ຄວາມ (Chat)</span>
                </button>
              )}

              {!post.hidePhone && post.contactPhone && (
                <a
                  href={`tel:${post.contactPhone}`}
                  className="px-4 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-800/50 text-xs font-semibold flex items-center gap-2 transition"
                >
                  <Phone className="w-4 h-4" />
                  <span>ໂທຫາ: {post.contactPhone}</span>
                </a>
              )}

              {waPhone && !post.hidePhone && (
                <a
                  href={`https://wa.me/${waPhone}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-teal-950/60 hover:bg-teal-600 text-teal-300 hover:text-white border border-teal-800/50 text-xs font-semibold flex items-center gap-2 transition"
                >
                  <span className="font-sans font-bold">WA</span>
                  <span>WhatsApp: {post.contactWhatsapp || post.contactPhone}</span>
                </a>
              )}

              {post.hidePhone && (
                <p className="text-xs text-neutral-500 py-1">
                  * ຜູ້ໂພສເລືອກເຊື່ອງເບີໂທ - ກະລຸນາຕິດຕໍ່ຜ່ານປຸ່ມ "ແຊັດຂໍ້ຄວາມ"
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:px-6 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between">
          {!isOwner ? (
            <button
              onClick={() => onReportPost(post)}
              className="text-xs text-neutral-500 hover:text-red-400 flex items-center gap-1.5 transition"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>ລາຍງານໂພສນີ້</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center space-x-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            >
              ປິດ
            </button>

            {post.status === 'open' && !isOwner && (
              <button
                onClick={() => {
                  onClose();
                  onOpenChallenge(post);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-md shadow-emerald-500/25 flex items-center gap-1.5 transition transform active:scale-95"
              >
                <Swords className="w-4 h-4" />
                <span>ສະໝັກແຂ່ງຂັນກັບທີມນີ້</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
