import { View, Text, StyleSheet, Platform, StatusBar } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { FontNames } from '../lib/fontNames';

export function Header() {
  const [time, setTime] = useState(new Date());
  const statusBarHeight = Platform.OS === 'ios' ? 50 : StatusBar.currentHeight ?? 0;

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <View style={[styles.container, { paddingTop: statusBarHeight + 12 }]}>
      <LinearGradient
        colors={['rgba(10, 10, 12, 0.95)', 'rgba(10, 10, 12, 0.85)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.topBorder} />
      <View style={styles.shimmer} />
      
      <View style={styles.content}>
        <View style={styles.logoSection}>
          <View style={styles.logoIcon}>
            <LinearGradient
              colors={['#B87B5A', '#8B5A3C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradient}
            />
            <Text style={styles.logoIconText}>C</Text>
          </View>
          <View style={styles.logoText}>
            <Text style={styles.logoTextMain}>CAOBA</Text>
            <Text style={styles.logoTextSub}>PUNTO DE VENTA</Text>
          </View>
        </View>
        
        <View style={styles.timeSection}>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(time)}</Text>
            <View style={styles.timeIndicator} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: 'rgba(10, 10, 12, 0.95)',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(184, 123, 90, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(184, 123, 90, 0.03)',
    transform: [{ skewX: '-20deg' }],
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.3)',
    shadowColor: '#B87B5A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  logoIconText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 22,
    fontWeight: '800',
    color: '#F0F0F2',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  logoText: {
    gap: 2,
  },
  logoTextMain: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 24,
    fontWeight: '800',
    color: '#F0F0F2',
    letterSpacing: 3,
  },
  logoTextSub: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 10,
    fontWeight: '500',
    color: '#B87B5A',
    letterSpacing: 2,
    marginTop: 2,
  },
  timeSection: {
    alignItems: 'flex-end',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(30, 30, 36, 0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  timeText: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: 20,
    fontWeight: '600',
    color: '#F0F0F2',
    letterSpacing: 1,
  },
  timeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6DB88A',
    shadowColor: '#6DB88A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
});
