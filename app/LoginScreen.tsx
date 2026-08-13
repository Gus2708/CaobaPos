import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useState, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../components/Text';
import { Icon } from '../components/Icon';
import { useAuth } from '../hooks/useAuth';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale, moderateScale } from '../lib/responsive';
import { FontNames } from '../lib/fontNames';
import { LOGO_BASE64, ESPIRAL_BASE64, FLOR1_BASE64, FLOR2_BASE64 } from '../lib/brandAssets';

export function LoginScreen() {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Completa todos los campos');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await signIn(email.trim(), password);
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      setError(
        msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')
          ? 'Correo o contraseña incorrectos'
          : msg || 'Error al iniciar sesión'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[tokens.colors.bg, '#1C110C', tokens.colors.bg]}
        style={StyleSheet.absoluteFill}
      />

      {/* Brand Espiral Background Watermark (Top Right) */}
      <Image
        source={{ uri: ESPIRAL_BASE64 }}
        style={styles.bgEspiralTop}
        resizeMode="contain"
      />

      {/* Brand Espiral Background Watermark (Bottom Left) */}
      <Image
        source={{ uri: ESPIRAL_BASE64 }}
        style={styles.bgEspiralBottom}
        resizeMode="contain"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: insets.top + verticalScale(56),
              paddingBottom: insets.bottom + verticalScale(40),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/caoba-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.taglineRow}>
              <Image source={{ uri: FLOR1_BASE64 }} style={styles.florAccent} resizeMode="contain" />
              <Text style={styles.tagline}>Sistema Punto de Venta</Text>
              <Image source={{ uri: FLOR2_BASE64 }} style={styles.florAccent} resizeMode="contain" />
            </View>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <View style={styles.cardInner}>
              <Text style={styles.cardTitle}>Iniciar sesión</Text>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Correo electrónico</Text>
                <View style={styles.inputWrapper}>
                  <Icon name="envelope" size={16} color={tokens.colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={(v) => { setEmail(v); setError(''); }}
                    placeholder="correo@ejemplo.com"
                    placeholderTextColor={tokens.colors.textDim}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    editable={!isLoading}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contraseña</Text>
                <View style={styles.inputWrapper}>
                  <Icon name="lock" size={16} color={tokens.colors.textMuted} />
                  <TextInput
                    ref={passwordRef}
                    style={[styles.input, { flex: 1 }]}
                    value={password}
                    onChangeText={(v) => { setPassword(v); setError(''); }}
                    placeholder="••••••••"
                    placeholderTextColor={tokens.colors.textDim}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password"
                    returnKeyType="done"
                    onSubmitEditing={handleSignIn}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon
                      name={showPassword ? 'eye-slash' : 'eye'}
                      size={16}
                      color={tokens.colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Error */}
              {!!error && (
                <View style={styles.errorBox}>
                  <Icon name="exclamation-circle" size={14} color={tokens.colors.coral} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Button */}
              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleSignIn}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['rgba(184, 123, 90, 0.95)', 'rgba(139, 90, 60, 0.95)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                {isLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>Entrar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.version}>CaobaPOS v2026</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: scale(24),
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: verticalScale(48),
  },
  logo: {
    width: scale(200),
    height: verticalScale(72),
    marginBottom: verticalScale(8),
  },
  tagline: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(13),
    color: tokens.colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  card: {
    width: '100%',
    maxWidth: scale(400),
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.borderMedium,
    backgroundColor: tokens.colors.surface,
    overflow: 'hidden',
  },
  cardInner: {
    padding: scale(24),
    gap: verticalScale(20),
  },
  cardTitle: {
    fontFamily: FontNames.instrumentSansBold,
    fontSize: moderateScale(22),
    color: tokens.colors.text,
    fontWeight: '800',
    marginBottom: verticalScale(4),
  },
  inputGroup: {
    gap: verticalScale(8),
  },
  inputLabel: {
    fontFamily: FontNames.instrumentSansSemiBold,
    fontSize: moderateScale(12),
    color: tokens.colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.surfaceElevated,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.borderMedium,
    paddingHorizontal: scale(14),
    height: verticalScale(52),
    gap: scale(10),
  },
  input: {
    flex: 1,
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(15),
    color: tokens.colors.text,
    height: '100%',
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    backgroundColor: tokens.colors.coralDim,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.coral,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
  },
  errorText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(13),
    color: tokens.colors.coral,
    fontWeight: '600',
    flex: 1,
  },
  button: {
    height: verticalScale(52),
    borderRadius: tokens.radius.btn,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.mahogany,
    marginTop: verticalScale(4),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontFamily: FontNames.instrumentSansBold,
    fontSize: moderateScale(16),
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  version: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(11),
    color: tokens.colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: verticalScale(32),
  },
  bgEspiralTop: {
    position: 'absolute',
    top: -scale(60),
    right: -scale(60),
    width: scale(320),
    height: scale(320),
    opacity: 0.08,
    transform: [{ rotate: '15deg' }],
  },
  bgEspiralBottom: {
    position: 'absolute',
    bottom: -scale(80),
    left: -scale(80),
    width: scale(360),
    height: scale(360),
    opacity: 0.06,
    transform: [{ rotate: '-45deg' }],
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    marginTop: verticalScale(6),
  },
  florAccent: {
    width: scale(18),
    height: scale(18),
    opacity: 0.7,
  },
});
