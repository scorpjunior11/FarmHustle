import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.flexContainer}
      >
        {/* Back Arrow */}
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#111" />
        </TouchableOpacity>

        <View style={styles.container}>
          {/* Logo Section */}
          <View style={styles.logoRow}>
            <Text style={styles.logoText}>FarmHustle</Text>
            <Text style={styles.leafIcon}>🌱</Text>
          </View>

          {/* Heading Text */}
          <Text style={styles.welcomeHeading}>Create account</Text>
          <Text style={styles.welcomeSubtitle}>Sign up to get started with FarmHustle</Text>

          {/* Input Form Box */}
          <View style={styles.formBox}>
            {/* Name Field */}
            <View style={styles.inputGroup}>
              <Ionicons name="person-outline" size={22} color="#666" style={styles.inputIcon} />
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Enter your full name"
                  placeholderTextColor="#999"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.divider} />

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Ionicons name="mail-outline" size={22} color="#666" style={styles.inputIcon} />
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Enter your email address"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.divider} />

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Ionicons name="lock-closed-outline" size={22} color="#666" style={styles.inputIcon} />
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Create a password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={secureText}
                  autoCapitalize="none"
                />
              </View>
              <TouchableOpacity onPress={() => setSecureText(!secureText)} style={styles.eyeIcon}>
                <Ionicons name={secureText ? "eye-outline" : "eye-off-outline"} size={22} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity style={styles.signupButton}>
            <Text style={styles.signupButtonText}>Sign Up</Text>
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginLink}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity>
              <Text style={styles.loginLinkText}>Log In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  flexContainer: { flex: 1 },
  backButton: { paddingHorizontal: 20, paddingTop: 15, alignSelf: 'flex-start' },
  container: { flex: 1, paddingHorizontal: 24, alignItems: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  logoText: { fontSize: 26, fontWeight: 'bold', color: '#2E7D32' },
  leafIcon: { fontSize: 24, marginLeft: 2 },
  welcomeHeading: { fontSize: 22, fontWeight: 'bold', color: '#111', marginTop: 25 },
  welcomeSubtitle: { fontSize: 14, color: '#666', marginTop: 6, marginBottom: 35 },
  formBox: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eaeaea',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  inputGroup: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  inputIcon: { marginRight: 14, marginTop: 12 },
  inputWrapper: { flex: 1 },
  inputLabel: { fontSize: 11, fontWeight: '600', color: '#222', marginBottom: 2 },
  inputField: { fontSize: 14, color: '#111', paddingVertical: 2, width: '100%' },
  divider: { height: 1, backgroundColor: '#f0f0f0', width: '100%' },
  eyeIcon: { padding: 4, marginTop: 12 },
  signupButton: {
    backgroundColor: '#2E7D32',
    width: '100%',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  signupButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  loginLink: { flexDirection: 'row', marginTop: 20, alignItems: 'center' },
  loginText: { fontSize: 14, color: '#666' },
  loginLinkText: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },
});
