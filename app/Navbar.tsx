import { View, Text, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions, Modal, TouchableWithoutFeedback } from 'react-native';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { FontNames } from '../lib/fontNames';
import { Icon } from '../components/Icon';
import { tokens } from '../lib/designTokens';

type Screen = 'pos' | 'dashboard' | 'inventory' | 'history';

const TABS: { key: Screen; label: string; icon: string }[] = [
  { key: 'pos', label: 'POS', icon: 'cart' },
  { key: 'dashboard', label: 'Dashboard', icon: 'chart-bar' },
  { key: 'inventory', label: 'Inventario', icon: 'archive' },
  { key: 'history', label: 'Historial', icon: 'clock' },
];

interface NavbarProps {
  current: Screen;
  onNavigate: (s: Screen) => void;
  mode: 'view' | 'edit';
  onToggleMode: (m: 'view' | 'edit') => void;
}

export function Navbar({ current, onNavigate, mode, onToggleMode }: NavbarProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const activeTab = TABS.find((t) => t.key === current);

  return (
    <View style={styles.container}>

      <View style={styles.content}>
        {isMobile ? (
          <View style={styles.tabsContainer}>
             <TouchableOpacity 
               style={styles.mobileDropdownBtn} 
               onPress={() => setDropdownOpen(true)}
               activeOpacity={0.7}
             >
                <View style={[styles.tabIcon, styles.tabIconActive]}>
                  <Icon name={activeTab?.icon || 'bars'} size={16} color="#B87B5A" />
                </View>
                <Text style={[styles.tabText, styles.tabTextActive, { flex: 1 }]}>
                  {activeTab?.label}
                </Text>
                <Icon name="chevron-down" size={14} color="#8A8A96" style={{ marginRight: 4 }} />
             </TouchableOpacity>

             <Modal visible={dropdownOpen} transparent animationType="fade" onRequestClose={() => setDropdownOpen(false)}>
               <TouchableWithoutFeedback onPress={() => setDropdownOpen(false)}>
                 <View style={styles.dropdownOverlay}>
                   <TouchableWithoutFeedback>
                     <View style={styles.dropdownMenu}>
                       <LinearGradient
                         colors={['rgba(10, 10, 12, 0.95)', 'rgba(10, 10, 12, 0.98)']}
                         start={{ x: 0, y: 0 }}
                         end={{ x: 1, y: 1 }}
                         style={StyleSheet.absoluteFill}
                       />
                       <View style={styles.dropdownHeader}>
                         <Text style={styles.dropdownTitle}>Navegación</Text>
                         <TouchableOpacity onPress={() => setDropdownOpen(false)}>
                           <Icon name="close" size={18} color="#8A8A96" />
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
                          color={isActive ? '#B87B5A' : '#8A8A96'} 
                        />
                      </View>
                      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
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
          <View style={styles.modeContainer}>
            <View style={styles.modeInner}>
              <Text style={styles.modeLabel}>Modo:</Text>
              <View style={styles.modeButtons}>
                <TouchableOpacity
                  style={[styles.modeBtn, mode === 'view' && styles.modeBtnActive]}
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
                  style={[styles.modeBtn, mode === 'edit' && styles.modeBtnActive]}
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
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  tabsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tab: {
    position: 'relative',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 36,
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(184, 123, 90, 0.12)',
  },
  tabGradient: {
    borderRadius: 14,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
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
    fontSize: 13,
  },
  tabTextActive: {
    color: '#F0F0F2',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 4,
    left: '50%',
    marginLeft: -10,
    width: 20,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#B87B5A',
  },
  modeContainer: { 
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.06)',
    paddingLeft: 12,
  },
  modeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeLabel: { 
    color: '#8A8A96', 
    fontFamily: FontNames.instrumentSans,
    fontSize: 12,
    fontWeight: '500',
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  modeBtn: { 
    position: 'relative',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
    minWidth: 60,
    alignItems: 'center',
  },
  modeBtnActive: { 
    backgroundColor: 'rgba(184, 123, 90, 0.15)',
    borderColor: 'rgba(184, 123, 90, 0.3)',
  },
  modeBtnText: { 
    color: '#8A8A96', 
    fontFamily: FontNames.instrumentSans,
    fontSize: 12,
    fontWeight: '600',
  },
  modeBtnTextActive: { 
    color: '#F0F0F2',
  },
  mobileDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(184, 123, 90, 0.08)',
    flex: 1,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 12, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dropdownMenu: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.2)',
    overflow: 'hidden',
    paddingBottom: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 8,
  },
  dropdownTitle: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 16,
    fontWeight: '700',
    color: '#F0F0F2',
    letterSpacing: 0.5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    marginHorizontal: 8,
    marginBottom: 4,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(184, 123, 90, 0.1)',
  },
  dropdownIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
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
    fontSize: 15,
    fontWeight: '500',
    color: '#8A8A96',
  },
  dropdownItemTextActive: {
    color: '#F0F0F2',
    fontWeight: '700',
  },
});
