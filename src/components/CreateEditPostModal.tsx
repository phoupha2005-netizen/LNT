import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Trophy, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Banknote, 
  Award, 
  Phone, 
  Check, 
  Sparkles,
  Info,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Trash2,
  Shield,
  HelpCircle
} from 'lucide-react';
import { FootballPost, MatchFormat } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  LAO_PROVINCES, 
  MATCH_FORMATS, 
  SKILL_LEVELS, 
  FEE_TYPES, 
  PRESET_TEAM_LOGOS, 
  POPULAR_PITCHES_LNT 
} from '../constants/laoData';
import { collection, addDoc, doc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface CreateEditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  postToEdit?: FootballPost | null;
  currentProvince: string;
  onSuccess: (post: FootballPost) => void;
}

export const CreateEditPostModal: React.FC<CreateEditPostModalProps> = ({
  isOpen,
  onClose,
  postToEdit,
  currentProvince,
  onSuccess,
}) => {
  const { currentUser, userProfile } = useAuth();

  const [title, setTitle] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamLogo, setTeamLogo] = useState('');
  const [logoMode, setLogoMode] = useState<'preset' | 'upload' | 'url'>('preset');
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const [matchType, setMatchType] = useState<MatchFormat>('7');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('17:30');
  const [pitchName, setPitchName] = useState('');
  const [province, setProvince] = useState(currentProvince || 'ຫຼວງນ້ຳທາ (LNT)');
  const [district, setDistrict] = useState('ເມືອງນ້ຳທາ');
  const [skillLevel, setSkillLevel] = useState('ປານກາງ / ທົ່ວໄປ');
  const [pitchFee, setPitchFee] = useState('200,000 ກີບ / ຊົ່ວໂມງ');
  const [feeType, setFeeType] = useState<'split' | 'host_pays' | 'loser_pays' | 'per_person' | 'custom'>('split');
  const [feeSplitDetails, setFeeSplitDetails] = useState('');
  const [details, setDetails] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [hidePhone, setHidePhone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Default dates: tomorrow
  const getTomorrowString = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (postToEdit) {
      setTitle(postToEdit.title);
      setTeamName(postToEdit.teamName);
      setTeamLogo(postToEdit.teamLogo || '');
      setLogoUrlInput(postToEdit.teamLogo && !postToEdit.teamLogo.startsWith('data:') ? postToEdit.teamLogo : '');
      setMatchType(postToEdit.matchType);
      setMatchDate(postToEdit.matchDate);
      setMatchTime(postToEdit.matchTime);
      setPitchName(postToEdit.pitchName);
      setProvince(postToEdit.province);
      setDistrict(postToEdit.district);
      setSkillLevel(postToEdit.skillLevel);
      setPitchFee(postToEdit.pitchFee);
      setFeeType((postToEdit.feeType as any) || 'split');
      setFeeSplitDetails(postToEdit.feeSplitDetails || '');
      setDetails(postToEdit.details || '');
      setContactPhone(postToEdit.contactPhone || '');
      setContactWhatsapp(postToEdit.contactWhatsapp || '');
      setHidePhone(Boolean(postToEdit.hidePhone));
    } else {
      // Default initial form
      setTitle(`ຫາຄູ່ເຕະບານ ${matchType} ຄົນ ມ່ວນຊື່ນ`);
      setTeamName(userProfile?.teamName || 'ທີມນ້ຳທາ FC');
      const initialLogo = userProfile?.teamLogo || PRESET_TEAM_LOGOS[0].url;
      setTeamLogo(initialLogo);
      setLogoUrlInput(initialLogo && !initialLogo.startsWith('data:') ? initialLogo : '');
      setMatchType('7');
      setMatchDate(getTomorrowString());
      setMatchTime('17:30');
      setPitchName(POPULAR_PITCHES_LNT[0]);
      setProvince(currentProvince || 'ຫຼວງນ້ຳທາ (LNT)');
      setDistrict(userProfile?.district || 'ເມືອງນ້ຳທາ');
      setSkillLevel('ປານກາງ / ທົ່ວໄປ');
      setPitchFee('200,000 ກີບ / ຊົ່ວໂມງ');
      setFeeType('split');
      setFeeSplitDetails('');
      setDetails('ຫາທີມເຕະບານມ່ວນຊື່ນ ຮັກສາສຸຂະພາບ ຫຼິ້ນສະອາດ ບໍ່ມີເລື່ອງ. ເສື້ອທີມສີຂຽວ ຫຼື ສີດຳ.');
      setContactPhone(userProfile?.phone || '');
      setContactWhatsapp(userProfile?.whatsapp || userProfile?.phone || '');
      setHidePhone(Boolean(userProfile?.hidePhone));
    }
  }, [postToEdit, isOpen, userProfile, currentProvince]);

  // Client-side image upload & resize for team logo
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('ກະລຸນາເລືອກໄຟລ໌ຮູບພາບ (PNG, JPG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 250;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setTeamLogo(compressed);
          setErrorMsg('');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Fee calculation guide
  const getFeeCalculationHint = () => {
    const numMatch = pitchFee.replace(/[^0-9]/g, '');
    const num = parseInt(numMatch, 10);
    if (feeType === 'split') {
      if (num && !isNaN(num)) {
        const half = Math.round(num / 2).toLocaleString('en-US');
        return `💡 ແຕ່ລະທີມຈ່າຍ: ~${half} ກີບ (ຫານເຄິ່ງ 50/50 ທັງສອງທີມ)`;
      }
      return '💡 ທັງສອງທີມອອກຄ່າສະໜາມຄົນລະເຄິ່ງ ເທົ່າກັນ (50/50)';
    }
    if (feeType === 'host_pays') {
      return '💡 ທີມເຈົ້າພາບຈ່າຍຄ່າສະໜາມທັງໝົດ ທີມມາເຕະລ້າ/ຟຣີ ບໍ່ຕ້ອງຈ່າຍຄ່າສະໜາມ!';
    }
    if (feeType === 'loser_pays') {
      return '💡 ທີມທີ່ແພ້ການແຂ່ງຂັນຈ່າຍຄ່າສະໜາມ (ຫຼື ຈ່າຍສ່ວນຫຼາຍຕາມທີ່ຕົກລົງກັນ)';
    }
    if (feeType === 'per_person') {
      const players = matchType === '5' ? 10 : matchType === '7' ? 14 : 22;
      if (num && !isNaN(num)) {
        const perPerson = Math.round(num / players).toLocaleString('en-US');
        return `💡 ປະມານ ~${perPerson} ກີບ / ຄົນ (ຄິດສະເລ່ຍນັກເຕະ ${players} ຄົນ)`;
      }
      return '💡 ຫານສະເລ່ຍຕາມຈຳນວນນັກເຕະທັງໝົດທີ່ມາລົງສະໜາມ';
    }
    return '💡 ຂໍ້ຕົກລົງພິເສດ: ລະບຸລາຍລະອຽດ ຫຼື ວິທີແບ່ງຄ່າສະໜາມ/ຄ່ານ້ຳດື່ມຕາມຕ້ອງການ';
  };

  // Update districts when province changes
  const activeProvinceObj = LAO_PROVINCES.find(p => p.name === province);
  const districtList = activeProvinceObj ? activeProvinceObj.districts : ['ເມືອງນ້ຳທາ'];

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('ກະລຸນາປ້ອນຫົວຂໍ້ໂພສ');
      return;
    }
    if (!teamName.trim()) {
      setErrorMsg('ກະລຸນາປ້ອນຊື່ທີມຂອງທ່ານ');
      return;
    }
    if (!matchDate) {
      setErrorMsg('ກະລຸນາເລືອກວັນທີເຕະ');
      return;
    }
    if (!pitchName.trim()) {
      setErrorMsg('ກະລຸນາລະບຸຊື່ສະໜາມເຕະບານ');
      return;
    }

    setSubmitting(true);
    try {
      if (postToEdit) {
        // Edit existing post
        const postRef = doc(db, 'posts', postToEdit.id);
        const updateData: Partial<FootballPost> = {
          title: title.trim(),
          teamName: teamName.trim(),
          teamLogo: teamLogo.trim() || PRESET_TEAM_LOGOS[0].url,
          matchType,
          matchDate,
          matchTime,
          pitchName: pitchName.trim(),
          province,
          district,
          skillLevel,
          pitchFee: pitchFee.trim(),
          feeType,
          feeSplitDetails: feeSplitDetails.trim(),
          details: details.trim(),
          contactPhone: contactPhone.trim(),
          contactWhatsapp: contactWhatsapp.trim(),
          hidePhone,
          updatedAt: new Date().toISOString(),
        };

        await updateDoc(postRef, updateData);
        onSuccess({ ...postToEdit, ...updateData } as FootballPost);
        onClose();
      } else {
        // Create new post
        const newPost: Omit<FootballPost, 'id'> = {
          ownerId: currentUser.uid,
          ownerName: userProfile?.displayName || currentUser.displayName || 'ນັກເຕະບານ',
          ownerPhotoURL: userProfile?.photoURL || currentUser.photoURL || '',
          title: title.trim(),
          teamName: teamName.trim(),
          teamLogo: teamLogo.trim() || PRESET_TEAM_LOGOS[0].url,
          matchType,
          matchDate,
          matchTime,
          pitchName: pitchName.trim(),
          province,
          district,
          skillLevel,
          pitchFee: pitchFee.trim(),
          feeType,
          feeSplitDetails: feeSplitDetails.trim(),
          details: details.trim(),
          contactPhone: contactPhone.trim(),
          contactWhatsapp: contactWhatsapp.trim(),
          hidePhone,
          status: 'open',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, 'posts'), newPost);

        // 1. Collect target subscriber devices and create in-app notifications
        try {
          const tokensSnap = await getDocs(query(collection(db, 'fcmTokens'), where('enabled', '==', true)));
          const targetTokens: string[] = [];
          const targetSubscribers: any[] = [];
          const targetUserIds = new Set<string>();

          tokensSnap.forEach((tDoc) => {
            const tData = tDoc.data();
            if (tData.userId && tData.userId !== currentUser.uid) {
              targetUserIds.add(tData.userId);
              targetSubscribers.push({
                id: tDoc.id,
                token: tData.token,
                subscription: tData.subscription,
                userId: tData.userId
              });
              if (tData.token) {
                targetTokens.push(tData.token);
              }
            }
          });

          // Dispatch in-app notifications to all recipient subscribers
          targetUserIds.forEach((recipientId) => {
            addDoc(collection(db, 'notifications'), {
              recipientId,
              senderId: currentUser.uid,
              senderName: newPost.ownerName,
              senderPhotoURL: newPost.ownerPhotoURL,
              type: 'match_post',
              title: `⚽ ຫາຄູ່ເຕະບານໃໝ່: ${newPost.teamName}`,
              body: `ວັນທີ ${newPost.matchDate} (${newPost.matchTime} ໂມງ) ທີ່ ${newPost.pitchName} (${newPost.province}) • ບານ ${newPost.matchType} ຄົນ`,
              data: {
                postId: docRef.id,
                teamName: newPost.teamName,
                matchDate: newPost.matchDate,
                matchTime: newPost.matchTime,
                pitchName: newPost.pitchName,
                province: newPost.province
              },
              read: false,
              createdAt: new Date().toISOString()
            }).catch(e => console.warn('In-app notification dispatch notice:', e));
          });

          // Trigger Server Push Notification via Web Push (RFC 8292) and Firebase Admin SDK
          fetch('/api/send-post-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              postId: docRef.id,
              postData: newPost,
              subscribers: targetSubscribers,
              tokens: targetTokens
            })
          }).catch(err => console.warn('Background push notification trigger:', err));
        } catch (pushErr) {
          console.warn('Notification collection query notice:', pushErr);
          fetch('/api/send-post-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId: docRef.id, postData: newPost })
          }).catch(err => console.warn('Background push notification trigger:', err));
        }

        onSuccess({ id: docRef.id, ...newPost });
        onClose();
      }
    } catch (err) {
      console.error('Failed to save post:', err);
      setErrorMsg('ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກໂພສ ກະລຸນາລອງໃໝ່');
      handleFirestoreError(err, postToEdit ? OperationType.UPDATE : OperationType.CREATE, 'posts');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {postToEdit ? 'ແກ້ໄຂໂພສນັດເຕະບານ' : 'ສ້າງໂພສຫາຄູ່ເຕະບານໃໝ່'}
              </h3>
              <p className="text-xs text-neutral-400">
                ປະກາດຫາທີມຄູ່ແຂ່ງພາຍໃນແຂວງ {province}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Post Title */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              ຫົວຂໍ້ໂພສ *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ຕົວຢ່າງ: ຫາຄູ່ເຕະບານ 7 ຄົນ ແລງວັນເສົາ ສະໜາມນ້ຳທາ"
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none placeholder-neutral-500"
            />
          </div>

          {/* Team Name & Logo Selection */}
          <div className="bg-neutral-950/70 p-4 rounded-2xl border border-neutral-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                {/* Logo Preview Badge */}
                <div className="relative w-14 h-14 rounded-2xl bg-neutral-900 border-2 border-emerald-500/50 p-1 flex items-center justify-center shrink-0 shadow-lg overflow-hidden group">
                  <img
                    src={teamLogo || PRESET_TEAM_LOGOS[0].url}
                    alt={teamName || 'Team Logo'}
                    className="w-full h-full object-cover rounded-xl"
                  />
                  {teamLogo && (
                    <button
                      type="button"
                      onClick={() => setTeamLogo(PRESET_TEAM_LOGOS[0].url)}
                      title="ລຶບຮູບ ແລະ ໃຊ້ຄ່າເລີ່ມຕົ້ນ"
                      className="absolute inset-0 bg-black/70 text-red-400 opacity-0 group-hover:opacity-100 flex items-center justify-center transition rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>ໂລໂກ້ ແລະ ຊື່ທີມບານ (Team Profile)</span>
                  </h4>
                  <p className="text-xs text-neutral-400">
                    ອັບໂຫຼດຮູບໂລໂກ້ທີມຂອງທ່ານເອງ ຫຼື ເລືອກຈາກຮູບທີ່ມີໃຫ້
                  </p>
                </div>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="flex items-center space-x-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800 text-xs">
                <button
                  type="button"
                  onClick={() => setLogoMode('preset')}
                  className={`px-2.5 py-1 rounded-lg transition font-medium flex items-center gap-1 ${
                    logoMode === 'preset' ? 'bg-emerald-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Trophy className="w-3 h-3" />
                  <span>Preset</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLogoMode('upload');
                    fileInputRef.current?.click();
                  }}
                  className={`px-2.5 py-1 rounded-lg transition font-medium flex items-center gap-1 ${
                    logoMode === 'upload' ? 'bg-emerald-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-3 h-3" />
                  <span>ອັບໂຫຼດ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLogoMode('url')}
                  className={`px-2.5 py-1 rounded-lg transition font-medium flex items-center gap-1 ${
                    logoMode === 'url' ? 'bg-emerald-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <LinkIcon className="w-3 h-3" />
                  <span>URL</span>
                </button>
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleLogoFileUpload}
              className="hidden"
            />

            {/* Team Name Input */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                ຊື່ທີມຂອງທ່ານ *
              </label>
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="ຕົວຢ່າງ: ທີມນ້ຳທາ ຢູນາຍເຕັດ, ດາວມໍລະກົດ FC"
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
              />
            </div>

            {/* Mode 1: Preset Logos Selection Grid */}
            {logoMode === 'preset' && (
              <div className="space-y-2">
                <span className="text-[11px] text-neutral-400 font-medium">ເລືອກໂລໂກ້ທີມສຳເລັດຮູບ (Preset Emblems):</span>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {PRESET_TEAM_LOGOS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      title={item.name}
                      onClick={() => setTeamLogo(item.url)}
                      className={`relative aspect-square rounded-xl p-1 border overflow-hidden transition ${
                        teamLogo === item.url
                          ? 'border-emerald-500 ring-2 ring-emerald-500/50 bg-emerald-500/10 scale-105'
                          : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img src={item.url} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                      {teamLogo === item.url && (
                        <span className="absolute bottom-1 right-1 bg-emerald-500 rounded-full p-0.5 text-neutral-950">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Mode 2: Upload Action Button */}
            {logoMode === 'upload' && (
              <div className="p-4 border border-dashed border-neutral-700 rounded-xl bg-neutral-900/60 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition shadow"
                  >
                    ເລືອກຮູບໂລໂກ້ຈາກໂທລະສັບ / ຄອມພິວເຕີ
                  </button>
                  <p className="text-[11px] text-neutral-500 mt-1.5">
                    ຮອງຮັບ PNG, JPG, WebP (ລະບົບຈະປັບຂະໜາດ ແລະ ບີບອັດໃຫ້ອັດຕະໂນມັດ)
                  </p>
                </div>
              </div>
            )}

            {/* Mode 3: Direct URL Input */}
            {logoMode === 'url' && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={logoUrlInput}
                  onChange={(e) => setLogoUrlInput(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (logoUrlInput.trim()) {
                      setTeamLogo(logoUrlInput.trim());
                    }
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-neutral-950 hover:bg-emerald-400 transition"
                >
                  ໃຊ້ຮູບນີ້
                </button>
              </div>
            )}
          </div>

          {/* Match Format (5, 7, 11) */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">
              ປະເພດການເຕະ (ຈຳນວນຄົນ) *
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {MATCH_FORMATS.map((fmt) => (
                <button
                  key={fmt.value}
                  type="button"
                  onClick={() => setMatchType(fmt.value as MatchFormat)}
                  className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                    matchType === fmt.value
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <span className="text-base font-extrabold">{fmt.badge}</span>
                  <span className="text-[11px] mt-0.5">{fmt.label.split('(')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>ວັນທີເຕະ *</span>
              </label>
              <input
                type="date"
                required
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>ເວລາເຕະ *</span>
              </label>
              <input
                type="time"
                required
                value={matchTime}
                onChange={(e) => setMatchTime(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Pitch Name with Quick suggestions */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>ຊື່ສະໜາມເຕະບານ *</span>
            </label>
            <input
              type="text"
              required
              value={pitchName}
              onChange={(e) => setPitchName(e.target.value)}
              placeholder="ລະບຸຊື່ສະໜາມ ຕົວຢ່າງ: ສະໜາມກິລາແຂວງຫຼວງນ້ຳທາ"
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
            />
            {/* Quick Suggestions for LNT */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[11px] text-neutral-500 py-0.5">ແນະນຳ:</span>
              {POPULAR_PITCHES_LNT.slice(0, 3).map((pitch) => (
                <button
                  key={pitch}
                  type="button"
                  onClick={() => setPitchName(pitch)}
                  className="text-[11px] bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-white px-2 py-0.5 rounded-lg border border-neutral-700/60 transition"
                >
                  {pitch.split('(')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Province & District */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                ແຂວງ *
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
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
              >
                {LAO_PROVINCES.map((p) => (
                  <option key={p.name} value={p.name} className="bg-neutral-900 text-white">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                ເມືອງ *
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
              >
                {districtList.map((d) => (
                  <option key={d} value={d} className="bg-neutral-900 text-white">
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Skill Level Selection */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>ລະດັບຝີມືທີມ</span>
            </label>
            <select
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
            >
              {SKILL_LEVELS.map((s) => (
                <option key={s.value} value={s.value} className="bg-neutral-900 text-white">
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Pitch Fee & Fee Split Configuration */}
          <div className="bg-neutral-950/70 p-4 sm:p-5 rounded-2xl border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">ວິທີແບ່ງຄ່າສະໜາມ (Pitch Fee Agreement) *</h4>
                  <p className="text-[11px] text-neutral-400">ເລືອກວິທີແບ່ງຈ່າຍຄ່າສະໜາມທີ່ຊັດເຈນໃຫ້ທັງສອງທີມຮັບຮູ້</p>
                </div>
              </div>
            </div>

            {/* Visual Fee Split Selection Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {FEE_TYPES.map((f) => {
                const isSelected = feeType === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFeeType(f.value as any)}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? `${f.bgColor} ${f.borderColor} ring-1 ring-emerald-500/30`
                        : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <span className={`text-xs font-bold ${isSelected ? f.color : 'text-neutral-200'}`}>
                        {f.badge}
                      </span>
                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-emerald-500 text-neutral-950 flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                      {f.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Pitch Fee Input with Quick Preset Chips */}
            <div className="space-y-2 pt-1 border-t border-neutral-800/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="block text-xs font-semibold text-neutral-300">
                  ຄ່າສະໜາມທັງໝົດ (Total Pitch Fee):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['150,000 ກີບ', '200,000 ກີບ', '250,000 ກີບ', '300,000 ກີບ'].map((quickPrice) => (
                    <button
                      key={quickPrice}
                      type="button"
                      onClick={() => setPitchFee(quickPrice + ' / ຊົ່ວໂມງ')}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition ${
                        pitchFee.includes(quickPrice)
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold'
                          : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                      }`}
                    >
                      {quickPrice}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="text"
                value={pitchFee}
                onChange={(e) => setPitchFee(e.target.value)}
                placeholder="ຕົວຢ່າງ: 200,000 ກີບ / ຊົ່ວໂມງ ຫຼື 350,000 ກີບ / ແມັດ"
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
              />
            </div>

            {/* Calculation / Explanation Hint Banner */}
            <div className="p-3 bg-neutral-900/90 rounded-xl border border-neutral-800/90 text-xs text-neutral-300 flex items-center gap-2">
              <span className="text-emerald-400 font-semibold">{getFeeCalculationHint()}</span>
            </div>

            {/* Custom Split Details (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                ລາຍລະອຽດວິທີແບ່ງ ຫຼື ຄ່ານ້ຳດື່ມ (ເພີ່ມເຕີມຖ້າມີ):
              </label>
              <input
                type="text"
                value={feeSplitDetails}
                onChange={(e) => setFeeSplitDetails(e.target.value)}
                placeholder="ຕົວຢ່າງ: ຄ່ານ້ຳດື່ມຫານເຄິ່ງ, ທີມເຈົ້າພາບຊ່ວຍ 100,000 ກີບ, ຖ້າສະເໝີຫານເຄິ່ງ"
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2 text-xs text-white focus:outline-none placeholder-neutral-500"
              />
            </div>
          </div>

          {/* Details / Notes */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              ລາຍລະອຽດເພີ່ມເຕີມ / ກະຕິກາ / ສີເສື້ອ
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="ຕົວຢ່າງ: ຫຼິ້ນມ່ວນຊື່ນ, ກຽມເສື້ອທີມສີຂາວ ຫຼື ສີດຳ, ຫ້າມສຽບແຮງ..."
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none placeholder-neutral-500"
            />
          </div>

          {/* Contact Details & Privacy */}
          <div className="bg-neutral-950/60 p-4 rounded-2xl border border-neutral-800 space-y-3">
            <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>ຊ່ອງທາງຕິດຕໍ່</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">
                  ເບີໂທລະສັບ
                </label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="020 xxxx xxxx"
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">
                  WhatsApp
                </label>
                <input
                  type="text"
                  value={contactWhatsapp}
                  onChange={(e) => setContactWhatsapp(e.target.value)}
                  placeholder="020 xxxx xxxx"
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Privacy Checkbox */}
            <label className="flex items-center space-x-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={hidePhone}
                onChange={(e) => setHidePhone(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-neutral-900 border-neutral-700"
              />
              <span className="text-xs text-neutral-300">
                ເຊື່ອງເບີໂທໃນໂພສ (ໃຫ້ຕິດຕໍ່ຜ່ານລະບົບແຊັດເທົ່ານັ້ນ)
              </span>
            </label>
          </div>

          {/* Action Submit Button */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            >
              ຍົກເລີກ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-600/30 transition transform active:scale-95 disabled:opacity-50"
            >
              {submitting ? 'ກຳລັງບັນທຶກ...' : postToEdit ? 'ບັນທຶກການແກ້ໄຂ' : 'ເຜີຍແຜ່ໂພສ (Publish)'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
