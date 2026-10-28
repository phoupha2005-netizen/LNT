import React from 'react';
import { 
  Trophy, 
  PlusCircle, 
  MessageSquare, 
  Bell, 
  User as UserIcon, 
  ShieldAlert, 
  LogOut, 
  MapPin, 
  CalendarDays,
  Menu,
  X,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LAO_PROVINCES } from '../constants/laoData';

interface NavbarProps {
  currentProvince: string;
  onSelectProvince: (prov: string) => void;
  onOpenCreatePost: () => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onOpenProfile: () => void;
  onOpenChat: () => void;
  onOpenNotifications: () => void;
  onOpenAdmin: () => void;
  onOpenInstallPush: () => void;
  onNavigateHome: () => void;
  onNavigateMyMatches: () => void;
  activeView: 'home' | 'my-matches' | 'admin';
  unreadChatCount: number;
  unreadNotifCount: number;
  pendingRequestsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentProvince,
  onSelectProvince,
  onOpenCreatePost,
  onOpenAuth,
  onOpenProfile,
  onOpenChat,
  onOpenNotifications,
  onOpenAdmin,
  onOpenInstallPush,
  onNavigateHome,
  onNavigateMyMatches,
  activeView,
  unreadChatCount,
  unreadNotifCount,
  pendingRequestsCount,
}) => {
  const { currentUser, userProfile, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={onNavigateHome}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
              <Trophy className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1">
                  LNT <span className="text-emerald-400">Football</span>
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Connect
                </span>
              </div>
              <p className="text-xs text-neutral-400 hidden sm:block">
                ແພລດຟອມນັດເຕະບານ ປະເທດລາວ
              </p>
            </div>
          </div>

          {/* Province Selector */}
          <div className="hidden md:flex items-center space-x-2 bg-neutral-950/60 px-3 py-1.5 rounded-full border border-neutral-800">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            <select
              value={currentProvince}
              onChange={(e) => onSelectProvince(e.target.value)}
              className="bg-transparent text-xs sm:text-sm text-neutral-200 focus:outline-none cursor-pointer pr-2 font-medium"
            >
              {LAO_PROVINCES.map((p) => (
                <option key={p.name} value={p.name} className="bg-neutral-900 text-neutral-100">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center space-x-1">
            <button
              onClick={onNavigateHome}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === 'home'
                  ? 'bg-neutral-800 text-emerald-400'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-800/50'
              }`}
            >
              ໜ້າຫຼັກ (Feed)
            </button>
            <button
              onClick={onNavigateMyMatches}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
                activeView === 'my-matches'
                  ? 'bg-neutral-800 text-emerald-400'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-800/50'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>ນັດໝາຍຂອງຂ້ອຍ</span>
              {pendingRequestsCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-black text-[11px] font-bold flex items-center justify-center">
                  {pendingRequestsCount}
                </span>
              )}
            </button>

            {isAdmin && (
              <button
                onClick={onOpenAdmin}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  activeView === 'admin'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                    : 'text-neutral-400 hover:text-red-400 hover:bg-neutral-800/50'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>Admin</span>
              </button>
            )}
          </div>

          {/* Actions & User Profile */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Phone Push / PWA Quick button */}
            <button
              onClick={onOpenInstallPush}
              title="Push Notification ໜ້າຈໍໂທລະສັບ"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 hover:text-white transition cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline font-medium">ແຈ້ງເຕືອນໜ້າຈໍ</span>
            </button>

            {/* Create Post Button */}
            <button
              onClick={onOpenCreatePost}
              className="hidden sm:flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-emerald-600/25 transition transform active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>ສ້າງໂພສໃໝ່</span>
            </button>

            {currentUser ? (
              <div className="flex items-center space-x-1 sm:space-x-2">
                {/* Chat button */}
                <button
                  onClick={onOpenChat}
                  title="ແຊັດຂໍ້ຄວາມ"
                  className="relative p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800 transition"
                >
                  <MessageSquare className="w-5 h-5" />
                  {unreadChatCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 text-neutral-950 text-[10px] font-bold flex items-center justify-center animate-pulse">
                      {unreadChatCount > 9 ? '9+' : unreadChatCount}
                    </span>
                  )}
                </button>

                {/* Notifications button */}
                <button
                  onClick={onOpenNotifications}
                  title="ແຈ້ງເຕືອນ"
                  className="relative p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800 transition"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 text-neutral-950 text-[10px] font-bold flex items-center justify-center">
                      {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                    </span>
                  )}
                </button>

                {/* Profile Avatar & menu */}
                <div className="relative group">
                  <button
                    onClick={onOpenProfile}
                    className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-neutral-800 transition border border-transparent hover:border-neutral-700"
                  >
                    <img
                      src={userProfile?.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${currentUser.uid}`}
                      alt={userProfile?.displayName || 'User'}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-500/50"
                    />
                    <span className="hidden md:block text-xs font-medium text-neutral-200 max-w-[100px] truncate text-left">
                      {userProfile?.displayName || 'ໂປຣໄຟລ໌'}
                    </span>
                  </button>
                </div>

                {/* Logout button */}
                <button
                  onClick={() => logout()}
                  title="ອອກຈາກລະບົບ"
                  className="hidden md:flex p-2 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-3.5 py-1.5 text-xs sm:text-sm font-medium text-neutral-200 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition"
                >
                  ເຂົ້າສູ່ລະບົບ
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="hidden sm:inline-flex px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition shadow-sm"
                >
                  ສະໝັກບັນຊີ
                </button>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-neutral-300 hover:text-white rounded-lg hover:bg-neutral-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-neutral-800 space-y-3">
            {/* Province selector mobile */}
            <div className="flex items-center space-x-2 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <select
                value={currentProvince}
                onChange={(e) => {
                  onSelectProvince(e.target.value);
                  setMobileMenuOpen(false);
                }}
                className="bg-transparent text-sm text-neutral-200 w-full focus:outline-none"
              >
                {LAO_PROVINCES.map((p) => (
                  <option key={p.name} value={p.name} className="bg-neutral-900 text-neutral-100">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onNavigateHome();
                  setMobileMenuOpen(false);
                }}
                className={`p-2.5 rounded-xl text-sm font-medium text-center ${
                  activeView === 'home' ? 'bg-neutral-800 text-emerald-400' : 'bg-neutral-900 text-neutral-300'
                }`}
              >
                ໜ້າຫຼັກ (Feed)
              </button>
              <button
                onClick={() => {
                  onNavigateMyMatches();
                  setMobileMenuOpen(false);
                }}
                className={`p-2.5 rounded-xl text-sm font-medium text-center relative flex items-center justify-center gap-1.5 ${
                  activeView === 'my-matches' ? 'bg-neutral-800 text-emerald-400' : 'bg-neutral-900 text-neutral-300'
                }`}
              >
                <span>ນັດໝາຍຂອງຂ້ອຍ</span>
                {pendingRequestsCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
            </div>

            {isAdmin && (
              <button
                onClick={() => {
                  onOpenAdmin();
                  setMobileMenuOpen(false);
                }}
                className="w-full p-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-red-950/40 text-red-400 border border-red-900/40"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Admin Dashboard</span>
              </button>
            )}

            {currentUser && (
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full p-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-neutral-900 text-neutral-400 hover:text-red-400"
              >
                <LogOut className="w-4 h-4" />
                <span>ອອກຈາກລະບົບ ({userProfile?.displayName})</span>
              </button>
            )}
          </div>
        )}

      </div>
    </header>
  );
};
