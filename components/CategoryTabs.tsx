import React, { memo, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Text } from './Text';
import { Category } from '../hooks/useProducts';
import { FontNames } from '../lib/fontNames';
import { useSettingsStore } from '../store/cartStore';
import { Icon } from './Icon';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale, moderateScale } from '../lib/responsive';
import { PressableScale } from './PressableScale';
import { BrandMark } from './BrandMark';

const DEFAULT_CATEGORIES = ['helados', 'cafe', 'snacks', 'bebidas'];
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);

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

  const [layouts, setLayouts] = useState<Record<string, { x: number; width: number }>>({});
  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);
  const isReady = useSharedValue(false);
  const reducedMotion = useReducedMotion();

  const handleTabLayout = useCallback((key: string, e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setLayouts((prev) => ({ ...prev, [key]: { x, width } }));
  }, []);

  useEffect(() => {
    const target = layouts[selected];
    if (!target) return;

    if (!isReady.get() || reducedMotion) {
      indicatorX.set(target.x);
      indicatorW.set(target.width);
      isReady.set(true);
    } else {
      indicatorX.set(withTiming(target.x, { duration: 250, easing: EASE_IN_OUT }));
      indicatorW.set(withTiming(target.width, { duration: 250, easing: EASE_IN_OUT }));
    }
  }, [selected, layouts, reducedMotion]);

  const handleSelect = useCallback(
    (key: string) => {
      if (key !== selected) {
        Haptics.selectionAsync();
        onSelect(key as Category);
      }
    },
    [selected, onSelect]
  );

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.get() }],
    width: indicatorW.get(),
    opacity: indicatorW.get() > 0 ? 1 : 0,
  }));

  const renderTab = (key: string, label: string, iconName: string) => {
    const isActive = selected === key;
    return (
      <View key={key} onLayout={(e) => handleTabLayout(key, e)}>
        <PressableScale
          style={styles.tab}
          onPress={() => handleSelect(key)}
          scaleTo={0.97}
          accessibilityRole="button"
          accessibilityState={{ selected: isActive }}
          accessibilityLabel={`Categoría ${label}`}
        >
          {isActive ? (
            <BrandMark motif="flor1" style={{ width: scale(16), height: scale(16) }} />
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
      </View>
    );
  };

  return (
    <View>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* Animated active pill indicator */}
        <Animated.View style={[styles.slidingPill, pillAnimatedStyle]} pointerEvents="none" />

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
    paddingBottom: verticalScale(6),
    gap: scale(10),
    position: 'relative',
  },
  slidingPill: {
    position: 'absolute',
    top: verticalScale(12),
    bottom: verticalScale(6),
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: tokens.colors.mahogany,
    height: verticalScale(36),
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
    borderRadius: tokens.radius.pill,
    backgroundColor: 'transparent',
  },
  tabText: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: tokens.colors.textMuted,
    letterSpacing: 0.2,
  },
  tabTextActive: {
    color: tokens.colors.mahogany,
    fontWeight: '800',
  },
});

