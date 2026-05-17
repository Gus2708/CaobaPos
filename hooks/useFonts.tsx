import { useFonts } from 'expo-font';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';

export const fonts = {
  instrumentSans: {
    regular: 'InstrumentSans_400Regular',
    medium: 'InstrumentSans_500Medium',
    semiBold: 'InstrumentSans_600SemiBold',
    bold: 'InstrumentSans_700Bold',
  },
  jetBrainsMono: {
    regular: 'JetBrainsMono_400Regular',
    medium: 'JetBrainsMono_500Medium',
    semiBold: 'JetBrainsMono_600SemiBold',
    bold: 'JetBrainsMono_700Bold',
  },
};

export function useAppFonts() {
  const [loaded, error] = useFonts({
    InstrumentSans_400Regular: require('../assets/fonts/InstrumentSans_400Regular.ttf'),
    InstrumentSans_500Medium: require('../assets/fonts/InstrumentSans_500Medium.ttf'),
    InstrumentSans_600SemiBold: require('../assets/fonts/InstrumentSans_600SemiBold.ttf'),
    InstrumentSans_700Bold: require('../assets/fonts/InstrumentSans_700Bold.ttf'),
    JetBrainsMono_400Regular: require('../assets/fonts/JetBrainsMono_400Regular.ttf'),
    JetBrainsMono_500Medium: require('../assets/fonts/JetBrainsMono_500Medium.ttf'),
    JetBrainsMono_600SemiBold: require('../assets/fonts/JetBrainsMono_600SemiBold.ttf'),
    JetBrainsMono_700Bold: require('../assets/fonts/JetBrainsMono_700Bold.ttf'),
  });

  return { loaded, error };
}

export function FontLoader({ children }: { children: React.ReactNode }) {
  const { loaded, error } = useAppFonts();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    // If fonts are not loaded within 2.5 seconds, trigger a fallback to system fonts to prevent infinite loading.
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  // Show loading spinner only while not loaded, no error, and we haven't timed out.
  if (!loaded && !error && !timedOut) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#B87B5A" />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0C',
  },
});