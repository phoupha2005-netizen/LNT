import React, { useState } from 'react';
import { X, Flag, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: {
    type: 'post' | 'user' | 'chat';
    id: string;
    name: string;
  } | null;
}

const REPORT_REASONS = [
  'ສະແປມ / ໂພສຊ້ຳກັນຫຼາຍຄັ້ງ (Spam)',
  'ໃຊ້ຄຳເວົ້າບໍ່ສຸພາບ / ຫຍາບຄາຍ (Abusive language)',
  'ຫຼອກລວງ / ຂໍ້ມູນປອມແປງ (Fraud)',
  'ເບ້ຽວນັດ / ບໍ່ມານັດຕາມເວລາ (No-show / ghosting)',
  'ຂໍ້ມູນຕິດຕໍ່ບໍ່ຖືກຕ້ອງ (Invalid contact info)',
  'ອື່ນໆ (Other)'
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  target,
}) => {
  const { currentUser, userProfile } = useAuth();
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !target) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSubmitting(true);

    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: currentUser.uid,
        reporterName: userProfile?.displayName || currentUser.displayName || 'ຜູ້ໃຊ້',
        targetType: target.type,
        targetId: target.id,
        targetName: target.name,
        reason,
        details: details.trim(),
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.CREATE, 'reports');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">ລາຍງານການກະທຳຜິດ</h3>
              <p className="text-xs text-neutral-400">ສົ່ງໃຫ້ Admin ກວດສອບ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h4 className="font-bold text-white text-base">ສົ່ງລາຍງານສຳເລັດແລ້ວ</h4>
            <p className="text-xs text-neutral-400">
              Admin ຈະກວດສອບ ແລະ ດຳເນີນການຕາມລະບຽບການຂອງເວັບໄຊ. ຂອບໃຈທີ່ຊ່ວຍຮັກສາສັງຄົມບານເຕະທີ່ດີ!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 text-xs">
              <span className="text-neutral-400">ເປົ້າໝາຍທີ່ລາຍງານ: </span>
              <span className="font-bold text-white">{target.name}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                ເລືອກເຫດຜົນການລາຍງານ *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
              >
                {REPORT_REASONS.map(r => (
                  <option key={r} value={r} className="bg-neutral-900 text-white">
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                ລາຍລະອຽດເພີ່ມເຕີມ
              </label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="ອະທິບາຍສິ່ງທີ່ເກີດຂຶ້ນ..."
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-4 py-2 text-xs text-white focus:outline-none placeholder-neutral-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white"
              >
                ຍົກເລີກ
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow transition disabled:opacity-50"
              >
                {submitting ? 'ກຳລັງສົ່ງ...' : 'ສົ່ງລາຍງານ'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
