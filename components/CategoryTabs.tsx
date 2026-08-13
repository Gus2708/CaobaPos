import React, { memo, useState, useCallback, useMemo, useEffect, useRef, createContext, useContext } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Text } from './Text';
import { Category } from '../hooks/useProducts';
import { FontNames } from '../lib/fontNames';
import { useSettingsStore } from '../store/cartStore';
import { Icon } from './Icon';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale, moderateScale } from '../lib/responsive';
import { PressableScale } from './PressableScale';
import { FLOR1_BASE64 } from '../lib/brandAssets';

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
      <PressableScale
        key={key}
        style={[styles.tab, isActive && styles.tabActive]}
        onPress={() => onSelect(key as Category)}
        scaleTo={0.92}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
      >
        {isActive ? (
          <Image source={{ uri: FLOR1_BASE64 }} style={{ width: scale(16), height: scale(16) }} resizeMode="contain" />
        ) : (
          <Icon
            name={iconName}
            size={20}
            color={tokens.colors.textMuted}
          />
        )}
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
          {label}
        </Text>
      </PressableScale>
    );
  };

  return (
    <View>
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
    </View>
  );
}

export const CategoryTabs = memo(CategoryTabsComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(6), // Reduced to make space for search
    gap: scale(10),
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: tokens.colors.mahogany, 
  },
  tabText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: tokens.colors.textMuted,
    letterSpacing: 0.2,
  },
  tabTextActive: {
    color: tokens.colors.mahogany,
    fontWeight: '800',
    textShadowColor: 'transparent',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0,
  },
});
