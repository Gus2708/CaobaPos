import React from 'react';
import { Platform, View, ViewStyle, StyleProp } from 'react-native';
import { BlurView, BlurTint } from 'expo-blur';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.appOwnership === 'expo';

const isAndroidExpoGo = Platform.OS === 'android' && isExpoGo;

interface AppBlurViewProps {
  tint?: BlurTint;
  intensity?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * Drop-in replacement for expo-blur's BlurView that gracefully degrades.
 *
 * - iOS (Expo Go + builds): native UIVisualEffectView blur via expo-blur
 * - Android dev/prod builds: real blur via @dimezis/react-native-blur-view
 *   (passed through expo-blur's experimentalBlurMethod)
 * - Android in Expo Go: solid dark fallback (dimezis native module unavailable)
 */
export function AppBlurView({
  tint = 'dark',
  intensity = 50,
  style,
  children,
}: AppBlurViewProps) {
  if (isAndroidExpoGo) {
    const opacity = Math.min(0.92, 0.45 + intensity / 200);
    const fallbackColor =
      tint === 'light' || tint === 'extraLight'
        ? `rgba(245, 245, 248, ${opacity})`
        : `rgba(10, 10, 12, ${opacity})`;
    return <View style={[style, { backgroundColor: fallbackColor }]}>{children}</View>;
  }

  return (
    <BlurView
      tint={tint}
      intensity={intensity}
      experimentalBlurMethod={
        Platform.OS === 'android' ? 'dimezisBlurView' : undefined
      }
      style={style}
    >
      {children}
    </BlurView>
  );
}
