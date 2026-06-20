import { View, Text, StyleSheet } from 'react-native';

export default function FarmerScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Farmer screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  text: { fontSize: 20, color: '#1B3A2B' },
});
