import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontNames } from '../lib/fontNames';
import { Icon } from '../components/Icon';

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

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(30, 30, 36, 0.7)', 'rgba(10, 10, 12, 0.9)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.topEdge} />
      
      <View style={styles.content}>
        <View style={styles.tabsContainer}>
          <View style={styles.tabsWrapper}>
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
          </View>
        </View>
        
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: 'rgba(30, 30, 36, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(184, 123, 90, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  topEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
    minHeight: 44,
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(184, 123, 90, 0.25)',
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
    backgroundColor: 'transparent',
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
});
