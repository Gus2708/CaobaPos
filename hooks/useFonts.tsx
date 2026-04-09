import { useFonts, InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold } from '@expo-google-fonts/instrument-sans';
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_600SemiBold, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

export const fonts = {
  instrumentSans: {
    regular: InstrumentSans_400Regular,
    medium: InstrumentSans_500Medium,
    semiBold: InstrumentSans_600SemiBold,
    bold: InstrumentSans_700Bold,
  },
  jetBrainsMono: {
    regular: JetBrainsMono_400Regular,
    medium: JetBrainsMono_500Medium,
    semiBold: JetBrainsMono_600SemiBold,
    bold: JetBrainsMono_700Bold,
  },
};

export function useAppFonts() {
  const [loaded, error] = useFonts({
    ...fonts.instrumentSans,
    ...fonts.jetBrainsMono,
  });

  return { loaded, error };
}

export function FontLoader({ children }: { children: React.ReactNode }) {
  const { loaded } = useAppFonts();

  if (!loaded) {
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