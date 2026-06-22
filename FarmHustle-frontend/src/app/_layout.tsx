import { createContext, useState } from 'react';
import { Stack } from 'expo-router';

export type Role = 'FARMER' | 'BUYER' | 'TRANSPORT' | null;

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
}

export const RoleContext = createContext<RoleContextValue>({
  role: null,
  setRole: () => {},
});

export default function RootLayout() {
  const [role, setRole] = useState<Role>(null);

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      <Stack screenOptions={{ headerShown: false }} />
    </RoleContext.Provider>
  );
}