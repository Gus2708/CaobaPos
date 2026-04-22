import React, { memo, useState, useCallback, useMemo, useEffect, useRef, createContext, useContext } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Text } from './Text';
import { FontNames } from '../lib/fontNames';
import { Icon } from './Icon';
import { scale, verticalScale, moderateScale } from '../lib/responsive';

export type DashboardPeriod = 'dia' | 'semana' | 'mes' | 'personalizado';

interface PeriodSelectorProps {
  selected: DashboardPeriod;
  onSelect: (period: DashboardPeriod) => void;
}

const PERIODS: { id: DashboardPeriod; label: string; icon: string }[] = [
  { id: 'dia', label: 'Día', icon: 'calendar-day' },
  { id: 'semana', label: 'Semana', icon: 'calendar-week' },
  { id: 'mes', label: 'Mes', icon: 'calendar-alt' },
  { id: 'personalizado', label: 'Personalizado', icon: 'calendar-alt' },
];

function PeriodSelectorComponent({ selected, onSelect }: PeriodSelectorProps) {
  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {PERIODS.map((period) => (
          <TouchableOpacity
            key={period.id}
            style={[styles.tab, selected === period.id && styles.tabActive]}
            onPress={() => onSelect(period.id)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: selected === period.id }}
          >
            <View style={[styles.tabContent, selected === period.id && styles.tabContentActive]}>
              <Icon 
                name={period.icon} 
                size={14} 
                color={selected === period.id ? '#F0F0F2' : '#8A8A96'} 
              />
              <Text style={[styles.tabText, selected === period.id && styles.tabTextActive]}>
                {period.label}
              </Text>
            </View>
            {selected === period.id && <View style={styles.activePip} />}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export const PeriodSelector = memo(PeriodSelectorComponent);

const styles = StyleSheet.create({
  container: {
    marginBottom: verticalScale(16),
  },
  scrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    minHeight: verticalScale(45),
  },
  tab: {
    position: 'relative',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    overflow: 'hidden',
    minHeight: verticalScale(36),
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: 'rgba(184, 123, 90, 0.15)',
    borderColor: 'rgba(184, 123, 90, 0.3)',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    justifyContent: 'center',
  },
  tabContentActive: {
    backgroundColor: 'transparent',
  },
  tabText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#8A8A96',
    letterSpacing: scale(0.3),
  },
  tabTextActive: {
    color: '#F0F0F2',
  },
  activePip: {
    position: 'absolute',
    bottom: verticalScale(6),
    alignSelf: 'center',
    width: scale(16),
    height: verticalScale(3),
    borderRadius: scale(1.5),
    backgroundColor: '#B87B5A',
  },
});

