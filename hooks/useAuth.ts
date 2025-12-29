import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase'; 
import { doc, setDoc, getDoc, getFirestore, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google login failed", error);
      throw error;
    }
  };

  const loginAnonymously = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Anonymous login failed", error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error("Email login failed", error);
      throw error;
    }
  }

  const registerWithEmail = async (email: string, pass: string, username: string) => {
    // Check for reserved usernames
    if (username.toLowerCase() === 'system') {
      throw new Error("This username is reserved and cannot be used");
    }

    const q = query(collection(db, 'users'), where('username', '==', username));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      throw new Error("Username is already taken");
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const { user } = userCredential;

        await setDoc(doc(db, 'users', user.uid), {
          username: username, // Saved here
          email: email,
          bio: '',
          avatar: '', 
          location: '',
          isArtist: false,
          joinedAt: serverTimestamp(),
          stats: {
            followers: 0,
            following: 0,
            uploads: 0,
            votesCast: 0,
            fireRate: 0
          }
        });

    } catch (error: any) {
        console.error("Registration failed", error);
        throw error;
    }
  }

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
      throw error;
    }
  };

  return { 
    user, 
    loading, 
    loginWithGoogle, 
    loginAnonymously,
    loginWithEmail,
    registerWithEmail, 
    logout,
    isAnonymous: user?.isAnonymous 
  };
};