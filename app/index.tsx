import { View, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TextInput, useWindowDimensions, TouchableOpacity, Modal, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../components/Text';
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useProducts, Category } from '../hooks/useProducts';
import { useCartStore, useSettingsStore } from '../store/cartStore';
import { globalScrollY, headerTranslateY } from '../store/uiStore';
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
import { prefetchImages } from '../lib/imageCache';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale, moderateScale } from '../lib/responsive';
import { FlashList } from '@shopify/flash-list';
import { SkeletonItem } from '../components/SkeletonItem';
import { Badge } from '../components/Badge';

// Row height = item minHeight (76) + vertical padding (4+4 = 8). Used for getItemLayout.
const ITEM_HEIGHT = verticalScale(76) + verticalScale(8);
const LOW_STOCK_THRESHOLD = 10;

// Create animated component at module level to avoid remount on every render
const AnimatedFlashList = Animated.createAnimatedComponent(FlashList) as unknown as typeof FlashList;

const ProductItem = React.memo(function ProductItem({ 
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

  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const numColumns = isMobile ? 1 : 3;

  const [showMobileCart, setShowMobileCart] = useState(false);

  const HEADER_HEIGHT = verticalScale(60) + insets.top;
  const NAVBAR_HEIGHT = verticalScale(64);
  const TOTAL_NAV_HEIGHT = HEADER_HEIGHT + NAVBAR_HEIGHT;
  const CAT_HEIGHT = verticalScale(44);
  const TOTAL_HIDE = TOTAL_NAV_HEIGHT + CAT_HEIGHT;

  // CategoryTabs follow the same animation as header/navbar
  const catTranslateY = headerTranslateY;
  
  const ivaEnabled = useSettingsStore((state) => state.ivaEnabled);

  const subtotal = useMemo(() => items.reduce((acc, i) => acc + i.price * i.quantity, 0), [items]);
  const finalTotal = ivaEnabled ? subtotal * 1.16 : subtotal;

  const { data: allProducts } = useQuery<Product[]>({
    queryKey: ['products-all-for-barcode'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, cost, barcode, image_url, stock_quantity, categories, is_active, created_at')
        .eq('is_active', true);
      if (error) throw error;
      return data ?? [];
    },
  });

  // O(1) Lookup Map for Barcodes [js-index-maps]
  const barcodeMap = useMemo(() => {
    const map = new Map<string, Product>();
    if (allProducts) {
      allProducts.forEach(p => {
        if (p.barcode) map.set(p.barcode, p);
      });
    }
    return map;
  }, [allProducts]);

  // Prefetch product images to local cache on first load
  // Only use our custom prefetchImages (parallel batches) — expo-image handles its own layer
  useEffect(() => {
    if (allProducts && allProducts.length > 0) {
      const urls = allProducts.map(p => p.image_url).filter(Boolean) as string[];
      if (urls.length > 0) prefetchImages(urls);
    }
  }, [allProducts]);

  // Priority prefetch for selected category to ensure smooth scroll
  useEffect(() => {
    if (selectedCategory && allProducts) {
      const categoryUrls = allProducts
        .filter(p => !selectedCategory || (p.categories && p.categories.includes(selectedCategory)))
        .map(p => p.image_url)
        .filter(Boolean) as string[];
      if (categoryUrls.length > 0) prefetchImages(categoryUrls);
    }
  }, [selectedCategory, allProducts]);

  const checkLowStock = useCallback((product: Product) => {
    if (product.stock_quantity <= 0) {
      showToast(`${product.name} sin stock`, 'error');
      return false;
    }
    // Low stock warning removed by user request
    return true;
  }, [showToast]);

  useEffect(() => {
    // Focus barcode input after short delay to allow UI to settle
    const timer = setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleBarcodeBlur = useCallback(() => {
    // Only refocus if not searching and cart is not empty
    if (!searchQuery && items.length > 0) {
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 500);
    }
  }, [searchQuery, items.length]);

  const handleBarcodeBuffer = useCallback((text: string) => {
    setBarcodeBuffer(text);

    if (bufferTimeoutRef.current) {
      clearTimeout(bufferTimeoutRef.current);
    }

    if (text.includes('\n') || text.includes('\r')) {
      const barcode = text.replace(/[\n\r]/g, '').trim();
      if (barcode) {
        const product = barcodeMap.get(barcode);
        if (product) {
          if (checkLowStock(product)) {
            addItem(product);
            showToast(`Agregado: ${product.name}`, 'success');
          }
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
          const product = barcodeMap.get(barcode);
          if (product) {
            if (checkLowStock(product)) {
              addItem(product);
              showToast(`Agregado: ${product.name}`, 'success');
            }
          } else {
            showToast(`Producto no encontrado: ${barcode}`, 'error');
          }
        }
        setBarcodeBuffer('');
      }
    }, 500);
  }, [addItem, showToast, barcodeBuffer, checkLowStock, barcodeMap]);

  useEffect(() => {
    return () => {
      if (bufferTimeoutRef.current) {
        clearTimeout(bufferTimeoutRef.current);
      }
    };
  }, []);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    // Category filtering is handled server-side in useProducts
    // Here we only apply the local search filter
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.barcode?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const handleProductPress = useCallback((product: Product) => {
    if (checkLowStock(product)) {
      addItem(product);
    }
  }, [addItem, checkLowStock]);

  const handleClearCart = useCallback(() => {
    clearCart();
    showToast('Carrito vaciado', 'info');
  }, [clearCart, showToast]);

  const renderItem = useCallback(({ item }: { item: Product }) => (
    <View style={[styles.productItem, !isMobile && { width: `${100 / numColumns}%` }]}>
      <ProductButton 
        product={item} 
        onPress={() => handleProductPress(item)}
        compact={!isMobile}
      />
    </View>
  ), [handleProductPress, isMobile, numColumns]);

  const keyExtractor = useCallback((item: Product) => item.id, []);

  // [rerender-memo] Extract to memoized component
  const ListEmptyComponent = useMemo(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Icon name="search-plus" size={64} color={tokens.colors.mahoganyDim} />
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
    );
  }, [searchQuery, isLoading]);

  return (
    <View style={[styles.main, isMobile && { flexDirection: 'column' }]}>

      
      <TextInput
        ref={barcodeInputRef}
        style={styles.hiddenInput}
        value={barcodeBuffer}
        onChangeText={handleBarcodeBuffer}
        onBlur={handleBarcodeBlur}
        autoFocus
        showSoftInputOnFocus={false}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="default"
        returnKeyType="done"
      />
      
      <View style={[styles.leftPanel, isMobile && { flex: 1 }]}>
        <Animated.View style={[styles.tabsContainer, {
          position: 'absolute',
          top: TOTAL_NAV_HEIGHT,
          left: 0,
          right: 0,
          zIndex: 10,
          transform: [{ translateY: catTranslateY }]
        }]}>
          <CategoryTabs 
            selected={selectedCategory} 
            onSelect={setSelectedCategory} 
          />
        </Animated.View>


        <View style={styles.productsContainer}>
          {isLoading ? (
            <View style={styles.productsContainer}>
              <SkeletonItem 
                layout={isMobile ? 'row' : 'card'} 
                count={isMobile ? 8 : 12} 
              />
            </View>
          ) : (
            <AnimatedFlashList
              key={`products-grid-${numColumns}`}
              data={filteredProducts}
              numColumns={numColumns}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              // @ts-ignore - Property exists at runtime but causes false negative in some TSC versions
              estimatedItemSize={ITEM_HEIGHT}
              contentContainerStyle={[
                styles.productGrid,
                { 
                  paddingTop: TOTAL_NAV_HEIGHT + CAT_HEIGHT + verticalScale(10),
                  paddingBottom: (isMobile && items.length > 0 ? verticalScale(96) : verticalScale(20)) + insets.bottom 
                }
              ]}
              ListHeaderComponent={
                <View style={styles.searchContainer}>
                  <View style={styles.searchInputContainer}>
                    <Icon name="search" size={20} color={tokens.colors.textMuted} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Buscar producto..."
                      placeholderTextColor={tokens.colors.textDim}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                      <Badge variant="mahogany">
                        {filteredProducts.length}
                      </Badge>
                    )}
                  </View>
                </View>
              }
              showsVerticalScrollIndicator={false}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: globalScrollY } } }],
                { useNativeDriver: true }
              )}
              scrollEventThrottle={16}
              refreshControl={
                <RefreshControl
                  refreshing={false}
                  onRefresh={refetch}
                  tintColor={tokens.colors.mahogany}
                  progressBackgroundColor={tokens.colors.glass.heavy}
                />
              }
              ListEmptyComponent={ListEmptyComponent}
            />
          )}
        </View>
        
        {!isMobile && (
          <View style={styles.actionsContainer}>
            <QuickActions 
              onClear={handleClearCart} 
              hasItems={items.length > 0}
            />
          </View>
        )}

        {isMobile && items.length > 0 && (
          <View style={[styles.mobileActionBar, { bottom: verticalScale(10) + insets.bottom }]}>
            <QuickActions 
              onClear={handleClearCart} 
              hasItems={items.length > 0}
              compact
            />
            <TouchableOpacity 
              style={styles.mobileCheckoutBtn} 
              onPress={() => setShowMobileCart(true)}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['rgba(184, 123, 90, 0.95)', 'rgba(139, 90, 60, 0.95)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.checkoutBtnContent}>
                <Icon name="shopping-cart" size={24} color="#F0F0F2" />
                <Text style={styles.mobileFabText}>Ver Carrito ({items.length})</Text>
                <Text style={styles.mobileFabTotal}>${finalTotal.toFixed(2)}</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

      </View>
      
      {isMobile ? (
        <Modal
          visible={showMobileCart}
          animationType="slide"
          transparent={true}
          statusBarTranslucent={true}
          navigationBarTranslucent={true}
          onRequestClose={() => setShowMobileCart(false)}
        >
          <View style={styles.mobileCartOverlay}>
             <CheckoutPanel onCloseMobile={() => setShowMobileCart(false)} />
          </View>
        </Modal>
      ) : (
        <View style={styles.rightPanel}>
          <CheckoutPanel />
        </View>
      )}
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
    backgroundColor: tokens.colors.glass.medium,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  searchContainer: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(20),
    paddingBottom: verticalScale(8),
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: tokens.radius.pill,
    paddingHorizontal: scale(16),
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    gap: scale(12),
    height: verticalScale(48),
  },
  searchInput: {
    flex: 1,
    color: tokens.colors.text,
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    fontWeight: '600',
    height: '100%',
  },
  searchCountBadge: {
    backgroundColor: tokens.colors.mahoganyDim,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: tokens.radius.pill,
  },
  searchCountText: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(12),
    fontWeight: '800',
    color: tokens.colors.mahogany,
  },
  productsContainer: {
    flex: 1,
  },
  actionsContainer: {
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(8),
  },
  rightPanel: {
    flex: 0.25,
    minWidth: scale(260),
    borderLeftWidth: 1,
    borderLeftColor: tokens.colors.border,
    position: 'relative',
    backgroundColor: tokens.colors.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(12),
  },
  loadingText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    color: tokens.colors.textMuted,
  },
  productGrid: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
  },
  productItem: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(8),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: verticalScale(100),
    gap: scale(12),
  },
  emptyIcon: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: tokens.colors.mahoganyDim,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: tokens.colors.mahogany,
    marginBottom: verticalScale(16),
  },
  emptyText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: tokens.colors.text,
  },
  emptySubtext: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    color: tokens.colors.textMuted,
    fontWeight: '600',
  },
  mobileActionBar: {
    position: 'absolute',
    left: scale(20),
    right: scale(20),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  mobileCheckoutBtn: {
    flex: 1,
    height: verticalScale(60),
    borderRadius: tokens.radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: tokens.colors.mahogany,
  },
  checkoutBtnContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
  },
  mobileFabText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(15),
    fontWeight: '800',
    color: '#FFFFFF',
  },
  mobileFabTotal: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(18),
    fontWeight: '900',
    color: '#FFFFFF',
  },
  mobileCartOverlay: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
});
