import React, { useState } from 'react';
import { X, Swords, Shield, Phone, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';
import { FootballPost } from '../types';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { sendAppNotification } from '../services/notificationService';

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: FootballPost | null;
  onChallengeSuccess: (requestId: string) => void;
}

export const ChallengeModal: React.FC<ChallengeModalProps> = ({
  isOpen,
  onClose,
  post,
  onChallengeSuccess,
}) => {
  const { currentUser, userProfile } = useAuth();

  const [teamName, setTeamName] = useState(userProfile?.teamName || 'ທີມຜູ້ທ້າຊີງ');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [whatsapp, setWhatsapp] = useState(userProfile?.whatsapp || userProfile?.phone || '');
  const [message, setMessage] = useState('ສະບາຍດີ! ທີມເຮົາສົນໃຈຢາກນັດເຕະນຳ ພ້ອມລົງສະໜາມຕາມວັນເວລາທີ່ກຳນົດ.');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen || !post) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setErrorMsg('');

    // Guard: cannot challenge own post
    if (currentUser.uid === post.ownerId) {
      setErrorMsg('ທ່ານບໍ່ສາມາດສະໝັກແຂ່ງຂັນກັບໂພສຂອງຕົນເອງໄດ້');
      return;
    }

    if (!teamName.trim()) {
      setErrorMsg('ກະລຸນາປ້ອນຊື່ທີມຂອງທ່ານ');
      return;
    }

    setSubmitting(true);
    try {
      // Check for existing pending request from this user for this post
      const q = query(
        collection(db, 'matchRequests'),
        where('postId', '==', post.id),
        where('requesterId', '==', currentUser.uid),
        where('status', '==', 'pending')
      );
      const existing = await getDocs(q);
      if (!existing.empty) {
        setErrorMsg('ທ່ານໄດ້ສົ່ງຄຳຂໍແຂ່ງຂັນສຳລັບໂພສນີ້ໄປແລ້ວ ກະລຸນາລໍຖ້າການຕອບຮັບ');
        setSubmitting(false);
        return;
      }

      // Add match request
      const reqData = {
        postId: post.id,
        ownerId: post.ownerId,
        requesterId: currentUser.uid,
        requesterName: userProfile?.displayName || currentUser.displayName || 'ນັກເຕະບານ',
        requesterPhotoURL: userProfile?.photoURL || currentUser.photoURL || '',
        requesterTeamName: teamName.trim(),
        requesterPhone: phone.trim(),
        requesterWhatsapp: whatsapp.trim(),
        message: message.trim(),
        status: 'pending',
        postTitle: post.title,
        postMatchDate: post.matchDate,
        postMatchTime: post.matchTime,
        postPitchName: post.pitchName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'matchRequests'), reqData);

      // Send in-app notification to post owner
      await sendAppNotification({
        recipientId: post.ownerId,
        senderId: currentUser.uid,
        senderName: teamName.trim(),
        title: 'ມີທີມຂໍສະໝັກແຂ່ງຂັນ!',
        message: `ທີມ "${teamName.trim()}" ໄດ້ສົ່ງຄຳຂໍແຂ່ງຂັນໃນໂພສ "${post.title}"`,
        link: '/my-matches',
        type: 'request_received'
      });

      setSuccess(true);
      setTimeout(() => {
        onChallengeSuccess(docRef.id);
        onClose();
        setSuccess(false);
      }, 1500);

    } catch (err) {
      console.error('Failed to submit challenge request:', err);
      setErrorMsg('ເກີດຂໍ້ຜິດພາດໃນການສົ່ງຄຳຂໍ ກະລຸນາລອງໃໝ່');
      handleFirestoreError(err, OperationType.CREATE, 'matchRequests');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                ສະໝັກແຂ່ງຂັນ (Challenge Match)
              </h3>
              <p className="text-xs text-neutral-400">
                ສົ່ງຄຳຂໍຫາທີມ <span className="text-emerald-400 font-semibold">{post.teamName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {success ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-lg font-bold text-white">ສົ່ງຄຳຂໍແຂ່ງຂັນສຳເລັດແລ້ວ!</h4>
            <p className="text-xs text-neutral-400">
              ລະບົບໄດ້ສົ່ງການແຈ້ງເຕືອນຫາເຈົ້າຂອງໂພສແລ້ວ ທ່ານສາມາດຕິດຕາມສະຖານະໄດ້ທີ່ເມນູ "ນັດໝາຍຂອງຂ້ອຍ"
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {errorMsg && (
              <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Match summary recap */}
            <div className="p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-2xl text-xs space-y-1.5">
              <div className="flex justify-between text-neutral-400">
                <span>ນັດເຕະ:</span>
                <span className="font-semibold text-neutral-200">{post.matchDate} ({post.matchTime} ໂມງ)</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>ສະໜາມ:</span>
                <span className="font-semibold text-neutral-200">{post.pitchName}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>ປະເພດບານ:</span>
                <span className="font-semibold text-emerald-400">{post.matchType} ຄົນ ({post.skillLevel})</span>
              </div>
            </div>

            {/* Team Name */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>ຊື່ທີມຂອງທ່ານ (ທີມທ້າຊີງ) *</span>
              </label>
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="ຊື່ທີມຂອງທ່ານ"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
              />
            </div>

            {/* Contact Phones */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ເບີໂທຕິດຕໍ່</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="020 xxxx xxxx"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  WhatsApp
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="020 xxxx xxxx"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Message to Owner */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>ຂໍ້ຄວາມຫາທີມເຈົ້າພາບ</span>
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="ບອກຈຳນວນນັກກິລາ, ສີເສື້ອທີມ ຫຼື ເງື່ອນໄຂອື່ນໆ..."
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
              >
                ຍົກເລີກ
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-md shadow-emerald-500/20 transition transform active:scale-95 disabled:opacity-50"
              >
                {submitting ? 'ກຳລັງສົ່ງ...' : 'ຢືນຢັນການສະໝັກແຂ່ງຂັນ'}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
