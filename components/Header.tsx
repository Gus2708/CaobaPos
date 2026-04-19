import { View, StyleSheet, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { FontNames } from '../lib/fontNames';
import { tokens } from '../lib/designTokens';
import appJson from '../app.json';

import { scale, verticalScale, moderateScale } from '../lib/responsive';
export function Header() {
  const insets = useSafeAreaInsets();
  const [time, setTime] = useState(new Date());

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
    <View style={[
      styles.container, 
      { 
        paddingTop: Platform.OS === 'android' 
          ? Math.max(insets.top, StatusBar.currentHeight || 0) + verticalScale(12)
          : insets.top + verticalScale(8) 
      }
    ]}>



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
            <View style={styles.titleInfo}>
              <Text style={styles.logoTextMain}>CAOBA</Text>
              <Text style={styles.versionText}>v{appJson.expo.version}</Text>
            </View>
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
    width: scale(42),
    height: scale(42),
    borderRadius: tokens.radius.icon,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
  },
  logoIconText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(22),
    fontWeight: tokens.typography.extrabold,
    color: tokens.colors.text,
  },
  logoText: {
    gap: verticalScale(1),
  },
  logoTextMain: {
    fontFamily: FontNames.instrumentSans,
    fontSize: tokens.typography['3xl'],
    fontWeight: tokens.typography.extrabold,
    color: tokens.colors.text,
    letterSpacing: scale(1.5),
  },
  logoTextSub: {
    fontFamily: FontNames.instrumentSans,
    fontSize: tokens.typography.xs,
    fontWeight: tokens.typography.medium,
    color: tokens.colors.mahogany,
    letterSpacing: scale(1.5),
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
    letterSpacing: scale(0.5),
  },
  liveIndicator: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: tokens.colors.sage,
  },
  titleInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: scale(6),
  },
  versionText: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(9),
    color: 'rgba(255, 255, 255, 0.2)',
    fontWeight: '600',
  },
});
