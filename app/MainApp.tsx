import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { verticalScale } from '../lib/responsive';
import { headerTranslateY, initScrollHideAnimation, resetScrollState, cleanupScrollListener } from '../store/uiStore';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '../components/Header';
import { POSScreen } from './index';
import { DashboardPanel } from './DashboardPanel';
import { InventoryPanel } from './InventoryPanel';
import { HistoryPanel } from './HistoryPanel';
import ClientsPanel from './ClientsPanel';
import { ToastProvider } from '../components/Toast';
import { tokens } from '../lib/designTokens';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { useAuth } from '../hooks/useAuth';
import { OfflineBanner } from '../components/OfflineBanner';

type Screen = 'pos' | 'dashboard' | 'inventory' | 'history' | 'clients';

export default function MainApp() {
  useRealtimeSync();
  const { role } = useAuth();

  const [currentScreen, setCurrentScreen] = useState<Screen>('pos');

  const handleNavigate = useCallback((screen: Screen) => {
    if (screen === 'dashboard' && role !== 'admin') return;
    if (screen === currentScreen) return;
    setCurrentScreen(screen);
  }, [currentScreen, role]);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'pos':
        return <POSScreen />;
      case 'dashboard':
        return <DashboardPanel />;
      case 'inventory':
        return <InventoryPanel readOnly={false} />;
      case 'history':
        return <HistoryPanel />;
      case 'clients':
        return <ClientsPanel />;
      default:
        return <POSScreen />;
    }
  };

  const insets = useSafeAreaInsets();

  const HEADER_HEIGHT = verticalScale(50) + insets.top;
  const TOTAL_NAV_HEIGHT = HEADER_HEIGHT;
  const CAT_HEIGHT = verticalScale(44);
  const scrollHideHeight = currentScreen === 'pos' ? TOTAL_NAV_HEIGHT + CAT_HEIGHT : TOTAL_NAV_HEIGHT;

  // Initialize the scroll-hide listener once
  useEffect(() => {
    initScrollHideAnimation(scrollHideHeight);
    return () => cleanupScrollListener();
  }, [scrollHideHeight]);

  // Reset scroll state on tab switch
  useEffect(() => {
    resetScrollState();
  }, [currentScreen]);

  return (
    <ToastProvider>
      <View style={styles.container}>
        <LinearGradient
          colors={[tokens.colors.bg, tokens.colors.bg]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.content}>
          <Animated.View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 20,
            transform: [{ translateY: headerTranslateY }],
            backgroundColor: tokens.colors.bg,
          }}>
            <Header
              currentScreen={currentScreen}
              onNavigate={handleNavigate}
            />
            <OfflineBanner />
          </Animated.View>

          <View style={styles.screenWrapper}>
            {renderScreen()}
          </View>
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
  screenWrapper: {
    flex: 1,
  },
});
