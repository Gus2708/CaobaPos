import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MainApp from './app/MainApp';
import { FontLoader } from './hooks/useFonts';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      refetchOnWindowFocus: true,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FontLoader>
        <StatusBar style="light" />
        <MainApp />
      </FontLoader>
    </QueryClientProvider>
  );
}