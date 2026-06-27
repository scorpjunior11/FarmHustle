import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Constants ────────────────────────────────────────────────
const PRIMARY = '#2F7A4D';
const PRIMARY_LIGHT = '#E8F5EE';
const DARK = '#1B3A2B';
const MUTED = '#6B7280';
const BORDER = '#D1D5DB';
const WHITE = '#FFFFFF';
const ERROR = '#DC2626';
const BG = '#F9FAFB';

const GHANA_REGIONS = [
  'Ahafo', 'Ashanti', 'Bono', 'Bono East', 'Central',
  'Eastern', 'Greater Accra', 'North East', 'Northern',
  'Oti', 'Savannah', 'Upper East', 'Upper West',
  'Volta', 'Western', 'Western North',
];

type Role = 'FARMER' | 'BUYER' | 'TRANSPORT';

const ROLES: { key: Role; label: string; emoji: string; desc: string }[] = [
  { key: 'FARMER', label: 'Farmer', emoji: '🌾', desc: 'List and sell your produce' },
  { key: 'BUYER', label: 'Buyer', emoji: '🛒', desc: 'Browse and buy fresh produce' },
  { key: 'TRANSPORT', label: 'Transport Provider', emoji: '🚛', desc: 'Accept delivery jobs' },
];

// ─── Helpers ──────────────────────────────────────────────────
const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const validatePhone = (v: string) => /^[0-9+\s]{7,15}$/.test(v.trim());

