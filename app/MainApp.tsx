import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Header } from '../components/Header';
import { Navbar } from './Navbar';
import { POSScreen } from './index';
import { DashboardPanel } from './DashboardPanel';
import { InventoryPanel } from './InventoryPanel';
import { HistoryPanel } from './HistoryPanel';
import ClientsPanel from './ClientsPanel';
import { ToastProvider } from '../components/Toast';
import { tokens } from '../lib/designTokens';

type Screen = 'pos' | 'dashboard' | 'inventory' | 'history' | 'clients';

export default function MainApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('pos');

  const renderScreen = () => {
    switch (currentScreen) {
      case 'pos':
        return <POSScreen />;
      case 'dashboard':
        return <DashboardPanel />;
      case 'inventory':
        return <InventoryPanel 
          readOnly={false} 
        />;
      case 'history':
        return <HistoryPanel />;
      case 'clients':
        return <ClientsPanel />;
      default:
        return <POSScreen />;
    }
  };

  return (
    <ToastProvider>
      <View style={styles.container}>
        <Header />
        <Navbar
          current={currentScreen}
          onNavigate={setCurrentScreen}
        />
        <View style={styles.content}>
          {renderScreen()}
        </View>
      </View>
    </ToastProvider>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: tokens.colors.bg,
  },
  content: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
    overflow: 'hidden',
  },
});
