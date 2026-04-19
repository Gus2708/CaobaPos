import { View, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions, Modal, TouchableWithoutFeedback, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../components/Text';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { FontNames } from '../lib/fontNames';
import { Icon } from '../components/Icon';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale, moderateScale } from '../lib/responsive';

type Screen = 'pos' | 'dashboard' | 'inventory' | 'history' | 'clients';

const TABS: { key: Screen; label: string; icon: string }[] = [
  { key: 'pos', label: 'POS', icon: 'cart' },
  { key: 'dashboard', label: 'Dashboard', icon: 'chart-bar' },
  { key: 'inventory', label: 'Inventario', icon: 'archive' },
  { key: 'history', label: 'Historial', icon: 'clock' },
  { key: 'clients', label: 'Clientes', icon: 'users' },
];

interface NavbarProps {
  current: Screen;
  onNavigate: (s: Screen) => void;
}

export function Navbar({ current, onNavigate }: NavbarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const activeTab = TABS.find((t) => t.key === current);

  // Dynamic style for safe area
  const containerStyle = [
    styles.container,
    { paddingTop: Math.max(insets.top, verticalScale(4)) }
  ];

  return (
    <View style={containerStyle}>

      <View style={styles.content}>
        {isMobile ? (
          <View style={styles.tabsContainer}>
             <TouchableOpacity 
               style={styles.mobileDropdownBtn} 
               onPress={() => setDropdownOpen(true)}
               activeOpacity={0.7}
             >
                <View style={[styles.tabIcon, styles.tabIconActive]}>
                  <Icon name={activeTab?.icon || 'bars'} size={22} color={tokens.colors.mahogany} />
                </View>
                <Text style={[styles.tabText, styles.tabTextActive, { flex: 1 }]}>
                  {activeTab?.label}
                </Text>
                 <View style={{ marginRight: scale(4) }}>
                  <Icon name="chevron-down" size={20} color={tokens.colors.textMuted} />
                </View>
             </TouchableOpacity>

             <Modal visible={dropdownOpen} transparent animationType="fade" onRequestClose={() => setDropdownOpen(false)}>
               <TouchableWithoutFeedback onPress={() => setDropdownOpen(false)}>
                 <View style={styles.dropdownOverlay}>
                   <TouchableWithoutFeedback>
                     <View style={styles.dropdownMenu}>
                        <LinearGradient
                         colors={[tokens.colors.glass.heavy, 'rgba(10, 10, 12, 0.98)']}
                         start={{ x: 0, y: 0 }}
                         end={{ x: 1, y: 1 }}
                         style={StyleSheet.absoluteFill}
                       />
                       <View style={styles.dropdownHeader}>
                         <Text style={styles.dropdownTitle}>Navegación</Text>
                          <TouchableOpacity onPress={() => setDropdownOpen(false)} activeOpacity={0.7}>
                            <Icon name="close" size={24} color={tokens.colors.textMuted} />
                          </TouchableOpacity>
                       </View>
                       {TABS.map((tab) => {
                         const isActive = current === tab.key;
                         return (
                           <TouchableOpacity
                             key={tab.key}
                             style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
                             onPress={() => {
                               onNavigate(tab.key);
                               setDropdownOpen(false);
                             }}
                             activeOpacity={0.7}
                           >
                             <View style={[styles.dropdownIcon, isActive && styles.dropdownIconActive]}>
                               <Icon name={tab.icon} size={22} color={isActive ? '#B87B5A' : '#8A8A96'} />
                             </View>
                             <Text style={[styles.dropdownItemText, isActive && styles.dropdownItemTextActive]}>
                               {tab.label}
                             </Text>
                             {isActive && <Icon name="check" size={20} color="#B87B5A" />}
                           </TouchableOpacity>
                         );
                       })}
                     </View>
                   </TouchableWithoutFeedback>
                 </View>
               </TouchableWithoutFeedback>
             </Modal>
          </View>
        ) : (
          <View style={styles.tabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsWrapper}>
                {TABS.map((tab) => {
                  const isActive = current === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      onPress={() => onNavigate(tab.key)}
                      style={[styles.tab, isActive && styles.tabActive]}
                      activeOpacity={0.7}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: isActive }}
                    >
                      {isActive && (
                        <LinearGradient
                          colors={[tokens.colors.mahoganyDim, 'transparent']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={StyleSheet.absoluteFill}
                        />
                      )}
                      <View style={styles.tabContent}>
                        <View style={[styles.tabIcon, isActive && styles.tabIconActive]}>
                          <Icon 
                            name={tab.icon} 
                            size={20} 
                            color={isActive ? tokens.colors.mahogany : tokens.colors.textMuted} 
                          />
                        </View>
                        <Text style={[styles.tabText, isActive && styles.tabTextActive]} numberOfLines={1}>
                          {tab.label}
                        </Text>
                      </View>
                      {isActive && <View style={styles.activeIndicator} />}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        )}
        
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: tokens.colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.borderLight,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    gap: scale(16),
  },
  tabsContainer: {
    flex: 1,
  },
  tabsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  tab: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    borderRadius: tokens.radius.pill,
    overflow: 'hidden',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  tabActive: {
    borderColor: tokens.colors.mahogany,
  },
  tabGradient: {
    borderRadius: tokens.radius.pill,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  tabIcon: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabIconActive: {
    backgroundColor: tokens.colors.mahoganyDim,
  },
  tabText: { 
    color: tokens.colors.textMuted, 
    fontFamily: FontNames.instrumentSans, 
    fontWeight: '700',
    fontSize: moderateScale(14),
  },
  tabTextActive: {
    color: tokens.colors.text,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    width: 0,
    height: 0,
  },
  modeContainer: { 
    borderLeftWidth: 1,
    borderLeftColor: tokens.colors.borderLight,
    paddingLeft: scale(16),
  },
  modeContainerMobile: {
    borderLeftWidth: 0,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.borderLight,
    paddingLeft: 0,
    paddingTop: verticalScale(12),
    width: '100%',
  },
  modeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  modeLabel: { 
    color: tokens.colors.textMuted, 
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(13),
    fontWeight: '700',
  },
  modeButtons: {
    flexDirection: 'row',
    gap: scale(8),
  },
  modeBtn: { 
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    overflow: 'hidden',
    minWidth: scale(80),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnActive: { 
    borderColor: tokens.colors.mahogany,
  },
  modeBtnText: { 
    color: tokens.colors.textMuted, 
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(13),
    fontWeight: '700',
  },
  modeBtnTextActive: { 
    color: tokens.colors.text,
  },
  mobileDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.mahoganyDim,
    borderWidth: 1,
    borderColor: tokens.colors.mahogany,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 12, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(24),
  },
  dropdownMenu: {
    width: '100%',
    maxWidth: scale(340),
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
    overflow: 'hidden',
    paddingBottom: verticalScale(12),
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(20),
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.borderLight,
    marginBottom: verticalScale(8),
  },
  dropdownTitle: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: tokens.colors.text,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(14),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    borderRadius: tokens.radius.lg,
    marginHorizontal: scale(12),
    marginBottom: verticalScale(6),
  },
  dropdownItemActive: {
    backgroundColor: tokens.colors.mahoganyDim,
  },
  dropdownIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownIconActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dropdownItemText: {
    flex: 1,
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: tokens.colors.textMuted,
  },
  dropdownItemTextActive: {
    color: tokens.colors.text,
  },
});
