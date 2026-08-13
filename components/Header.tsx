import { View, StyleSheet, Platform, StatusBar, Image, TouchableOpacity, Modal, Animated as RNAnimated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { useState, useRef, useEffect } from 'react';
import { AppBlurView } from './AppBlurView';
import { LinearGradient } from 'expo-linear-gradient';
import { FontNames } from '../lib/fontNames';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale, moderateScale } from '../lib/responsive';
import { Icon } from './Icon';
import { usePressAnimation } from '../hooks/usePressAnimation';
import { useAuth } from '../hooks/useAuth';
import { ISOTIPO_BASE64, LOGO_BASE64 } from '../lib/brandAssets';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Screen = 'pos' | 'dashboard' | 'inventory' | 'history' | 'clients';

const TABS: { key: Screen; label: string; icon: string; description: string }[] = [
  { key: 'pos', label: 'Punto de Venta', icon: 'cart', description: 'Realizar ventas y cobros' },
  { key: 'dashboard', label: 'Dashboard', icon: 'chart-bar', description: 'Estadísticas y métricas' },
  { key: 'inventory', label: 'Inventario', icon: 'archive', description: 'Gestión de productos y stock' },
  { key: 'history', label: 'Historial', icon: 'clock', description: 'Registro de ventas pasadas' },
  { key: 'clients', label: 'Clientes', icon: 'users', description: 'Directorio de clientes' },
];

interface MenuItemRowProps {
  tab: { key: Screen; label: string; icon: string; description: string };
  index: number;
  isActive: boolean;
  menuAnim: RNAnimated.Value;
  onPress: () => void;
}

function MenuItemRow({ tab, index, isActive, menuAnim, onPress }: MenuItemRowProps) {
  const { scale: pressScale, onPressIn, onPressOut } = usePressAnimation({ scaleTo: 0.97 });

  const itemAnim = menuAnim.interpolate({
    inputRange: [0, Math.min(0.4 + index * 0.12, 0.95), 1],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });
  const itemTranslate = itemAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [verticalScale(20), 0],
  });

  return (
    <RNAnimated.View
      style={{
        opacity: itemAnim,
        transform: [{ translateY: itemTranslate }, { scale: pressScale }],
      }}
    >
      <TouchableOpacity
        style={[styles.menuItem, isActive && styles.menuItemActive]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.9}
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
        {isActive && <View style={styles.activeDot} />}
      </TouchableOpacity>
    </RNAnimated.View>
  );
}

interface HeaderProps {
  currentScreen: Screen;
  onNavigate: (s: Screen) => void;
}

export function Header({ currentScreen, onNavigate }: HeaderProps) {
  const { role, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuAnim = useRef(new RNAnimated.Value(0)).current;

  const toggleAnim = useRef(new RNAnimated.Value(0)).current;

  const toggleMenu = () => {
    const toValue = isMenuOpen ? 0 : 1;
    if (!isMenuOpen) setIsMenuOpen(true);

    RNAnimated.parallel([
      RNAnimated.spring(menuAnim, {
        toValue,
        useNativeDriver: true,
        tension: 60,
        friction: 10,
      }),
      RNAnimated.spring(toggleAnim, {
        toValue,
        useNativeDriver: true,
        tension: 120,
        friction: 11,
      }),
    ]).start(() => {
      if (isMenuOpen) setIsMenuOpen(false);
    });
  };

  // Hamburger → X morph
  const topLineRotate = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });
  const topLineTranslate = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-verticalScale(4), verticalScale(1)],
  });
  const bottomLineRotate = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-45deg'],
  });
  const bottomLineTranslate = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [verticalScale(4), -verticalScale(1)],
  });
  const bottomLineScaleX = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [scale(16) / scale(22), 1],
  });

  const visibleTabs = TABS.filter(tab => role === 'admin' || tab.key !== 'dashboard');

  const handleNavigate = (screen: Screen) => {
    onNavigate(screen);
    toggleMenu();
  };

  const handleSignOut = () => {
    toggleMenu();
    signOut();
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
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <RNAnimated.View
              style={[
                styles.toggleLine,
                styles.toggleLineAbsolute,
                {
                  transform: [
                    { translateY: topLineTranslate },
                    { rotate: topLineRotate },
                  ],
                },
              ]}
            />
            <RNAnimated.View
              style={[
                styles.toggleLine,
                styles.toggleLineAbsolute,
                {
                  alignSelf: 'flex-end',
                  transform: [
                    { scaleX: bottomLineScaleX },
                    { translateY: bottomLineTranslate },
                    { rotate: bottomLineRotate },
                  ],
                },
              ]}
            />
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
        <RNAnimated.View style={[styles.modalContainer, { opacity: menuAnim }]}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.colors.bg }]} />
          
          <View style={[styles.menuHeader, { paddingTop: insets.top + verticalScale(20) }]}>
            <View style={styles.menuHeaderTop}>
              <Text style={styles.menuTitle}>Menú</Text>
              <TouchableOpacity onPress={toggleMenu} style={styles.closeBtn}>
                <Icon name="close" size={28} color={tokens.colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.menuContent}>
            {visibleTabs.map((tab, index) => (
              <MenuItemRow
                key={tab.key}
                tab={tab}
                index={index}
                isActive={currentScreen === tab.key}
                menuAnim={menuAnim}
                onPress={() => handleNavigate(tab.key)}
              />
            ))}
          </View>

          <View style={styles.menuFooter}>
            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
              <Icon name="sign-out-alt" size={18} color={tokens.colors.textMuted} />
              <Text style={styles.signOutText}>Cerrar sesión</Text>
            </TouchableOpacity>
            <Text style={styles.footerText}>CaobaPOS v2026</Text>
          </View>
        </RNAnimated.View>
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
  toggleLineAbsolute: {
    position: 'absolute',
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
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
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
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
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  menuItemActive: {
    backgroundColor: tokens.colors.mahoganyDim,
    borderColor: tokens.colors.mahogany,
  },
  iconBox: {
    width: scale(48),
    height: scale(48),
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(16),
  },
  iconBoxActive: {
    backgroundColor: tokens.colors.mahoganyDim,
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
    gap: verticalScale(16),
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(10),
    borderRadius: tokens.radius.btn,
    borderWidth: 1,
    borderColor: tokens.colors.borderMedium,
    backgroundColor: tokens.colors.surface,
  },
  signOutText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: tokens.typography.base,
    color: tokens.colors.textMuted,
    fontWeight: '600',
  },
  footerText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: tokens.typography.xs,
    color: tokens.colors.textDim,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});

