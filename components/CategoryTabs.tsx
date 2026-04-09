import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Category } from '../hooks/useProducts';
import { FontNames } from '../lib/fontNames';
import { useSettingsStore } from '../store/cartStore';

const DEFAULT_CATEGORIES = ['helados', 'cafe', 'snacks', 'bebidas'];

interface CategoryTabsProps {
  selected: Category;
  onSelect: (category: Category) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  todos: 'cart',
  helados: 'cart',
  cafe: 'cart',
  snacks: 'cart',
  bebidas: 'cart',
};

function CategoryTabsComponent({ selected, onSelect }: CategoryTabsProps) {
  const storeCategories = useSettingsStore((state) => state.categories);
  const categories = storeCategories.length > 0 ? storeCategories : DEFAULT_CATEGORIES;

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <TouchableOpacity
        style={[styles.tab, selected === 'todos' && styles.tabActive]}
        onPress={() => onSelect('todos')}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ selected: selected === 'todos' }}
      >
        {selected === 'todos' && (
          <LinearGradient
            colors={['rgba(184, 123, 90, 0.35)', 'rgba(184, 123, 90, 0.15)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={[styles.tabContent, selected === 'todos' && styles.tabContentActive]}>
          <Text style={[styles.tabText, selected === 'todos' && styles.tabTextActive]}>
            Todos
          </Text>
        </View>
      </TouchableOpacity>
      
      {categories.map((cat) => (
        <TouchableOpacity
          key={cat}
          style={[styles.tab, selected === cat && styles.tabActive]}
          onPress={() => onSelect(cat as Category)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ selected: selected === cat }}
        >
          {selected === cat && (
            <LinearGradient
              colors={['rgba(184, 123, 90, 0.35)', 'rgba(184, 123, 90, 0.15)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          <View style={[styles.tabContent, selected === cat && styles.tabContentActive]}>
            <Text style={[styles.tabText, selected === cat && styles.tabTextActive]}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Text>
          </View>
          {selected === cat && <View style={styles.activePip} />}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

export const CategoryTabs = memo(CategoryTabsComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    minHeight: 60,
  },
  tab: {
    position: 'relative',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
    minHeight: 44,
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(184, 123, 90, 0.3)',
    shadowColor: '#B87B5A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContentActive: {
    backgroundColor: 'transparent',
  },
  tabText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 13,
    fontWeight: '600',
    color: '#8A8A96',
    letterSpacing: 0.3,
  },
  tabTextActive: {
    color: '#F0F0F2',
  },
  activePip: {
    position: 'absolute',
    bottom: 6,
    alignSelf: 'center',
    width: 16,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#B87B5A',
  },
});
