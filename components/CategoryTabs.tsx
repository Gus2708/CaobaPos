import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Category } from '../hooks/useProducts';
import { FontNames } from '../lib/fontNames';
import { useSettingsStore } from '../store/cartStore';
import { Icon } from './Icon';

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

        <View style={[styles.tabContent, selected === 'todos' && styles.tabContentActive]}>
          <Icon 
            name="filter" 
            size={14} 
            color={selected === 'todos' ? '#F0F0F2' : '#8A8A96'} 
          />
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

          <View style={[styles.tabContent, selected === cat && styles.tabContentActive]}>
            <Icon 
              name={CATEGORY_ICONS[cat.toLowerCase()] || 'folder'} 
              size={14} 
              color={selected === cat ? '#F0F0F2' : '#8A8A96'} 
            />
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
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    minHeight: 36,
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(184, 123, 90, 0.15)',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
