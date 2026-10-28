import React from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Banknote, 
  Award, 
  Phone, 
  MessageSquare, 
  Swords, 
  MoreVertical, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle,
  Flag
} from 'lucide-react';
import { FootballPost } from '../types';
import { useAuth } from '../context/AuthContext';
import { SKILL_LEVELS, FEE_TYPES } from '../constants/laoData';

interface PostCardProps {
  post: FootballPost;
  onOpenDetails: (post: FootballPost) => void;
  onOpenChallenge: (post: FootballPost) => void;
  onOpenChatWithUser: (userId: string, userName: string, userPhoto?: string) => void;
  onEditPost: (post: FootballPost) => void;
  onDeletePost: (post: FootballPost) => void;
  onReportPost: (post: FootballPost) => void;
  isChallengedByMe?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onOpenDetails,
  onOpenChallenge,
  onOpenChatWithUser,
  onEditPost,
  onDeletePost,
  onReportPost,
  isChallengedByMe = false,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const isOwner = currentUser?.uid === post.ownerId;
  const canManage = isOwner || isAdmin;

  // Format fee label
  const feeTypeObj = FEE_TYPES.find(f => f.value === post.feeType);
  const feeLabel = post.pitchFee 
    ? `${post.pitchFee} (${feeTypeObj?.label || 'ແບ່ງຈ່າຍ'})` 
    : feeTypeObj?.label || 'ຫານເຄິ່ງກັນ';

  // Format skill badge
  const skillObj = SKILL_LEVELS.find(s => s.value === post.skillLevel) || {
    label: post.skillLevel || 'ມ່ວນຊື່ນ',
    color: 'text-emerald-400 border-emerald-800/50 bg-emerald-950/40'
  };

  // WhatsApp link preparation
  const cleanPhone = (post.contactWhatsapp || post.contactPhone || '').replace(/[^0-9]/g, '');
  const waPhone = cleanPhone.startsWith('856') 
    ? cleanPhone 
    : cleanPhone.startsWith('20') 
    ? `856${cleanPhone}` 
    : cleanPhone.startsWith('020') 
    ? `856${cleanPhone.substring(1)}` 
    : cleanPhone;

  const whatsappMessage = encodeURIComponent(
    `ສະບາຍດີທີມ ${post.teamName}, ຂ້ອຍເຫັນໂພສຫາຄູ່ເຕະບານ "${post.title}" ວັນທີ ${post.matchDate} ທີ່ ${post.pitchName} ຜ່ານເວັບ LNT Football Connect, ທີມເຮົາສົນໃຈຢາກນັດເຕະນຳ!`
  );

