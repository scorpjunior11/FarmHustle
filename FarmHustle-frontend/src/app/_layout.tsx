import { createContext, useState } from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { useNotificationTapRouting } from '../hooks/useNotificationTapRouting';

export type Role = 'FARMER' | 'BUYER' | 'TRANSPORT' | null;

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
}

export const RoleContext = createContext<RoleContextValue>({
  role: null,
  setRole: () => {},
});

// Split out from RootLayout so it can sit inside AuthProvider — the
// notification-tap router needs useAuth() for its role fallback.
function AppContent() {
  useNotificationTapRouting();
  const [role, setRole] = useState<Role>(null);

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      <Stack screenOptions={{ headerShown: false }} />
    </RoleContext.Provider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}