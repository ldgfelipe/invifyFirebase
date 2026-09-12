"use client";

// ============================================================================
// AUTH CONTEXT - Estado global de sesión con Firebase Auth + perfil Firestore.
// ============================================================================
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  updateProfile as fbUpdateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import type { UserProfile } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleRedirect: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Carga o crea el perfil en /users/{uid} (reglas: solo el dueño crea).
        const ref = doc(db, "users", u.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        } else {
          const newProfile: UserProfile = {
            uid: u.uid,
            email: u.email ?? "",
            displayName: u.displayName ?? "",
            role: "cliente",
            createdAt: Date.now(),
          };
          await setDoc(ref, { ...newProfile, createdAt: serverTimestamp() });
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function signInWithEmail(email: string, password: string) {
    return await signInWithEmailAndPassword(auth, email, password);
  }

  async function signUpWithEmail(email: string, password: string, name: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await fbUpdateProfile(cred.user, { displayName: name });
    const ref = doc(db, "users", cred.user.uid);
    await setDoc(ref, {
      uid: cred.user.uid,
      email,
      displayName: name,
      role: "cliente",
      createdAt: serverTimestamp(),
    });
    return cred;
  }

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.addScope("profile");
    provider.addScope("email");
    provider.setCustomParameters({
      prompt: "select_account",
    });
    try {
      const result = await signInWithPopup(auth, provider);
      console.log("Google sign-in successful:", result.user?.email);
    } catch (err: any) {
      console.error("Google sign-in error:", err.code, err.message);
      // Si el popup fue bloqueado, intentar con redirect
      if (err.code === "auth/popup-blocked" || err.code === "auth/popup-closed-by-user") {
        console.log("Popup blocked, trying redirect...");
        await signInWithRedirect(auth, provider);
      } else {
        throw err;
      }
    }
  }

  async function signInWithGoogleRedirect() {
    const provider = new GoogleAuthProvider();
    provider.addScope("profile");
    provider.addScope("email");
    provider.setCustomParameters({
      prompt: "select_account",
    });
    await signInWithRedirect(auth, provider);
  }

  async function signOut() {
    await fbSignOut(auth);
  }

  function updateUserProfile(data: Partial<UserProfile>) {
    if (profile) {
      setProfile({ ...profile, ...data });
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInWithGoogleRedirect,
        signOut,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