export default function SignupScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [region, setRegion] = useState('');
  const [showRegionDrop, setShowRegionDrop] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Full name is required.';
    if (!email.trim()) e.email = 'Email is required.';
    else if (!validateEmail(email)) e.email = 'Enter a valid email address.';
    if (!phone.trim()) e.phone = 'Phone number is required.';
    else if (!validatePhone(phone)) e.phone = 'Enter a valid phone number.';
    if (!password) e.password = 'Password is required.';
    else if (password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (!region) e.region = 'Please select your region.';
    if (!selectedRole) e.role = 'Please select a role to continue.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const clearError = (field: string) =>
    setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });

  const handleSignup = () => {
    if (!validate()) return;
    setLoading(true);
    // TODO: replace with real API call
    // e.g. await api.post('/auth/register', { fullName, email, phone, password, region, role: selectedRole })
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Account created!', `Welcome to FarmHustle, ${fullName.split(' ')[0]}!`, [
        {
          text: 'Continue',
          onPress: () => {
            if (selectedRole === 'FARMER') router.replace('/(farmer)');
            else if (selectedRole === 'BUYER') router.replace('/(buyer)');
            else router.replace('/(transport)');
          },
        },
      ]);
    }, 1200);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Logo ── */}
        <View style={s.logoSection}>
          <View style={s.logoIconWrap}>
            <Text style={s.logoIcon}>🌿</Text>
          </View>
          <Text style={s.logoText}>FarmHustle</Text>
          <Text style={s.logoSub}>Create your account to get started</Text>
        </View>

        {/* ── Form ── */}
        <View style={s.card}>

          {/* Full Name */}
          <Text style={s.label}>Full Name</Text>
          <TextInput
            style={[s.input, errors.fullName && s.inputErr]}
            placeholder="e.g. Kwame Asante"
            placeholderTextColor={MUTED}
            value={fullName}
            onChangeText={(v) => { setFullName(v); clearError('fullName'); }}
            autoCapitalize="words"
            accessibilityLabel="Full name"
          />
          {errors.fullName ? <Text style={s.errText}>{errors.fullName}</Text> : null}

          {/* Email */}
          <Text style={s.label}>Email Address</Text>
          <TextInput
            style={[s.input, errors.email && s.inputErr]}
            placeholder="you@example.com"
            placeholderTextColor={MUTED}
            value={email}
            onChangeText={(v) => { setEmail(v); clearError('email'); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            accessibilityLabel="Email address"
          />
          {errors.email ? <Text style={s.errText}>{errors.email}</Text> : null}

          {/* Phone */}
          <Text style={s.label}>Phone Number</Text>
          <TextInput
            style={[s.input, errors.phone && s.inputErr]}
            placeholder="+233 24 000 0000"
            placeholderTextColor={MUTED}
            value={phone}
            onChangeText={(v) => { setPhone(v); clearError('phone'); }}
            keyboardType="phone-pad"
            accessibilityLabel="Phone number"
          />
          {errors.phone ? <Text style={s.errText}>{errors.phone}</Text> : null}

          {/* Password */}
          <Text style={s.label}>Password</Text>
          <View style={[s.inputRow, errors.password && s.inputErr]}>
            <TextInput
              style={s.inputFlex}
              placeholder="Min. 8 characters"
              placeholderTextColor={MUTED}
              value={password}
              onChangeText={(v) => { setPassword(v); clearError('password'); }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              accessibilityLabel="Password"
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              style={s.eyeBtn}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Text style={s.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
          {errors.password ? <Text style={s.errText}>{errors.password}</Text> : null}

          {/* Region Dropdown */}
          <Text style={s.label}>Region</Text>
          <TouchableOpacity
            style={[s.dropdown, errors.region && s.inputErr]}
            onPress={() => setShowRegionDrop((v) => !v)}
            accessibilityLabel="Select region"
            accessibilityRole="button"
          >
            <Text style={region ? s.dropValue : s.dropPlaceholder}>
              {region || 'Select your region'}
            </Text>
            <Text style={s.dropArrow}>{showRegionDrop ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {errors.region ? <Text style={s.errText}>{errors.region}</Text> : null}

          {showRegionDrop && (
            <View style={s.dropList}>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                {GHANA_REGIONS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[s.dropItem, region === r && s.dropItemActive]}
                    onPress={() => {
                      setRegion(r);
                      setShowRegionDrop(false);
                      clearError('region');
                    }}
                    accessibilityLabel={`Select ${r} region`}
                  >
                    <Text style={[s.dropItemText, region === r && s.dropItemTextActive]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* ── Role Selection (last on page as instructed) ── */}
        <View style={s.roleSection}>
          <Text style={s.roleHeading}>I am a...</Text>
          {errors.role ? <Text style={[s.errText, { marginBottom: 8 }]}>{errors.role}</Text> : null}

          {ROLES.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[s.roleCard, selectedRole === r.key && s.roleCardActive]}
              onPress={() => { setSelectedRole(r.key); clearError('role'); }}
              accessibilityLabel={`Select role ${r.label}`}
              accessibilityRole="button"
            >
              <Text style={s.roleEmoji}>{r.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.roleLabel, selectedRole === r.key && s.roleLabelActive]}>
                  {r.label}
                </Text>
                <Text style={s.roleDesc}>{r.desc}</Text>
              </View>
              <View style={[s.radioOuter, selectedRole === r.key && s.radioOuterActive]}>
                {selectedRole === r.key && <View style={s.radioInner} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[s.submitBtn, loading && s.submitDisabled]}
          onPress={handleSignup}
          disabled={loading}
          accessibilityLabel="Create account"
          accessibilityRole="button"
        >
          {loading
            ? <ActivityIndicator color={WHITE} />
            : <Text style={s.submitText}>Create Account</Text>
          }
        </TouchableOpacity>

        {/* ── Login link ── */}
        <View style={s.footer}>
          <Text style={s.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')} accessibilityRole="link">
            <Text style={s.footerLink}>Log in</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 },

  // Logo
  logoSection: { alignItems: 'center', marginTop: 32, marginBottom: 24 },
  logoIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: PRIMARY, alignItems: 'center',
    justifyContent: 'center', marginBottom: 12,
  },
  logoIcon: { fontSize: 30 },
  logoText: { fontSize: 28, fontWeight: '800', color: DARK },
  logoSub: { fontSize: 14, color: MUTED, marginTop: 4 },

  // Card
  card: {
    backgroundColor: WHITE, borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    marginBottom: 16,
  },
  label: { fontSize: 13, fontWeight: '600', color: DARK, marginTop: 14, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: DARK, backgroundColor: WHITE,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 10, backgroundColor: WHITE, paddingHorizontal: 14,
  },
  inputFlex: { flex: 1, paddingVertical: 11, fontSize: 14, color: DARK },
  inputErr: { borderColor: ERROR },
  eyeBtn: { paddingLeft: 8, paddingVertical: 4 },
  eyeIcon: { fontSize: 18 },
  errText: { fontSize: 12, color: ERROR, marginTop: 4 },

  // Dropdown
  dropdown: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    backgroundColor: WHITE, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
  },
  dropValue: { fontSize: 14, color: DARK },
  dropPlaceholder: { fontSize: 14, color: MUTED },
  dropArrow: { fontSize: 12, color: MUTED },
  dropList: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    backgroundColor: WHITE, marginTop: 4, overflow: 'hidden',
  },
  dropItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropItemActive: { backgroundColor: PRIMARY_LIGHT },
  dropItemText: { fontSize: 14, color: DARK },
  dropItemTextActive: { color: PRIMARY, fontWeight: '600' },

  // Role section
  roleSection: { marginBottom: 16 },
  roleHeading: { fontSize: 16, fontWeight: '700', color: DARK, marginBottom: 12 },
  roleCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: WHITE, borderRadius: 12,
    borderWidth: 1.5, borderColor: BORDER,
    padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  roleCardActive: { borderColor: PRIMARY, backgroundColor: PRIMARY_LIGHT },
  roleEmoji: { fontSize: 26, marginRight: 12 },
  roleLabel: { fontSize: 15, fontWeight: '700', color: DARK },
  roleLabelActive: { color: PRIMARY },
  roleDesc: { fontSize: 12, color: MUTED, marginTop: 2 },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  radioOuterActive: { borderColor: PRIMARY },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: PRIMARY },

  // Submit
  submitBtn: {
    backgroundColor: PRIMARY, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginBottom: 20,
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: WHITE, fontSize: 16, fontWeight: '700' },

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'center', paddingBottom: 8 },
  footerText: { fontSize: 14, color: MUTED },
  footerLink: { fontSize: 14, color: PRIMARY, fontWeight: '700' },
});
