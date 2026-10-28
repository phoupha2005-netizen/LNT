import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signInWithPopup, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile } from '../types';
import { DEFAULT_PROVINCE } from '../constants/laoData';

const BOOTSTRAP_ADMIN_EMAIL = "phoupha2005@gmail.com";

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string, teamName?: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  isSuspended: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (!user) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      // Sync user profile from Firestore
      const userDocRef = doc(db, 'users', user.uid);
      try {
        const userDoc = await getDoc(userDocRef);
        const isBootstrapAdmin = user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

        if (!userDoc.exists()) {
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || user.email?.split('@')[0] || 'ນັກເຕະບານ',
            photoURL: user.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.uid}`,
            teamName: 'ທີມບານ LNT',
            province: DEFAULT_PROVINCE,
            district: 'ເມືອງນ້ຳທາ',
            phone: '',
            whatsapp: '',
            hidePhone: false,
            isAdmin: isBootstrapAdmin,
            isSuspended: false,
            createdAt: new Date().toISOString()
          };
          await setDoc(userDocRef, newProfile);
          setUserProfile(newProfile);

          if (isBootstrapAdmin) {
            try {
              await setDoc(doc(db, 'admins', user.uid), {
                uid: user.uid,
                email: user.email,
                grantedAt: new Date().toISOString()
              });
            } catch (e) {
              console.warn('Admin record set error:', e);
            }
          }
        } else {
          const profileData = userDoc.data() as UserProfile;
          if (isBootstrapAdmin && !profileData.isAdmin) {
            profileData.isAdmin = true;
            await updateDoc(userDocRef, { isAdmin: true });
          }
          setUserProfile(profileData);
        }
      } catch (err) {
        console.error('Error fetching/setting user profile:', err);
      }

      // Realtime listener for user profile changes (e.g. if suspended by admin)
      const unsubProfile = onSnapshot(userDocRef, (snapshot) => {
        if (snapshot.exists()) {
          setUserProfile(snapshot.data() as UserProfile);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      });

      setLoading(false);

      return () => {
        unsubProfile();
      };
    });

    return () => unsubscribeAuth();
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), pass);
  };

  const signUpWithEmail = async (email: string, pass: string, name: string, teamName?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const user = cred.user;
    const isBootstrapAdmin = email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

    const initialProfile: UserProfile = {
      uid: user.uid,
      email: user.email || email,
      displayName: name.trim() || 'ນັກເຕະບານ',
      photoURL: `https://api.dicebear.com/7.x/identicon/svg?seed=${user.uid}`,
      teamName: teamName?.trim() || 'ທີມບານ LNT',
      province: DEFAULT_PROVINCE,
      district: 'ເມືອງນ້ຳທາ',
      phone: '',
      whatsapp: '',
      hidePhone: false,
      isAdmin: isBootstrapAdmin,
      isSuspended: false,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'users', user.uid), initialProfile);
      setUserProfile(initialProfile);

      if (isBootstrapAdmin) {
        await setDoc(doc(db, 'admins', user.uid), {
          uid: user.uid,
          email: user.email,
          grantedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const signInGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const logout = async () => {
    await firebaseSignOut(auth);
    setUserProfile(null);
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!currentUser) return;
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const updated = {
        ...data,
        updatedAt: new Date().toISOString()
      };
      await updateDoc(userRef, updated);
      setUserProfile(prev => prev ? { ...prev, ...updated } : null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const isAdmin = Boolean(
    userProfile?.isAdmin || 
    (currentUser?.email && currentUser.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase())
  );

  const isSuspended = Boolean(userProfile?.isSuspended);

  return (
    <AuthContext.Provider value={{
      currentUser,
      userProfile,
      loading,
      isAdmin,
      signInWithEmail,
      signUpWithEmail,
      signInGoogle,
      resetPassword,
      logout,
      updateProfileData,
      isSuspended
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
