import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AuthUser } from "../api/client";

const STORAGE_KEY = "farmhustle_user";

interface AuthContextValue {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  initializing: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  setUser: () => {},
  initializing: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setUserState(JSON.parse(raw) as AuthUser);
      })
      .catch(() => {
        // corrupt or unreadable stored session — fall back to logged-out state
      })
      .finally(() => setInitializing(false));
  }, []);

  const setUser = (nextUser: AuthUser | null) => {
    setUserState(nextUser);
    if (nextUser) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser)).catch(() => {
        // best-effort persistence — in-memory state is already updated
      });
    } else {
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {
        // best-effort — in-memory state is already cleared
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, initializing }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
