import React, { useState, useEffect } from 'react';
import { 
  X, 
  Bell, 
  Smartphone, 
  Share, 
  PlusSquare, 
  CheckCircle2, 
  AlertCircle,
  Send,
  Download
} from 'lucide-react';
import { getDevicePlatform, isPWA, requestPushPermission } from '../services/fcmService';
import { useAuth } from '../context/AuthContext';

interface InstallPushModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallPushModal: React.FC<InstallPushModalProps> = ({
  isOpen,
  onClose
}) => {
  const { currentUser } = useAuth();
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop' | 'mobile' | 'pwa'>('desktop');
  const [inPwa, setInPwa] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [requesting, setRequesting] = useState(false);
  const [feedback, setFeedback] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPlatform(getDevicePlatform());
      setInPwa(isPWA());
      if ('Notification' in window) {
        setPermission(Notification.permission);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPush = async () => {
    if (!currentUser) {
      setFeedback('ກະລຸນາເຂົ້າສູ່ລະບົບກ່ອນເພື່ອເປີດຮັບ Push Notification');
      return;
    }

    setRequesting(true);
    setFeedback('');
    try {
      const res = await requestPushPermission(currentUser.uid, currentUser.email || '');
      if (res.success) {
        setPermission('granted');
        setFeedback('✅ ເປີດຮັບ Push Notification ສຳເລັດແລ້ວ! ລະບົບຈະແຈ້ງເຕືອນໜ້າຈໍທຸກຄັ້ງທີ່ມີໂພສໃໝ່.');

        // Test immediate notification popup
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification('⚽ LNT Football Connect', {
            body: 'ຍິນດີຕ້ອນຮັບ! ລະບົບ Push Notification ເປີດໃຊ້ງານເທິງໂທລະສັບຂອງທ່ານຮຽບຮ້ອຍແລ້ວ.',
            icon: '/icon.svg',
            badge: '/icon.svg',
            tag: 'welcome-notification'
          });
        }
      } else {
        setFeedback(`⚠️ ${res.error || 'ບໍ່ສາມາດເປີດ Push ໄດ້ ກະລຸນາກວດສອບສິດອະນຸຍາດ'}`);
      }
    } catch (e: any) {
      setFeedback(`Error: ${e.message}`);
    } finally {
      setRequesting(false);
    }
  };

  const handleTestNotification = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') {
      await handleRequestPush();
      return;
    }

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification('⚽ ທົດສອບ: ຫາຄູ່ເຕະບານດ່ວນ!', {
          body: 'ທີມນ້ຳທາ ຢູນາຍເຕັດ ຊອກຫາຄູ່ແຂ່ງ ວັນເສົາ 19:00 ທີ່ສະໜາມຫຼວງນ້ຳທາ • ບານ 7 ຄົນ',
          icon: '/icon.svg',
          badge: '/icon.svg',
          tag: 'test-direct-' + Date.now(),
          data: { url: '/' },
          vibrate: [200, 100, 200]
        } as any);
      } else {
        new Notification('⚽ ທົດສອບ: ຫາຄູ່ເຕະບານດ່ວນ!', {
          body: 'ທີມນ້ຳທາ ຢູນາຍເຕັດ ຊອກຫາຄູ່ແຂ່ງ ວັນເສົາ 19:00 ທີ່ສະໜາມຫຼວງນ້ຳທາ',
          icon: '/icon.svg'
        });
      }
      setFeedback('🔔 ສົ່ງການແຈ້ງເຕືອນທົດສອບຂຶ້ນໜ້າຈໍແລ້ວ! ກະລຸນາກວດເບິ່ງແຖບ Notification ຂອງໂທລະສັບ.');
    } catch (err: any) {
      setFeedback('Error: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Push Notification ໜ້າຈໍໂທລະສັບ</h3>
              <p className="text-xs text-neutral-400">
                ແຈ້ງເຕືອນເດັ້ງຂຶ້ນໜ້າຈໍ ແມ່ນແຕ່ຕອນບໍ່ໄດ້ເປີດເວັບ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">

          {/* Current Status Badge */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                permission === 'granted' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`} />
              <div>
                <p className="text-xs font-semibold text-white">
                  ສະຖານະ Push: {permission === 'granted' ? 'ເປີດໃຊ້ງານແລ້ວ (Active)' : 'ຍັງບໍ່ໄດ້ເປີດ (Disabled)'}
                </p>
                <p className="text-[11px] text-neutral-400">
                  ອຸປະກອນ: <span className="capitalize font-bold text-neutral-200">{platform}</span> {inPwa ? '(PWA Mode)' : ''}
                </p>
              </div>
            </div>

            {permission === 'granted' ? (
              <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ພ້ອມຮັບແຈ້ງເຕືອນ
              </span>
            ) : (
              <button
                onClick={handleRequestPush}
                disabled={requesting}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition shadow"
              >
                {requesting ? 'ກຳລັງເປີດ...' : 'ກົດເປີດດຽວນີ້'}
              </button>
            )}
          </div>

          {/* Special Instructions for iPhone / iOS */}
          {platform === 'ios' && !inPwa && (
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/50 space-y-3">
              <div className="flex items-center space-x-2 text-amber-300 font-bold text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>ຂໍ້ກຳນົດສຳລັບ iPhone / iPad (iOS 16.4+):</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Apple ອະນຸຍາດໃຫ້ Web Push Notification ເຮັດວຽກໄດ້ສະເພາະເວັບທີ່ຖືກເພີ່ມລົງໜ້າຈໍຫຼັກ (Home Screen) ເທົ່ານັ້ນ.
              </p>
              <div className="space-y-2 text-xs text-neutral-300 bg-neutral-950/80 p-3 rounded-xl border border-neutral-800 font-medium">
                <div className="flex items-center space-x-2">
                  <Share className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>1. ກົດປຸ່ມ <strong>Share</strong> (ແບ່ງປັນ) ຢູ່ແຖບດ້ານລຸ່ມຂອງ Safari</span>
                </div>
                <div className="flex items-center space-x-2">
                  <PlusSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>2. ເລື່ອນລົງແລ້ວກົດ <strong>"Add to Home Screen"</strong> (ເພີ່ມໃສ່ໜ້າຈໍໂຮມ)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>3. ເປີດແອັບຈາກໜ້າຈໍໂຮມ ແລ້ວກົດ <strong>"ເປີດຮັບ Push Notification"</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* Instructions for Android Chrome */}
          {(platform === 'android' || platform === 'desktop') && (
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs text-neutral-300">
              <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>ສຳລັບ Android Chrome & Computer:</span>
              </p>
              <p className="text-neutral-400 leading-relaxed">
                ເມື່ອທ່ານກົດອະນຸຍາດ (Allow), Service Worker ຈະເຮັດວຽກໃນພື້ນຫຼັງ (Background). ເມື່ອມີທີມໂພສຫາຄູ່ເຕະບານໃໝ່, ລະບົບຈະສັ່ງໃຫ້ໂທລະສັບສັ່ນ ແລະ ແຈ້ງເຕືອນເທິງແຖບ Notification ທັນທີ ແມ່ນແຕ່ຕອນທີ່ປິດໜ້າຈໍ ຫຼື ບໍ່ໄດ້ເປີດເວັບ.
              </p>
            </div>
          )}

          {/* Test Buttons */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={handleTestNotification}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center gap-2 transition"
            >
              <Send className="w-4 h-4 text-emerald-400" />
              <span>ທົດສອບແຈ້ງເຕືອນໜ້າຈໍໂທລະສັບ</span>
            </button>
          </div>

          {feedback && (
            <div className={`p-3 rounded-xl text-xs ${
              feedback.includes('✅') || feedback.includes('🔔')
                ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50'
                : 'bg-amber-950/40 text-amber-300 border border-amber-900/50'
            }`}>
              {feedback}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white transition"
          >
            ປິດ
          </button>
        </div>

      </div>
    </div>
  );
};
