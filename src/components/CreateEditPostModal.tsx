import React, { useState, useEffect } from 'react';
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
  Info
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
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
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
  const [matchType, setMatchType] = useState<MatchFormat>('7');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('17:30');
  const [pitchName, setPitchName] = useState('');
  const [province, setProvince] = useState(currentProvince || 'ຫຼວງນ້ຳທາ (LNT)');
  const [district, setDistrict] = useState('ເມືອງນ້ຳທາ');
  const [skillLevel, setSkillLevel] = useState('ປານກາງ / ທົ່ວໄປ');
  const [pitchFee, setPitchFee] = useState('250,000 ກີບ');
  const [feeType, setFeeType] = useState<'split' | 'loser_pays' | 'host_pays' | 'custom'>('split');
  const [details, setDetails] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [hidePhone, setHidePhone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
      setMatchType(postToEdit.matchType);
      setMatchDate(postToEdit.matchDate);
      setMatchTime(postToEdit.matchTime);
      setPitchName(postToEdit.pitchName);
      setProvince(postToEdit.province);
      setDistrict(postToEdit.district);
      setSkillLevel(postToEdit.skillLevel);
      setPitchFee(postToEdit.pitchFee);
      setFeeType(postToEdit.feeType);
      setDetails(postToEdit.details || '');
      setContactPhone(postToEdit.contactPhone || '');
      setContactWhatsapp(postToEdit.contactWhatsapp || '');
      setHidePhone(Boolean(postToEdit.hidePhone));
    } else {
      // Default initial form
      setTitle(`ຫາຄູ່ເຕະບານ ${matchType} ຄົນ ມ່ວນຊື່ນ`);
      setTeamName(userProfile?.teamName || 'ທີມນ້ຳທາ FC');
      setTeamLogo(userProfile?.teamLogo || PRESET_TEAM_LOGOS[0].url);
      setMatchType('7');
      setMatchDate(getTomorrowString());
      setMatchTime('17:30');
      setPitchName(POPULAR_PITCHES_LNT[0]);
      setProvince(currentProvince || 'ຫຼວງນ້ຳທາ (LNT)');
      setDistrict(userProfile?.district || 'ເມືອງນ້ຳທາ');
      setSkillLevel('ປານກາງ / ທົ່ວໄປ');
      setPitchFee('200,000 ກີບ / ຊົ່ວໂມງ');
      setFeeType('split');
      setDetails('ຫາທີມເຕະບານມ່ວນຊື່ນ ຮັກສາສຸຂະພາບ ຫຼິ້ນສະອາດ ບໍ່ມີເລື່ອງ. ເສື້ອທີມສີຂຽວ ຫຼື ສີດຳ.');
      setContactPhone(userProfile?.phone || '');
      setContactWhatsapp(userProfile?.whatsapp || userProfile?.phone || '');
      setHidePhone(Boolean(userProfile?.hidePhone));
    }
  }, [postToEdit, isOpen, userProfile, currentProvince]);

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
          details: details.trim(),
          contactPhone: contactPhone.trim(),
          contactWhatsapp: contactWhatsapp.trim(),
          hidePhone,
          status: 'open',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, 'posts'), newPost);
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                ຊື່ທີມຂອງທ່ານ *
              </label>
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="ຊື່ສະໂມສອນ ຫຼື ທີມບານ"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                ເລືອກໂລໂກ້ທີມ
              </label>
              <div className="flex items-center space-x-2">
                {PRESET_TEAM_LOGOS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTeamLogo(item.url)}
                    className={`w-9 h-9 rounded-xl p-0.5 border overflow-hidden transition relative ${
                      teamLogo === item.url
                        ? 'border-emerald-500 ring-2 ring-emerald-500/40'
                        : 'border-neutral-800 hover:border-neutral-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                    {teamLogo === item.url && (
                      <span className="absolute bottom-0 right-0 bg-emerald-500 rounded-full p-0.5 text-black">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
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

          {/* Skill Level & Fee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-emerald-400" />
                <span>ວິທີແບ່ງຄ່າສະໜາມ</span>
              </label>
              <select
                value={feeType}
                onChange={(e) => setFeeType(e.target.value as any)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
              >
                {FEE_TYPES.map((f) => (
                  <option key={f.value} value={f.value} className="bg-neutral-900 text-white">
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fee estimate note */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              ຄ່າສະໜາມປະມານການ
            </label>
            <input
              type="text"
              value={pitchFee}
              onChange={(e) => setPitchFee(e.target.value)}
              placeholder="ເຊັ່ນ: 200,000 ກີບ / ຊົ່ວໂມງ"
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
            />
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
