import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AuthUser } from "../api/client";
import { setAuthToken } from "../api/client";

const STORAGE_KEY = "farmhustle_user";
const TOKEN_STORAGE_KEY = "farmhustle_token";

interface AuthContextValue {
  user: AuthUser | null;
  setUser: (user: AuthUser | null, token?: string | null) => void;
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
    Promise.all([AsyncStorage.getItem(STORAGE_KEY), AsyncStorage.getItem(TOKEN_STORAGE_KEY)])
      .then(([rawUser, token]) => {
        if (rawUser) setUserState(JSON.parse(rawUser) as AuthUser);
        if (token) setAuthToken(token);
      })
      .catch(() => {
        // corrupt or unreadable stored session — fall back to logged-out state
      })
      .finally(() => setInitializing(false));
  }, []);

  const setUser = (nextUser: AuthUser | null, token?: string | null) => {
    setUserState(nextUser);
    if (nextUser) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser)).catch(() => {
        // best-effort persistence — in-memory state is already updated
      });
      if (token) {
        setAuthToken(token);
        AsyncStorage.setItem(TOKEN_STORAGE_KEY, token).catch(() => {
          // best-effort persistence — in-memory token is already set
        });
      }
    } else {
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {
        // best-effort — in-memory state is already cleared
      });
      setAuthToken(null);
      AsyncStorage.removeItem(TOKEN_STORAGE_KEY).catch(() => {
        // best-effort — in-memory token is already cleared
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
