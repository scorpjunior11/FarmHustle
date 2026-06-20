import { View, Text, StyleSheet } from 'react-native';

export default function TransportScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Transport screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  text: { fontSize: 20, color: '#1B3A2B' },
});
