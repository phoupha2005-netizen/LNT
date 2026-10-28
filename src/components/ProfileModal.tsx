import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Shield, 
  MapPin, 
  Phone, 
  Eye, 
  EyeOff, 
  Check, 
  Copy, 
  Trophy,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LAO_PROVINCES, PRESET_TEAM_LOGOS } from '../constants/laoData';
import { 
  requestPushPermission, 
  togglePushNotificationPreference, 
  getPushNotificationStatus, 
  getDevicePlatform 
} from '../services/fcmService';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, userProfile, updateProfileData } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamLogo, setTeamLogo] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [hidePhone, setHidePhone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [success, setSuccess] = useState(false);

  // Push Notification state
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushStatusMsg, setPushStatusMsg] = useState('');
  const platform = getDevicePlatform();

  useEffect(() => {
    if (userProfile && isOpen) {
      setDisplayName(userProfile.displayName || '');
      setPhotoURL(userProfile.photoURL || '');
      setTeamName(userProfile.teamName || '');
      setTeamLogo(userProfile.teamLogo || '');
      setProvince(userProfile.province || 'ຫຼວງນ້ຳທາ (LNT)');
      setDistrict(userProfile.district || 'ເມືອງນ້ຳທາ');
      setPhone(userProfile.phone || '');
      setWhatsapp(userProfile.whatsapp || '');
      setHidePhone(Boolean(userProfile.hidePhone));

      if (currentUser) {
        getPushNotificationStatus(currentUser.uid).then((st) => {
          setPushEnabled(st.enabled);
        });
      }
    }
  }, [userProfile, isOpen, currentUser]);

  const handleTogglePush = async () => {
    if (!currentUser) return;
    setPushLoading(true);
    setPushStatusMsg('');

    if (!pushEnabled) {
      const res = await requestPushPermission(currentUser.uid, currentUser.email || '');
      if (res.success) {
        setPushEnabled(true);
        setPushStatusMsg('ເປີດຮັບການແຈ້ງເຕືອນສຳເລັດແລ້ວ! ທ່ານຈະໄດ້ຮັບ Push ເມື່ອມີໂພສຫາຄູ່ໃໝ່.');
      } else {
        setPushStatusMsg(res.error || 'ບໍ່ສາມາດເປີດການແຈ້ງເຕືອນໄດ້');
      }
    } else {
      const ok = await togglePushNotificationPreference(currentUser.uid, false);
      if (ok) {
        setPushEnabled(false);
        setPushStatusMsg('ປິດການແຈ້ງເຕືອນສຳເລັດແລ້ວ');
      }
    }
    setPushLoading(false);
  };

  if (!isOpen || !currentUser) return null;

  const currentProvObj = LAO_PROVINCES.find(p => p.name === province);
  const districts = currentProvObj ? currentProvObj.districts : ['ເມືອງນ້ຳທາ'];

  const handleCopyId = () => {
    navigator.clipboard.writeText(currentUser.uid);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfileData({
        displayName: displayName.trim(),
        photoURL: photoURL.trim(),
        teamName: teamName.trim(),
        teamLogo: teamLogo.trim(),
        province,
        district,
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        hidePhone,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">ໂປຣໄຟລ໌ຂອງຂ້ອຍ (My Profile)</h3>
              <p className="text-xs text-neutral-400">ຈັດການຂໍ້ມູນສ່ວນຕົວ ແລະ ທີມບານ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* User ID Card */}
          <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-neutral-500 block uppercase font-bold tracking-wider">User ID ປະຈຳບັນຊີ</span>
              <span className="font-mono text-neutral-300 text-xs truncate max-w-[220px] inline-block">
                {currentUser.uid}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyId}
              className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-[11px] flex items-center gap-1 transition"
            >
              {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedId ? 'ຄັດລອກແລ້ວ' : 'ຄັດລອກ ID'}</span>
            </button>
          </div>

          {/* Avatar Preview */}
          <div className="flex items-center space-x-4">
            <img
              src={photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${currentUser.uid}`}
              alt="Avatar"
              className="w-16 h-16 rounded-full object-cover ring-2 ring-emerald-500/40 p-0.5 bg-neutral-800"
            />
            <div className="flex-1">
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                ຮູບໂປຣໄຟລ໌ (Avatar URL)
              </label>
              <input
                type="text"
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                placeholder="https://..."
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                ຊື່ / ຊື່ຫຼິ້ນ *
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                ອີເມລ (Email)
              </label>
              <input
                type="text"
                disabled
                value={currentUser.email || ''}
                className="w-full bg-neutral-950/60 border border-neutral-800 text-neutral-500 rounded-xl px-3 py-2 text-xs cursor-not-allowed"
              />
            </div>
          </div>

          {/* Team Name */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-emerald-400" />
              <span>ຊື່ທີມບານຂອງທ່ານ</span>
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="ເຊັ່ນ: ທີມນ້ຳທາ ຢູນາຍເຕັດ"
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          {/* Province & District */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                ແຂວງ
              </label>
              <select
                value={province}
                onChange={(e) => {
                  setProvince(e.target.value);
                  const pObj = LAO_PROVINCES.find(p => p.name === e.target.value);
                  if (pObj && pObj.districts.length > 0) {
                    setDistrict(pObj.districts[0]);
                  }
                }}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                {LAO_PROVINCES.map(p => (
                  <option key={p.name} value={p.name} className="bg-neutral-900 text-white">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                ເມືອງ
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                {districts.map(d => (
                  <option key={d} value={d} className="bg-neutral-900 text-white">
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Phone & WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>ເບີໂທລະສັບ</span>
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
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
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

          {/* Privacy Toggle: Hide Phone */}
          <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              {hidePhone ? (
                <EyeOff className="w-4 h-4 text-amber-400" />
              ) : (
                <Eye className="w-4 h-4 text-emerald-400" />
              )}
              <div>
                <p className="text-xs font-semibold text-white">
                  {hidePhone ? 'ເຊື່ອງເບີໂທໃນໂພສ' : 'ເປີດເຜີຍເບີໂທໃນໂພສ'}
                </p>
                <p className="text-[10px] text-neutral-400">
                  {hidePhone 
                    ? 'ທີມອື່ນຈະບໍ່ເຫັນເບີໂທຂອງທ່ານ ແລະ ຈະຕິດຕໍ່ຜ່ານແຊັດເທົ່ານັ້ນ' 
                    : 'ທີມອື່ນສາມາດກົດປຸ່ມໂທ ແລະ WhatsApp ຫາທ່ານໄດ້ໂດຍກົງ'}
                </p>
              </div>
            </div>

            <input
              type="checkbox"
              checked={hidePhone}
              onChange={(e) => setHidePhone(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-neutral-900 border-neutral-700 cursor-pointer"
            />
          </div>

          {/* FCM Push Notification Settings */}
          <div className="p-4 bg-gradient-to-r from-neutral-950 to-neutral-900 rounded-2xl border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Web Push Notification</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400">
                      FCM
                    </span>
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    ແຈ້ງເຕືອນເມື່ອມີທີມໂພສຫາຄູ່ເຕະບານໃໝ່
                  </p>
                </div>
              </div>

              {/* Push Toggle */}
              <button
                type="button"
                onClick={handleTogglePush}
                disabled={pushLoading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  pushEnabled ? 'bg-emerald-500' : 'bg-neutral-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    pushEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {pushStatusMsg && (
              <p className="text-[11px] text-emerald-400 font-medium bg-emerald-950/40 p-2 rounded-xl border border-emerald-900/40">
                {pushStatusMsg}
              </p>
            )}

            {/* Platform & iOS PWA tip */}
            <div className="text-[10px] text-neutral-400 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800/80 space-y-1">
              <p className="flex items-center gap-1.5 text-neutral-300">
                <span>📱 ອຸປະກອນ: <strong className="text-white capitalize">{platform}</strong></span>
                <span>•</span>
                <span>ສະຖານະ: <strong className={pushEnabled ? "text-emerald-400" : "text-neutral-500"}>{pushEnabled ? "ເປີດຮັບແລ້ວ" : "ປິດຢູ່"}</strong></span>
              </p>
              {platform === 'ios' && (
                <p className="text-amber-400/90 leading-relaxed">
                  💡 ສຳລັບ iPhone/iPad: ກະລຸນາກົດປຸ່ມ Share (ແບ່ງປັນ) ໃນ Safari ແລ້ວເລືອກ <strong>"Add to Home Screen"</strong> (ເພີ່ມໃສ່ໜ້າຈໍໂຮມ) ເພື່ອເປີດໃຊ້ Push Notification ໃນ iOS.
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
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
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-md transition disabled:opacity-50"
            >
              {saving ? 'ກຳລັງບັນທຶກ...' : success ? 'ບັນທຶກສຳເລັດ!' : 'ບັນທຶກໂປຣໄຟລ໌'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