  return (
    <div className="bg-neutral-900/90 rounded-2xl border border-neutral-800 hover:border-neutral-700 transition shadow-lg overflow-hidden flex flex-col justify-between group">
      
      {/* Top Banner / Match Status & Menu */}
      <div className="p-4 sm:p-5 pb-3">
        <div className="flex items-start justify-between gap-3 mb-3">
          
          {/* Team Logo & Info */}
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-13 h-13 rounded-xl bg-neutral-800 border border-neutral-700 p-1 flex items-center justify-center shrink-0 shadow-md">
              <img
                src={post.teamLogo || `https://api.dicebear.com/7.x/identicon/svg?seed=${post.teamName}`}
                alt={post.teamName}
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base text-white truncate group-hover:text-emerald-400 transition">
                {post.teamName}
              </h3>
              <p className="text-xs text-neutral-400 truncate flex items-center gap-1.5 mt-0.5">
                <span>ໂດຍ: {post.ownerName}</span>
                <span className="w-1 h-1 rounded-full bg-neutral-600"></span>
                <span>{post.district}</span>
              </p>
            </div>
          </div>

          {/* Status Badge & Actions */}
          <div className="flex items-center space-x-1.5 shrink-0">
            {post.status === 'open' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                ກຳລັງຫາຄູ່
              </span>
            )}
            {post.status === 'confirmed' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                ຢືນຢັນຄູ່ແຂ່ງແລ້ວ
              </span>
            )}
            {post.status === 'completed' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700">
                ເຕະສຳເລັດ
              </span>
            )}
            {post.status === 'cancelled' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
                <AlertCircle className="w-3.5 h-3.5" />
                ຍົກເລີກ
              </span>
            )}

            {/* Dropdown Menu for options */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <div 
                  className="absolute right-0 mt-1 w-40 bg-neutral-800 rounded-xl shadow-xl border border-neutral-700 py-1.5 z-20"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  {canManage && (
                    <>
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onEditPost(post);
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-neutral-200 hover:bg-neutral-700 flex items-center gap-2"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>ແກ້ໄຂໂພສ</span>
                      </button>
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onDeletePost(post);
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-neutral-700 flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        <span>ລຶບໂພສ</span>
                      </button>
                    </>
                  )}
                  {!isOwner && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onReportPost(post);
                      }}
                      className="w-full px-3 py-2 text-left text-xs text-neutral-300 hover:bg-neutral-700 flex items-center gap-2"
                    >
                      <Flag className="w-3.5 h-3.5 text-amber-400" />
                      <span>ລາຍງານໂພສນີ້</span>
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Title */}
        <h4 
          onClick={() => onOpenDetails(post)}
          className="text-white font-semibold text-base mb-3 leading-snug cursor-pointer hover:underline"
        >
          {post.title}
        </h4>

        {/* Match Key Attributes Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs text-neutral-300 mb-3 bg-neutral-950/40 p-3 rounded-xl border border-neutral-800/80">
          
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium text-neutral-200">{post.matchDate}</span>
          </div>

          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium text-neutral-200">{post.matchTime} ໂມງ</span>
          </div>

          <div className="flex items-center space-x-2 col-span-2 truncate">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">{post.pitchName} ({post.district})</span>
          </div>

          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-blue-400 shrink-0" />
            <span>{post.matchType} ຄົນ ({post.matchType}v{post.matchType})</span>
          </div>

          <div className="flex items-center space-x-2 truncate">
            <Banknote className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">{feeLabel}</span>
          </div>

        </div>

        {/* Badges row: Skill & Notes snippet */}
        <div className="flex items-center justify-between text-xs gap-2">
          <div className={`px-2 py-0.5 rounded-md border text-[11px] font-medium flex items-center gap-1 ${skillObj.color}`}>
            <Award className="w-3 h-3" />
            <span>{post.skillLevel}</span>
          </div>

          {post.opponentTeamName && (
            <span className="text-[11px] text-blue-400 font-medium truncate">
              ຄູ່ແຂ່ງ: {post.opponentTeamName}
            </span>
          )}
        </div>

        {/* Optional text snippet */}
        {post.details && (
          <p className="mt-2.5 text-xs text-neutral-400 line-clamp-2">
            {post.details}
          </p>
        )}
      </div>

      {/* Action Buttons Footer */}
      <div className="p-3 sm:px-4 sm:py-3 bg-neutral-950/70 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-2">
        
        {/* Left: Communication Buttons */}
        <div className="flex items-center space-x-1.5">
          {/* Chat Button */}
          {!isOwner && (
            <button
              onClick={() => onOpenChatWithUser(post.ownerId, post.ownerName, post.ownerPhotoURL)}
              title="ແຊັດຫາຜູ້ໂພສ"
              className="p-2 rounded-xl text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          )}

          {/* Call Button (only if not hidden and provided) */}
          {!post.hidePhone && post.contactPhone && (
            <a
              href={`tel:${post.contactPhone}`}
              title="ໂທຫາຜູ້ໂພສ"
              className="p-2 rounded-xl text-emerald-400 hover:text-white bg-emerald-950/50 hover:bg-emerald-600 border border-emerald-800/40 transition"
            >
              <Phone className="w-4 h-4" />
            </a>
          )}

          {/* WhatsApp Button */}
          {waPhone && !post.hidePhone && (
            <a
              href={`https://wa.me/${waPhone}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              title="ຕິດຕໍ່ຜ່ານ WhatsApp"
              className="p-2 rounded-xl text-teal-300 hover:text-white bg-teal-950/50 hover:bg-teal-600 border border-teal-800/40 transition font-semibold text-xs flex items-center gap-1"
            >
              <span className="font-sans text-[11px]">WA</span>
            </a>
          )}
        </div>

        {/* Right: Challenge or Details Button */}
        <div className="flex items-center space-x-2 ml-auto">
          <button
            onClick={() => onOpenDetails(post)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition"
          >
            ລາຍລະອຽດ
          </button>

          {post.status === 'open' && !isOwner && (
            <button
              onClick={() => onOpenChallenge(post)}
              disabled={isChallengedByMe}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md transition ${
                isChallengedByMe
                  ? 'bg-neutral-800 text-neutral-400 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 active:scale-95'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>{isChallengedByMe ? 'ສົ່ງຄຳຂໍແລ້ວ' : 'ສະໝັກແຂ່ງຂັນ'}</span>
            </button>
          )}

          {isOwner && (
            <button
              onClick={() => onOpenDetails(post)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition"
            >
              ຈັດການນັດໝາຍ
            </button>
          )}
        </div>

      </div>

    </div>
  );
};
