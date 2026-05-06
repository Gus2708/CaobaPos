import { View, StyleSheet, Platform, StatusBar, Image, TouchableOpacity, Modal, Animated as RNAnimated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { useState, useRef, useEffect } from 'react';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { FontNames } from '../lib/fontNames';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale, moderateScale } from '../lib/responsive';
import { Icon } from './Icon';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Screen = 'pos' | 'dashboard' | 'inventory' | 'history' | 'clients';

const TABS: { key: Screen; label: string; icon: string; description: string }[] = [
  { key: 'pos', label: 'Punto de Venta', icon: 'cart', description: 'Realizar ventas y cobros' },
  { key: 'dashboard', label: 'Dashboard', icon: 'chart-bar', description: 'Estadísticas y métricas' },
  { key: 'inventory', label: 'Inventario', icon: 'archive', description: 'Gestión de productos y stock' },
  { key: 'history', label: 'Historial', icon: 'clock', description: 'Registro de ventas pasadas' },
  { key: 'clients', label: 'Clientes', icon: 'users', description: 'Directorio de clientes' },
];

interface HeaderProps {
  currentScreen: Screen;
  onNavigate: (s: Screen) => void;
}

export function Header({ currentScreen, onNavigate }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuAnim = useRef(new RNAnimated.Value(0)).current;

  const toggleMenu = () => {
    const toValue = isMenuOpen ? 0 : 1;
    if (!isMenuOpen) setIsMenuOpen(true);
    
    RNAnimated.spring(menuAnim, {
      toValue,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start(() => {
      if (isMenuOpen) setIsMenuOpen(false);
    });
  };

  const handleNavigate = (screen: Screen) => {
    onNavigate(screen);
    toggleMenu();
  };

  const activeTab = TABS.find(t => t.key === currentScreen);

  return (
    <View style={[
      styles.container, 
      { 
        paddingTop: Platform.OS === 'android' 
          ? Math.max(insets.top, StatusBar.currentHeight || 0)
          : insets.top
      }
    ]}>
      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Image 
            source={require('../assets/caoba-logo.png')} 
            style={styles.brandLogo} 
            resizeMode="contain" 
          />
        </View>

        {/* Action Section */}
        <View style={styles.actionSection}>
          <TouchableOpacity 
            style={styles.toggleContainer} 
            onPress={toggleMenu}
            activeOpacity={0.7}
          >
            <View style={styles.toggleLine} />
            <View style={[styles.toggleLine, { width: scale(16), alignSelf: 'flex-end' }]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Navigation Menu Overlay */}
      <Modal
        visible={isMenuOpen}
        transparent
        animationType="none"
        onRequestClose={toggleMenu}
      >
        <View style={styles.modalContainer}>
          <BlurView
            tint="dark"
            intensity={80}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(10, 10, 12, 0.82)', 'rgba(10, 10, 12, 0.92)']}
            style={StyleSheet.absoluteFill}
          />
          
          <View style={[styles.menuHeader, { paddingTop: insets.top + verticalScale(20) }]}>
            <View style={styles.menuHeaderTop}>
              <Text style={styles.menuTitle}>Menú</Text>
              <TouchableOpacity onPress={toggleMenu} style={styles.closeBtn}>
                <Icon name="close" size={28} color={tokens.colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.menuContent}>
            {TABS.map((tab, index) => {
              const isActive = currentScreen === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.menuItem, isActive && styles.menuItemActive]}
                  onPress={() => handleNavigate(tab.key)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.iconBox, isActive && styles.iconBoxActive]}>
                    <Icon 
                      name={tab.icon} 
                      size={24} 
                      color={isActive ? tokens.colors.amberGold : tokens.colors.textMuted} 
                    />
                  </View>
                  <View style={styles.itemTextContainer}>
                    <Text style={[styles.itemLabel, isActive && styles.itemLabelActive]}>
                      {tab.label}
                    </Text>
                    <Text style={styles.itemDescription} numberOfLines={1}>
                      {tab.description}
                    </Text>
                  </View>
                  {isActive && (
                    <View style={styles.activeDot} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.menuFooter}>
            <Text style={styles.footerText}>CaobaPOS v2026</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingHorizontal: scale(20),
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: verticalScale(50), // Smaller header
  },
  logoSection: {
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  brandLogo: {
    width: scale(140), // Adjusted size for compact header
    height: verticalScale(48),
    marginLeft: -scale(12),
  },
  actionSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleContainer: {
    width: scale(36),
    height: scale(36),
    justifyContent: 'center',
    alignItems: 'center',
    gap: verticalScale(6),
  },
  toggleLine: {
    width: scale(22),
    height: 2,
    backgroundColor: tokens.colors.text,
    borderRadius: 1,
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 12, 0.6)',
  },
  menuHeader: {
    paddingHorizontal: scale(24),
    marginBottom: verticalScale(30),
  },
  menuHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuTitle: {
    fontFamily: FontNames.instrumentSans,
    fontSize: tokens.typography['3xl'],
    fontWeight: tokens.typography.extrabold,
    color: tokens.colors.text,
    letterSpacing: -0.5,
  },
  closeBtn: {
    width: scale(44),
    height: scale(44),
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    paddingHorizontal: scale(16),
    gap: verticalScale(12),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(16),
    borderRadius: tokens.radius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  menuItemActive: {
    backgroundColor: 'rgba(202, 138, 4, 0.08)',
    borderColor: 'rgba(202, 138, 4, 0.2)',
  },
  iconBox: {
    width: scale(48),
    height: scale(48),
    borderRadius: tokens.radius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(16),
  },
  iconBoxActive: {
    backgroundColor: 'rgba(202, 138, 4, 0.15)',
  },
  itemTextContainer: {
    flex: 1,
  },
  itemLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: tokens.typography.xl,
    fontWeight: tokens.typography.bold,
    color: tokens.colors.textSecondary,
    marginBottom: verticalScale(2),
  },
  itemLabelActive: {
    color: tokens.colors.text,
  },
  itemDescription: {
    fontFamily: FontNames.instrumentSans,
    fontSize: tokens.typography.sm,
    color: tokens.colors.textMuted,
  },
  activeDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: tokens.colors.amberGold,
  },
  menuFooter: {
    position: 'absolute',
    bottom: verticalScale(40),
    width: '100%',
    alignItems: 'center',
  },
  footerText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: tokens.typography.xs,
    color: tokens.colors.textDim,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});

