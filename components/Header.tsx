import { View, Text, StyleSheet, Platform, StatusBar } from 'react-native';
import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { FontNames } from '../lib/fontNames';
import { tokens } from '../lib/designTokens';

export function Header() {
  const [time, setTime] = useState(new Date());
  const statusBarHeight = Platform.OS === 'ios' ? 50 : StatusBar.currentHeight ?? 0;

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  const formatDate = (date: Date) =>
    date.toLocaleDateString('es-MX', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

  return (
    <View style={[styles.container, { paddingTop: statusBarHeight + 10 }]}>



      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoIcon}>
            <LinearGradient
              colors={[tokens.colors.mahogany, tokens.colors.mahoganyDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Text style={styles.logoIconText}>C</Text>
          </View>
          <View style={styles.logoText}>
            <Text style={styles.logoTextMain}>CAOBA</Text>
            <Text style={styles.logoTextSub}>{formatDate(time)}</Text>
          </View>
        </View>

        {/* Time — no container box */}
        <View style={styles.timeSection}>
          <Text style={styles.timeText}>{formatTime(time)}</Text>
          <View style={styles.liveIndicator} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: tokens.colors.bg,
    paddingHorizontal: tokens.spacing.xl,
    paddingBottom: tokens.spacing.sm,
  },
  accentLine: {},
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
  },
  logoIcon: {
    width: 42,
    height: 42,
    borderRadius: tokens.radius.icon,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
  },
  logoIconText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 22,
    fontWeight: tokens.typography.extrabold,
    color: tokens.colors.text,
  },
  logoText: {
    gap: 1,
  },
  logoTextMain: {
    fontFamily: FontNames.instrumentSans,
    fontSize: tokens.typography['3xl'],
    fontWeight: tokens.typography.extrabold,
    color: tokens.colors.text,
    letterSpacing: 3,
  },
  logoTextSub: {
    fontFamily: FontNames.instrumentSans,
    fontSize: tokens.typography.xs,
    fontWeight: tokens.typography.medium,
    color: tokens.colors.mahogany,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  timeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  timeText: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: tokens.typography.xl,
    fontWeight: tokens.typography.semibold,
    color: tokens.colors.text,
    letterSpacing: 0.5,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.colors.sage,
  },
});
