import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp,
  query,
  collection,
  where,
  getDocs
} from 'firebase/firestore';
import { UserProfile } from '@/src/types';
import { auth, db, googleProvider } from './firebase';
import toast from 'react-hot-toast';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAILS = [
  'buqa@bu.ac.th',
  'atcharawadee.j@bu.ac.th',
  'pacharin.s@bu.ac.th'
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = currentUser ? ADMIN_EMAILS.includes(currentUser.email || '') : false;

  const refreshProfile = async () => {
    if (currentUser) {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setUserProfile(userSnap.data() as UserProfile);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Strict Domain Check
        if (!user.email?.endsWith('@bu.ac.th')) {
          toast.error('BU Members Only: Please use your @bu.ac.th account');
          await signOut(auth);
          setCurrentUser(null);
          setUserProfile(null);
          setLoading(false);
          return;
        }

        setCurrentUser(user);
        
        // Sync profile to Firestore
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          // Check staff_master database for existing records
          const staffQuery = query(collection(db, 'staff_master'), where('email', '==', user.email));
          const staffSnap = await getDocs(staffQuery);
          
          let staffData: any = {};
          if (!staffSnap.empty) {
            staffData = staffSnap.docs[0].data();
          }

          const newProfile: any = {
            uid: user.uid,
            email: user.email,
            displayName: staffData.displayName || user.displayName,
            photoURL: user.photoURL,
            role: ADMIN_EMAILS.includes(user.email || '') ? 'admin' : 'staff',
            department: staffData.department || 'Pending Assignment',
            position: staffData.position || 'Staff',
            staffId: staffData.staffId || 'STF-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
            createdAt: serverTimestamp(),
          };
          await setDoc(userRef, newProfile);
          setUserProfile(newProfile);
        } else {
          setUserProfile(userSnap.data() as UserProfile);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Logged in successfully');
    } catch (error: any) {
      console.error(error);
      toast.error('Login failed: ' + error.message);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
    } catch (error: any) {
      toast.error('Logout failed');
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, isAdmin, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
