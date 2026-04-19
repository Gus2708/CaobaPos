import React, { memo, useState, useCallback, useMemo, useEffect, useRef, createContext, useContext } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Text } from './Text';
import { Category } from '../hooks/useProducts';
import { FontNames } from '../lib/fontNames';
import { useSettingsStore } from '../store/cartStore';
import { Icon } from './Icon';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale, moderateScale } from '../lib/responsive';

const DEFAULT_CATEGORIES = ['helados', 'cafe', 'snacks', 'bebidas'];

interface CategoryTabsProps {
  selected: Category;
  onSelect: (category: Category) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  todos: 'filter',
  helados: 'ice-cream',
  icecream: 'ice-cream',
  cafe: 'coffee',
  coffee: 'coffee',
  snacks: 'cookie-bite',
  bebidas: 'glass-martini',
  drinks: 'glass-martini',
  panaderia: 'bread-slice',
  bakery: 'bread-slice',
};

function CategoryTabsComponent({ selected, onSelect }: CategoryTabsProps) {
  const storeCategories = useSettingsStore((state) => state.categories);
  const categories = storeCategories.length > 0 ? storeCategories : DEFAULT_CATEGORIES;

  const renderTab = (key: string, label: string, iconName: string) => {
    const isActive = selected === key;
    return (
      <TouchableOpacity
        key={key}
        style={[styles.tab, isActive && styles.tabActive]}
        onPress={() => onSelect(key as Category)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
      >
        <Icon 
          name={iconName} 
          size={20} 
          color={isActive ? tokens.colors.text : tokens.colors.textMuted} 
        />
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {renderTab('todos', 'Todos', 'filter')}
      {categories.map((cat) =>
        renderTab(
          cat,
          cat.charAt(0).toUpperCase() + cat.slice(1),
          CATEGORY_ICONS[cat.toLowerCase()] || 'folder'
        )
      )}
    </ScrollView>
  );
}

export const CategoryTabs = memo(CategoryTabsComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    gap: scale(8),
    minHeight: verticalScale(52),
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: tokens.colors.surfaceElevated,
    borderColor: tokens.colors.borderMedium,
  },
  tabText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(13),
    fontWeight: '500',
    color: tokens.colors.textMuted,
  },
  tabTextActive: {
    color: tokens.colors.text,
    fontWeight: '600',
  },
});
