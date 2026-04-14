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
  mode: 'view' | 'edit';
  onToggleMode: (m: 'view' | 'edit') => void;
}

export function Navbar({ current, onNavigate, mode, onToggleMode }: NavbarProps) {
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
                  <Icon name={activeTab?.icon || 'bars'} size={16} color={tokens.colors.mahogany} />
                </View>
                <Text style={[styles.tabText, styles.tabTextActive, { flex: 1 }]}>
                  {activeTab?.label}
                </Text>
                 <View style={{ marginRight: scale(4) }}>
                  <Icon name="chevron-down" size={14} color={tokens.colors.textMuted} />
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
                            <Icon name="close" size={18} color={tokens.colors.textMuted} />
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
                               <Icon name={tab.icon} size={16} color={isActive ? '#B87B5A' : '#8A8A96'} />
                             </View>
                             <Text style={[styles.dropdownItemText, isActive && styles.dropdownItemTextActive]}>
                               {tab.label}
                             </Text>
                             {isActive && <Icon name="check" size={14} color="#B87B5A" />}
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
                        colors={['rgba(184, 123, 90, 0.3)', 'rgba(184, 123, 90, 0.1)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.tabGradient}
                      />
                    )}
                    <View style={styles.tabContent}>
                      <View style={[styles.tabIcon, isActive && styles.tabIconActive]}>
                        <Icon 
                          name={tab.icon} 
                          size={16} 
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
        
        {current === 'inventory' && (
          <View style={[styles.modeContainer, isMobile && styles.modeContainerMobile]}>
            <View style={styles.modeInner}>
              <Text style={styles.modeLabel}>Modo:</Text>
              <View style={[styles.modeButtons, isMobile && { flex: 1 }]}>
                <TouchableOpacity
                  style={[styles.modeBtn, mode === 'view' && styles.modeBtnActive, isMobile && { flex: 1 }]}
                  onPress={() => onToggleMode('view')}
                  activeOpacity={0.7}
                >
                  {mode === 'view' && (
                    <LinearGradient
                      colors={['rgba(184, 123, 90, 0.3)', 'rgba(184, 123, 90, 0.15)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                  <Text style={[styles.modeBtnText, mode === 'view' && styles.modeBtnTextActive]}>
                    Ver
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeBtn, mode === 'edit' && styles.modeBtnActive, isMobile && { flex: 1 }]}
                  onPress={() => onToggleMode('edit')}
                  activeOpacity={0.7}
                >
                  {mode === 'edit' && (
                    <LinearGradient
                      colors={['rgba(184, 123, 90, 0.3)', 'rgba(184, 123, 90, 0.15)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                  <Text style={[styles.modeBtnText, mode === 'edit' && styles.modeBtnTextActive]}>
                    Editar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: tokens.colors.bg,
  },
  topEdge: {},
  content: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    gap: scale(12),
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: scale(8),
  },
  tabsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  tab: {
    position: 'relative',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: scale(12),
    overflow: 'hidden',
    minHeight: verticalScale(36),
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(184, 123, 90, 0.12)',
  },
  tabGradient: {
    borderRadius: scale(14),
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  tabIcon: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(6),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  tabIconActive: {
    backgroundColor: 'rgba(184, 123, 90, 0.15)',
  },
  tabText: { 
    color: '#8A8A96', 
    fontFamily: FontNames.instrumentSans, 
    fontWeight: '600',
    fontSize: moderateScale(13),
  },
  tabTextActive: {
    color: '#F0F0F2',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: verticalScale(4),
    left: '50%',
    marginLeft: scale(-10),
    width: scale(20),
    height: verticalScale(3),
    borderRadius: scale(1.5),
    backgroundColor: tokens.colors.mahogany,
  },
  modeContainer: { 
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.06)',
    paddingLeft: scale(12),
  },
  modeContainerMobile: {
    borderLeftWidth: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingLeft: 0,
    paddingTop: verticalScale(10),
    width: '100%',
  },
  modeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  modeLabel: { 
    color: '#8A8A96', 
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(12),
    fontWeight: '500',
  },
  modeButtons: {
    flexDirection: 'row',
    gap: scale(6),
  },
  modeBtn: { 
    position: 'relative',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: scale(10),
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
    minWidth: scale(70),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnActive: { 
    backgroundColor: 'rgba(184, 123, 90, 0.15)',
    borderColor: 'rgba(184, 123, 90, 0.3)',
  },
  modeBtnText: { 
    color: '#8A8A96', 
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  modeBtnTextActive: { 
    color: '#F0F0F2',
  },
  mobileDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(9),
    borderRadius: scale(12),
    backgroundColor: 'rgba(184, 123, 90, 0.08)',
    flex: 1,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 12, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(24),
  },
  dropdownMenu: {
    width: '100%',
    maxWidth: scale(320),
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.2)',
    overflow: 'hidden',
    paddingBottom: verticalScale(8),
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: verticalScale(8),
  },
  dropdownTitle: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#F0F0F2',
    letterSpacing: scale(0.5),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    borderRadius: scale(14),
    marginHorizontal: scale(8),
    marginBottom: verticalScale(4),
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(184, 123, 90, 0.1)',
  },
  dropdownIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownIconActive: {
    backgroundColor: 'rgba(184, 123, 90, 0.15)',
  },
  dropdownItemText: {
    flex: 1,
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(15),
    fontWeight: '500',
    color: '#8A8A96',
  },
  dropdownItemTextActive: {
    color: '#F0F0F2',
    fontWeight: '700',
  },
});
