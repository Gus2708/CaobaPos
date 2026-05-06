import { View, StyleSheet } from 'react-native';
import { Text } from './components/Text';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MainApp from './app/MainApp';
import { FontLoader } from './hooks/useFonts';
import { isSupabaseConfigured } from './lib/supabase';
import { scale, verticalScale, moderateScale } from './lib/responsive';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30s default — Realtime pushes instant invalidations
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

export default function App() {
  if (!isSupabaseConfigured) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Error de Configuración</Text>
        <Text style={styles.errorMessage}>
          Faltan las variables de entorno de Supabase.{'\n\n'}
          La aplicación se cerraba automáticamente porque intentaba iniciar sin credenciales válidas.{'\n\n'}
          Solución:{'\n'}
          Si usas "eas build", asegúrate de tener configurado tus secretos en tu cuenta de Expo (Expo Dashboard » Secrets) o tener un archivo eas.json que cargue las variables de entorno para producción.
        </Text>
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <FontLoader>
          <StatusBar style="light" />
          <MainApp />
        </FontLoader>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#0A0A0C',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(24),
  },
  errorTitle: {
    fontSize: moderateScale(22),
    fontWeight: 'bold',
    color: '#C96B6B',
    marginBottom: verticalScale(16),
  },
  errorMessage: {
    fontSize: moderateScale(16),
    color: '#F0F0F2',
    textAlign: 'center',
    lineHeight: verticalScale(24),
  },
});