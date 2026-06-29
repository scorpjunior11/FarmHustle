import { createContext, useContext, useState, ReactNode } from 'react';
import { Stack } from 'expo-router';

export type Role = 'FARMER' | 'BUYER' | 'TRANSPORT' | null;

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
}

const RoleContext = createContext<RoleContextType>({
  role: null,
  setRole: () => {},
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(null);

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}

export default function RootLayout() {
  return (
    <RoleProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/signup" />
        <Stack.Screen name="(buyer)" />
        <Stack.Screen name="(farmer)" />
        <Stack.Screen name="(transport)" />
      </Stack>
    </RoleProvider>
  );
}
