import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';

// ── FPS Monitor overlay (dev-only) ──
// Lightweight component that measures frames per second using
// requestAnimationFrame. Only renders in __DEV__ mode.
// Color coding: green ≥55, yellow ≥30, red <30

interface FPSMonitorProps {
  style?: any;
}

let frameCount = 0;
let lastFpsUpdate = 0;

export default function FPSMonitor({ style }: FPSMonitorProps) {
  const [fps, setFps] = useState(60);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!__DEV__) return;

    const loop = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastFpsUpdate >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastFpsUpdate)));
        frameCount = 0;
        lastFpsUpdate = now;
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    lastFpsUpdate = performance.now();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  if (!__DEV__) return null;

  const bgColor =
    fps >= 55 ? 'rgba(52, 199, 89, 0.85)' :
    fps >= 30 ? 'rgba(255, 204, 0, 0.85)' :
    'rgba(255, 69, 58, 0.85)';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }, style]}>
      <Text style={styles.text}>{fps} FPS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 4 : 50,
    right: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    zIndex: 99999,
  },
  text: {
    color: '#fff',
    fontSize: 11,
    fontFamily: Platform.OS === 'web'
      ? "'JetBrains Mono', monospace"
      : 'JetBrainsMono_400Regular',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
