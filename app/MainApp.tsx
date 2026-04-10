import { View, StyleSheet } from 'react-native';
import { useState } from 'react';
import { Header } from '../components/Header';
import { Navbar } from './Navbar';
import { POSScreen } from './index';
import { DashboardPanel } from './DashboardPanel';
import { InventoryPanel } from './InventoryPanel';
import { HistoryPanel } from './HistoryPanel';
import { ToastProvider } from '../components/Toast';
import { tokens } from '../lib/designTokens';

type Screen = 'pos' | 'dashboard' | 'inventory' | 'history';

export default function MainApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('pos');
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  const renderScreen = () => {
    switch (currentScreen) {
      case 'pos':
        return <POSScreen />;
      case 'dashboard':
        return <DashboardPanel />;
      case 'inventory':
        return <InventoryPanel readOnly={mode === 'view'} />;
      case 'history':
        return <HistoryPanel />;
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
          mode={mode}
          onToggleMode={setMode}
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
    backgroundColor: tokens.colors.bg 
  },
  content: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
    overflow: 'hidden',
  },
});
