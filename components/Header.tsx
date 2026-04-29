import { View, StyleSheet, Platform, StatusBar, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { useEffect, useState } from 'react';
import { FontNames } from '../lib/fontNames';
import { tokens } from '../lib/designTokens';
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


  return (
    <View style={[
      styles.container, 
      { 
        paddingTop: Platform.OS === 'android' 
          ? Math.max(insets.top, StatusBar.currentHeight || 0)
          : insets.top
      }
    ]}>



      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <Image 
            source={require('../assets/caoba-logo.png')} 
            style={styles.brandLogo} 
            resizeMode="contain" 
          />
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
    paddingLeft: 0,
    paddingRight: tokens.spacing.md,
    paddingBottom: 0,
  },
  accentLine: {},
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoSection: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogo: {
    width: scale(180),
    height: verticalScale(60),
    marginLeft: -scale(16),
  },
  timeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(24),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  timeText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: tokens.typography.md,
    fontWeight: tokens.typography.semibold,
    color: tokens.colors.text,
  },
  liveIndicator: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: tokens.colors.sage,
  },
});
