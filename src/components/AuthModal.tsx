import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  Shield, 
  ArrowRight, 
  KeyRound, 
  AlertCircle, 
  CheckCircle2, 
  Trophy 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
}) => {
  const { signInWithEmail, signUpWithEmail, signInGoogle, resetPassword } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
        onClose();
      } else if (mode === 'register') {
        if (!name.trim()) {
          setErrorMsg('ກະລຸນາປ້ອນຊື່ຂອງທ່ານ');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setErrorMsg('ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 6 ຕົວອັກສອນ');
          setLoading(false);
          return;
        }
        await signUpWithEmail(email, password, name, teamName);
        onClose();
      } else if (mode === 'forgot') {
        await resetPassword(email);
        setSuccessMsg('ລະບົບໄດ້ສົ່ງລິ້ງກູ້ຄືນລະຫັດຜ່ານໄປທີ່ Email ຂອງທ່ານແລ້ວ! ກະລຸນາກວດສອບກ່ອງຈົດໝາຍ');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = 'ເກີດຂໍ້ຜິດພາດ ກະລຸນາກວດສອບຂໍ້ມູນອີກຄັ້ງ';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = 'ອີເມລ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'ອີເມລນີ້ຖືກລົງທະບຽນໃນລະບົບແລ້ວ';
      } else if (err.code === 'auth/weak-password') {
        msg = 'ລະຫັດຜ່ານງ່າຍເກີນໄປ (ຕ້ອງມີຢ່າງໜ້ອຍ 6 ຕົວອັກສອນ)';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'ຮູບແບບອີເມລບໍ່ຖືກຕ້ອງ';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      await signInGoogle();
      onClose();
    } catch (err: any) {
      console.error('Google sign in error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMsg('ເກີດຂໍ້ຜິດພາດໃນການເຂົ້າສູ່ລະບົບດ້ວຍ Google');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                {mode === 'login' && 'ເຂົ້າສູ່ລະບົບ'}
                {mode === 'register' && 'ສະໝັກບັນຊີໃໝ່'}
                {mode === 'forgot' && 'ກູ້ຄືນລະຫັດຜ່ານ'}
              </h3>
              <p className="text-xs text-neutral-400">
                LNT Football Connect
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

        {/* Tab switch for login / register */}
        {mode !== 'forgot' && (
          <div className="grid grid-cols-2 p-1.5 m-4 mb-0 bg-neutral-950 rounded-2xl border border-neutral-800">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(''); }}
              className={`py-2 text-xs font-bold rounded-xl transition ${
                mode === 'login'
                  ? 'bg-neutral-800 text-emerald-400 shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              ເຂົ້າສູ່ລະບົບ (Login)
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setErrorMsg(''); }}
              className={`py-2 text-xs font-bold rounded-xl transition ${
                mode === 'register'
                  ? 'bg-neutral-800 text-emerald-400 shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              ສະໝັກບັນຊີ (Register)
            </button>
          </div>
        )}

        {/* Body form */}
        <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-4">
          
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Registration Extra Fields: Name & Team Name */}
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ຊື່ຂອງທ່ານ / ຊື່ຫຼິ້ນ *</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ເຊັ່ນ: ບິກ ນ້ຳທາ"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ຊື່ທີມບານຂອງທ່ານ (ຖ້າມີ)</span>
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="ເຊັ່ນ: ນ້ຳທາ ຢູນາຍເຕັດ"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                />
              </div>
            </>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-emerald-400" />
              <span>ອີເມລ (Email) *</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
            />
          </div>

          {/* Password (if login or register) */}
          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ລະຫັດຜ່ານ *</span>
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setErrorMsg(''); setSuccessMsg(''); }}
                    className="text-[11px] text-emerald-400 hover:underline"
                  >
                    ລືມລະຫັດຜ່ານ?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-lg shadow-emerald-500/25 transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span>ກຳລັງດຳເນີນການ...</span>
            ) : mode === 'login' ? (
              <>
                <span>ເຂົ້າສູ່ລະບົບ</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            ) : mode === 'register' ? (
              <>
                <span>ສ້າງບັນຊີໃໝ່</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>ສົ່ງລິ້ງກູ້ຄືນລະຫັດຜ່ານ</span>
                <KeyRound className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          {/* Back to login if in forgot mode */}
          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
              className="w-full text-center text-xs text-neutral-400 hover:text-white pt-1"
            >
              ← ກັບໄປໜ້າເຂົ້າສູ່ລະບົບ
            </button>
          )}

          {/* Divider */}
          {mode !== 'forgot' && (
            <>
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-800"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-neutral-900 px-2 text-neutral-500 font-semibold">ຫຼື</span>
                </div>
              </div>

              {/* Google Sign In */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-neutral-950 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 transition flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                  <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.8s.7 5.1 1.9 7.5l3.7-2.9z" />
                  <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z" />
                </svg>
                <span>ເຂົ້າສູ່ລະບົບດ້ວຍ Google</span>
              </button>
            </>
          )}

        </form>

      </div>
    </div>
  );
};
