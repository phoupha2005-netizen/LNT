import React from 'react';
import { Home, CalendarDays, Plus, MessageSquare, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface BottomNavProps {
  activeView: 'home' | 'my-matches' | 'admin';
  onNavigateHome: () => void;
  onNavigateMyMatches: () => void;
  onOpenCreatePost: () => void;
  onOpenChat: () => void;
  onOpenProfile: () => void;
  onOpenAuth: () => void;
  unreadChatCount: number;
  pendingRequestsCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeView,
  onNavigateHome,
  onNavigateMyMatches,
  onOpenCreatePost,
  onOpenChat,
  onOpenProfile,
  onOpenAuth,
  unreadChatCount,
  pendingRequestsCount,
}) => {
  const { currentUser } = useAuth();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-900/95 backdrop-blur-lg border-t border-neutral-800 px-3 py-2 pb-safe">
      <div className="flex items-center justify-around max-w-md mx-auto">
        
        {/* Home */}
        <button
          onClick={onNavigateHome}
          className={`flex flex-col items-center py-1 px-2 transition ${
            activeView === 'home' ? 'text-emerald-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">ໜ້າຫຼັກ</span>
        </button>

        {/* My Matches */}
        <button
          onClick={onNavigateMyMatches}
          className={`flex flex-col items-center py-1 px-2 relative transition ${
            activeView === 'my-matches' ? 'text-emerald-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <CalendarDays className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">ນັດໝາຍ</span>
          {pendingRequestsCount > 0 && (
            <span className="absolute top-0 right-1 w-4 h-4 rounded-full bg-amber-500 text-black text-[9px] font-bold flex items-center justify-center">
              {pendingRequestsCount}
            </span>
          )}
        </button>

        {/* Center Create Post Button */}
        <button
          onClick={onOpenCreatePost}
          className="relative -top-3 w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 hover:scale-105 active:scale-95 transition"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* Chat */}
        <button
          onClick={currentUser ? onOpenChat : () => onOpenAuth()}
          className="flex flex-col items-center py-1 px-2 relative text-neutral-400 hover:text-neutral-200 transition"
        >
          <MessageSquare className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">ແຊັດ</span>
          {unreadChatCount > 0 && (
            <span className="absolute top-0 right-1 w-4 h-4 rounded-full bg-emerald-500 text-neutral-950 text-[9px] font-bold flex items-center justify-center">
              {unreadChatCount}
            </span>
          )}
        </button>

        {/* Profile */}
        <button
          onClick={currentUser ? onOpenProfile : () => onOpenAuth()}
          className="flex flex-col items-center py-1 px-2 text-neutral-400 hover:text-neutral-200 transition"
        >
          <User className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">{currentUser ? 'ໂປຣໄຟລ໌' : 'ເຂົ້າສູ່ລະບົບ'}</span>
        </button>

      </div>
    </nav>
  );
};
