import { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { RoleContext } from './_layout';
import type { Role } from './_layout';

export default function HomeScreen() {
  const { setRole } = useContext(RoleContext);
  const router = useRouter();

  const handleSelect = (role: NonNullable<Role>) => {
    setRole(role);
    if (role === 'FARMER') router.push('/(farmer)');
    else if (role === 'BUYER') router.push('/(buyer)');
    else router.push('/(transport)');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FarmHustle</Text>
      <TouchableOpacity style={styles.button} onPress={() => handleSelect('FARMER')}>
        <Text style={styles.buttonText}>Continue as Farmer</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => handleSelect('BUYER')}>
        <Text style={styles.buttonText}>Continue as Buyer</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => handleSelect('TRANSPORT')}>
        <Text style={styles.buttonText}>Continue as Transport</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', gap: 16, padding: 24 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1B3A2B', marginBottom: 16 },
  button: { width: '100%', backgroundColor: '#2F7A4D', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});