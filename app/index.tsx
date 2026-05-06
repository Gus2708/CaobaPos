import { View, StyleSheet, RefreshControl, TextInput, useWindowDimensions, TouchableOpacity, Modal, Animated, ScrollView } from 'react-native';
import { AppBlurView } from '../components/AppBlurView';
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

// Row height = item minHeight (84) + vertical padding (8+8 = 16). Used for getItemLayout.
const ITEM_HEIGHT = verticalScale(84) + verticalScale(16);
const LOW_STOCK_THRESHOLD = 10;

// Create animated component at module level to avoid remount on every render
const AnimatedFlashList = Animated.createAnimatedComponent(FlashList) as any;

export function POSScreen() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const barcodeBufferRef = useRef('');
  const [displayBarcodeBuffer, setDisplayBarcodeBuffer] = useState(''); // Just for the hidden input value
  
  // Single query for all products
  const { data: allProducts = [], isLoading, refetch } = useProducts('todos');
  
  const addItem = useCartStore((state) => state.addItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const items = useCartStore((state) => state.items);
  const { showToast } = useToast();
  const barcodeInputRef = useRef<TextInput>(null);
  const bufferTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const numColumns = isMobile ? 1 : 3;

  const [showMobileCart, setShowMobileCart] = useState(false);

  const HEADER_HEIGHT = verticalScale(50) + insets.top;
  const TOTAL_NAV_HEIGHT = HEADER_HEIGHT;
  const CAT_HEIGHT = verticalScale(44);

  // Search debouncing
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // O(1) Lookup Map for Barcodes derived from allProducts
  const barcodeMap = useMemo(() => {
    const map = new Map<string, Product>();
    allProducts.forEach(p => {
      if (p.barcode) map.set(p.barcode, p);
    });
    return map;
  }, [allProducts]);

  // Filtering products
  const filteredProducts = useMemo(() => {
    let result = allProducts;
    
    // 1. Filter by Category
    if (selectedCategory !== 'todos') {
      result = result.filter(p => p.categories?.includes(selectedCategory));
    }
    
    // 2. Filter by Search
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.barcode?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [allProducts, selectedCategory, debouncedSearch]);

  const checkLowStock = useCallback((product: Product) => {
    if (product.stock_quantity <= 0) {
      showToast(`${product.name} sin stock`, 'error');
      return false;
    }
    return true;
  }, [showToast]);

  const handleBarcodeBuffer = useCallback((text: string) => {
    // text is the current value of the input
    barcodeBufferRef.current = text;
    setDisplayBarcodeBuffer(text);

    if (bufferTimeoutRef.current) {
      clearTimeout(bufferTimeoutRef.current);
    }

    // Enter/Newline detected (standard for most hardware scanners)
    if (text.includes('\n') || text.includes('\r')) {
      const barcode = text.replace(/[\n\r]/g, '').trim();
      processBarcode(barcode);
      return;
    }

    // Fallback for scanners that don't send Enter
    bufferTimeoutRef.current = setTimeout(() => {
      processBarcode(barcodeBufferRef.current.trim());
    }, 50); // Faster timeout for scanner input
  }, [allProducts, barcodeMap]); // Only depend on static-ish data

  const processBarcode = useCallback((barcode: string) => {
    if (!barcode) return;
    
    const product = barcodeMap.get(barcode);
    if (product) {
      if (checkLowStock(product)) {
        addItem(product);
        showToast(`Agregado: ${product.name}`, 'success');
      }
    } else if (barcode.length >= 3) {
      showToast(`Producto no encontrado: ${barcode}`, 'error');
    }
    
    barcodeBufferRef.current = '';
    setDisplayBarcodeBuffer('');
  }, [addItem, showToast, checkLowStock, barcodeMap]);

  useEffect(() => {
    const timer = setTimeout(() => barcodeInputRef.current?.focus(), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleBarcodeBlur = useCallback(() => {
    if (!searchQuery && items.length > 0) {
      setTimeout(() => barcodeInputRef.current?.focus(), 500);
    }
  }, [searchQuery, items.length]);

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

  const getTotal = useCartStore((state) => state.getTotal);
  const ivaEnabled = useSettingsStore((state) => state.ivaEnabled);
  const subtotal = useMemo(() => getTotal(), [items, getTotal]);
  const finalTotal = ivaEnabled ? subtotal * 1.16 : subtotal;

  return (
    <View style={[styles.main, isMobile && { flexDirection: 'column' }]}>
      <TextInput
        ref={barcodeInputRef}
        style={styles.hiddenInput}
        value={displayBarcodeBuffer}
        onChangeText={handleBarcodeBuffer}
        onBlur={handleBarcodeBlur}
        autoFocus
        showSoftInputOnFocus={false}
        autoCapitalize="none"
        autoCorrect={false}
      />
      
      <View style={[styles.leftPanel, isMobile && { flex: 1 }]}>
        <Animated.View style={[styles.tabsContainer, {
          position: 'absolute',
          top: TOTAL_NAV_HEIGHT + verticalScale(8),
          left: scale(8),
          right: scale(8),
          zIndex: 10,
          transform: [{ 
            translateY: headerTranslateY.interpolate({
              inputRange: [-(TOTAL_NAV_HEIGHT + verticalScale(8)), 0],
              outputRange: [-(TOTAL_NAV_HEIGHT - verticalScale(4)), 0],
              extrapolate: 'clamp'
            }) 
          }],
          backgroundColor: tokens.styles.liquidCard.backgroundColor,
          borderRadius: tokens.styles.liquidCard.borderRadius,
          borderWidth: tokens.styles.liquidCard.borderWidth,
          borderColor: tokens.styles.liquidCard.borderColor,
          overflow: 'hidden',
        }]}>
          <AppBlurView
            tint="dark"
            intensity={80}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.islandContent}>
            <CategoryTabs 
              selected={selectedCategory} 
              onSelect={setSelectedCategory} 
            />
            <View style={styles.islandSearchContainer}>
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
                  <Badge variant="mahogany">{filteredProducts.length}</Badge>
                )}
              </View>
            </View>
          </View>
        </Animated.View>

        <View style={styles.productsContainer}>
          {isLoading ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.productGrid,
                { 
                  paddingTop: TOTAL_NAV_HEIGHT + verticalScale(210), 
                  paddingBottom: verticalScale(20) + insets.bottom 
                }
              ]}
            >
              <SkeletonItem layout={isMobile ? 'row' : 'card'} count={isMobile ? 8 : 12} />
            </ScrollView>
          ) : (
            <AnimatedFlashList
              key={`products-grid-${numColumns}`}
              data={filteredProducts}
              numColumns={numColumns}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              estimatedItemSize={ITEM_HEIGHT}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: globalScrollY } } }],
                { useNativeDriver: true }
              )}
              scrollEventThrottle={16}
              contentContainerStyle={[
                styles.productGrid,
                {
                  paddingTop: TOTAL_NAV_HEIGHT + verticalScale(210),
                  paddingBottom: (isMobile && items.length > 0 ? verticalScale(96) : verticalScale(20)) + insets.bottom
                }
              ]}
              ListHeaderComponent={
                <View style={{ height: verticalScale(16) }} />
              }
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={false} onRefresh={refetch} tintColor={tokens.colors.mahogany} />
              }
              ListEmptyComponent={ListEmptyComponent}
            />
          )}
        </View>
        
        {!isMobile && (
          <View style={styles.actionsContainer}>
            <QuickActions onClear={handleClearCart} hasItems={items.length > 0} />
          </View>
        )}

        {isMobile && items.length > 0 && (
          <View style={[styles.mobileActionBar, { bottom: verticalScale(10) + insets.bottom }]}>
            <QuickActions onClear={handleClearCart} hasItems={items.length > 0} compact />
            <TouchableOpacity 
              style={styles.mobileCheckoutBtn} 
              onPress={() => setShowMobileCart(true)}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['rgba(184, 123, 90, 0.95)', 'rgba(139, 90, 60, 0.95)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.checkoutBtnContent}>
                <Icon name="shopping-cart" size={24} color="#F0F0F2" />
                <Text style={styles.mobileFabText}>Carrito ({items.length})</Text>
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
          onRequestClose={() => setShowMobileCart(false)}
        >
          <View style={styles.mobileCartOverlay}>
             <CheckoutPanel onCloseMobile={() => setShowMobileCart(false)} />
          </View>
        </Modal>
      ) : (
        <View style={styles.rightPanel}><CheckoutPanel /></View>
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
    marginHorizontal: scale(20),
    marginTop: verticalScale(24),
    borderRadius: tokens.radius.xl,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    // Glass highlight for depth
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    borderLeftColor: 'rgba(255, 255, 255, 0.08)',
  },
  islandContent: {
    paddingBottom: verticalScale(18),
  },
  islandSearchContainer: {
    paddingHorizontal: scale(16),
    marginTop: verticalScale(4), // Space after tabs
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)', // Subtle separator
    paddingTop: verticalScale(16),
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: tokens.radius.pill,
    paddingHorizontal: scale(18),
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: scale(12),
    height: verticalScale(54),
  },
  searchInput: {
    flex: 1,
    color: tokens.colors.text,
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(15),
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
    paddingHorizontal: tokens.layout.gutter,
    paddingVertical: verticalScale(16),
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
