import { View, FlatList, StyleSheet, ActivityIndicator, Text, RefreshControl, TextInput } from 'react-native';
import { useState, useMemo, useCallback, memo, useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useProducts, Category } from '../hooks/useProducts';
import { useCartStore } from '../store/cartStore';
import { CategoryTabs } from '../components/CategoryTabs';
import { ProductButton } from '../components/ProductButton';
import { CheckoutPanel } from '../components/CheckoutPanel';
import { QuickActions } from '../components/QuickActions';
import { FontNames } from '../lib/fontNames';
import { Icon } from '../components/Icon';
import { Product } from '../store/cartStore';
import { useToast } from '../components/Toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const ITEM_HEIGHT = 188;
const NUM_COLUMNS = 3;

const ProductItem = memo(function ProductItem({ 
  product, 
  onPress 
}: { 
  product: Product; 
  onPress: () => void; 
}) {
  return (
    <View style={styles.productItem}>
      <ProductButton product={product} onPress={onPress} />
    </View>
  );
});

export function POSScreen() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const { data: products, isLoading, refetch } = useProducts(selectedCategory);
  const addItem = useCartStore((state) => state.addItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const items = useCartStore((state) => state.items);
  const { showToast } = useToast();
  const barcodeInputRef = useRef<TextInput>(null);
  const bufferTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: allProducts } = useQuery<Product[]>({
    queryKey: ['products-all-for-barcode'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, barcode, image_url, stock_quantity, categories, is_active, created_at')
        .eq('is_active', true);
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleBarcodeBuffer = useCallback((text: string) => {
    setBarcodeBuffer(text);

    if (bufferTimeoutRef.current) {
      clearTimeout(bufferTimeoutRef.current);
    }

    if (text.includes('\n') || text.includes('\r')) {
      const barcode = text.replace(/[\n\r]/g, '').trim();
      if (barcode) {
        const product = allProducts?.find(p => p.barcode === barcode);
        if (product) {
          addItem(product);
          showToast(`Agregado: ${product.name}`, 'success');
        } else {
          showToast(`Producto no encontrado: ${barcode}`, 'error');
        }
      }
      setBarcodeBuffer('');
      return;
    }

    bufferTimeoutRef.current = setTimeout(() => {
      if (barcodeBuffer.length > 0) {
        const barcode = barcodeBuffer.trim();
        if (barcode.length >= 3) {
          const product = allProducts?.find(p => p.barcode === barcode);
          if (product) {
            addItem(product);
            showToast(`Agregado: ${product.name}`, 'success');
          } else {
            showToast(`Producto no encontrado: ${barcode}`, 'error');
          }
        }
        setBarcodeBuffer('');
      }
    }, 500);
  }, [allProducts, addItem, showToast, barcodeBuffer]);

  useEffect(() => {
    return () => {
      if (bufferTimeoutRef.current) {
        clearTimeout(bufferTimeoutRef.current);
      }
    };
  }, []);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let filtered = products;
    
    if (selectedCategory !== 'todos') {
      filtered = filtered.filter((p) => 
        p.categories?.includes(selectedCategory)
      );
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.barcode?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [products, searchQuery, selectedCategory]);

  const handleProductPress = useCallback((product: Product) => {
    addItem(product);
  }, [addItem]);

  const renderItem = useCallback(({ item }: { item: Product }) => (
    <ProductItem 
      product={item} 
      onPress={() => handleProductPress(item)} 
    />
  ), [handleProductPress]);

  const keyExtractor = useCallback((item: Product) => item.id, []);

  const getItemLayout = useCallback(
    (_data: ArrayLike<Product> | null | undefined, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * Math.floor(index / NUM_COLUMNS),
      index,
    }),
    []
  );

  const ListEmptyComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Icon name="search-plus" size={48} color="rgba(184, 123, 90, 0.3)" />
      </View>
      <Text style={styles.emptyText}>
        {searchQuery ? 'Sin resultados' : 'No hay productos'}
      </Text>
      {searchQuery && (
        <Text style={styles.emptySubtext}>
          No se encontró "{searchQuery}"
        </Text>
      )}
    </View>
  ), [searchQuery]);

  return (
    <View style={styles.main}>
      <LinearGradient
        colors={['rgba(15, 15, 20, 0.98)', 'rgba(10, 10, 12, 0.95)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      <TextInput
        ref={barcodeInputRef}
        style={styles.hiddenInput}
        value={barcodeBuffer}
        onChangeText={handleBarcodeBuffer}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="default"
        returnKeyType="done"
      />
      
      <View style={styles.leftPanel}>
        <View style={styles.tabsContainer}>
          <CategoryTabs 
            selected={selectedCategory} 
            onSelect={setSelectedCategory} 
          />
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Icon name="search" size={18} color="#8A8A96" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar producto..."
              placeholderTextColor="#8A8A96"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Text style={styles.searchCount}>
                {filteredProducts.length}
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.productsContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#B87B5A" />
              <Text style={styles.loadingText}>Cargando productos...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              numColumns={NUM_COLUMNS}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              getItemLayout={getItemLayout}
              contentContainerStyle={styles.productGrid}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={true}
              maxToRenderPerBatch={12}
              windowSize={5}
              initialNumToRender={12}
              updateCellsBatchingPeriod={50}
              refreshControl={
                <RefreshControl
                  refreshing={false}
                  onRefresh={refetch}
                  tintColor="#B87B5A"
                  progressBackgroundColor="rgba(30, 30, 36, 0.8)"
                />
              }
              ListEmptyComponent={ListEmptyComponent}
            />
          )}
        </View>
        
        <View style={styles.actionsContainer}>
          <QuickActions 
            onClear={clearCart} 
            hasItems={items.length > 0}
          />
        </View>
      </View>
      
      <View style={styles.rightPanel}>
        <CheckoutPanel />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  leftPanel: {
    flex: 0.75,
    minWidth: 0,
    position: 'relative',
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 36, 0.6)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#F0F0F2',
    paddingVertical: 12,
    fontFamily: FontNames.instrumentSans,
    fontSize: 15,
  },
  searchCount: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: 12,
    color: '#B87B5A',
    backgroundColor: 'rgba(184, 123, 90, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  productsContainer: {
    flex: 1,
  },
  actionsContainer: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  rightPanel: {
    flex: 0.25,
    minWidth: 240,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(184, 123, 90, 0.15)',
    position: 'relative',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 14,
    color: '#8A8A96',
  },
  productGrid: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  productItem: {
    flex: 1,
    padding: 6,
    maxWidth: `${100 / NUM_COLUMNS}%`,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    gap: 12,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(184, 123, 90, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 18,
    fontWeight: '600',
    color: '#8A8A96',
  },
  emptySubtext: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 14,
    color: '#666',
  },
});
