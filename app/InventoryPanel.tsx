import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SkeletonItem } from '../components/SkeletonItem';
import { Badge } from '../components/Badge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Text } from '../components/Text';
import { CachedImage } from '../components/CachedImage';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { Product, useSettingsStore } from '../store/cartStore';
import { FontNames } from '../lib/fontNames';
import { pickFromCamera, pickFromGallery, uploadProductImage, deleteProductImage } from '../lib/imageUpload';
import { Icon } from '../components/Icon';
import { ImagePickerModal } from '../components/ImagePickerModal';
import { useToast } from '../components/Toast';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale, moderateScale } from '../lib/responsive';

interface EditState {
  id: string;
  name: string;
  price: string;
  cost: string;
  stock: string;
  categories: string[];
  barcode: string;
  image_url?: string;
  newImageUri?: string;
}

interface NewProductState {
  name: string;
  price: string;
  cost: string;
  stock: string;
  categories: string[];
  barcode: string;
  imageUri?: string;
}

export const InventoryPanel = memo(function InventoryPanel({ 
  readOnly = false,
  onSuccess 
}: { 
  readOnly?: boolean;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<EditState | null>(null);
  const [newProduct, setNewProduct] = useState<NewProductState>({ name: '', price: '', cost: '', stock: '', categories: [], barcode: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [imagePickerTarget, setImagePickerTarget] = useState<'new' | 'edit'>('new');
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isAddingQuickCat, setIsAddingQuickCat] = useState<'new' | 'edit' | null>(null);
  const [quickCatText, setQuickCatText] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const categories = useSettingsStore((state) => state.categories);
  const addCategory = useSettingsStore((state) => state.addCategory);
  const removeCategory = useSettingsStore((state) => state.removeCategory);

  const PAGE_SIZE = 25;

  const { 
    data, 
    isLoading, 
    isError, 
    refetch, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useInfiniteQuery({
    queryKey: ['inventory-products'],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_categories (
            category:categories(name)
          )
        `)
        .eq('is_active', true)
        .order('name')
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);
      
      if (error) throw error;
      
      return (data || []).map(p => ({
        ...p,
        categories: p.product_categories?.map((pc: any) => pc.category.name) || []
      }));
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === PAGE_SIZE ? allPages.length : undefined;
    },
  });

  const products = useMemo(() => data?.pages.flat() ?? [], [data]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!debouncedSearch.trim()) return products;
    const s = debouncedSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        p.categories.some((c: string) => c.toLowerCase().includes(s)) ||
        p.barcode?.toLowerCase().includes(s)
    );
  }, [products, debouncedSearch]);

  const updateMutation = useMutation({
    mutationFn: async (item: EditState) => {
      // 1. Barcode uniqueness check (excluding self)
      if (item.barcode) {
        const duplicate = products.find(p => p.barcode === item.barcode && p.id !== item.id);
        if (duplicate) {
          throw new Error(`El código ${item.barcode} ya lo tiene "${duplicate.name}"`);
        }
      }

      const { error: deleteError } = await supabase
        .from('product_categories')
        .delete()
        .eq('product_id', item.id);
      if (deleteError) throw deleteError;

      for (const catName of item.categories) {
        const { data: catData } = await supabase
          .from('categories')
          .upsert({ name: catName }, { onConflict: 'name' })
          .select()
          .single();
        
        if (catData) {
          await supabase
            .from('product_categories')
            .insert({ product_id: item.id, category_id: catData.id });
        }
      }

      const updates: Record<string, any> = {
        name: item.name,
        price: parseFloat(item.price) || 0,
        cost: parseFloat(item.cost) || 0,
        stock_quantity: parseInt(item.stock) || 0,
        category: item.categories[0] || null,
      };
      
      if (item.barcode) {
        updates.barcode = item.barcode;
      }

      if (item.newImageUri) {
        const imageUrl = await uploadProductImage(item.newImageUri, item.id);
        if (imageUrl) {
          // If we had an old image, delete it from storage
          if (item.image_url) {
            await deleteProductImage(item.image_url);
          }
          updates.image_url = imageUrl;
        }
      }

      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      setEditing(null);
      showToast('Producto actualizado', 'success');
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error('Update Error:', error);
      showToast(error.message || 'No se pudo actualizar', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, imageUrl }: { id: string; imageUrl?: string }) => {
      // 1. Soft delete (Archive)
      const { error } = await supabase.from('products').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory-products'] }),
    onError: () => showToast('No se pudo eliminar', 'error'),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // 1. Barcode uniqueness check
      if (newProduct.barcode) {
        const duplicate = products.find(p => p.barcode === newProduct.barcode);
        if (duplicate) {
          throw new Error(`El código de barras ${newProduct.barcode} ya pertenece a "${duplicate.name}"`);
        }
      }

      const { data, error: insertError } = await supabase.from('products').insert({
        name: newProduct.name,
        price: parseFloat(newProduct.price) || 0,
        cost: parseFloat(newProduct.cost) || 0,
        stock_quantity: parseInt(newProduct.stock) || 0,
        barcode: newProduct.barcode || null,
        is_active: true,
        category: newProduct.categories[0]?.toLowerCase() || null,
      }).select().single();

      if (insertError) throw insertError;
      if (!data) throw new Error('No se creó el producto');

      for (const catName of newProduct.categories) {
        const { data: catData } = await supabase
          .from('categories')
          .upsert({ name: catName }, { onConflict: 'name' })
          .select()
          .single();
        
        if (catData) {
          await supabase
            .from('product_categories')
            .insert({ product_id: data.id, category_id: catData.id });
        }
      }

      if (newProduct.imageUri) {
        const imageUrl = await uploadProductImage(newProduct.imageUri, data.id);
        if (imageUrl) {
          await supabase.from('products').update({ image_url: imageUrl }).eq('id', data.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      setNewProduct({ name: '', price: '', cost: '', stock: '', categories: [], barcode: '' });
      setShowAddForm(false);
      showToast('Producto agregado', 'success');
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error('Create Error:', error);
      showToast(error.message || 'No se pudo crear el producto', 'error');
    },
  });

  const syncCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from('categories')
        .upsert({ name: name.toLowerCase() }, { onConflict: 'name' });
      if (error) throw error;
    },
    onError: (err: any) => {
      console.error('Category sync error:', err);
      showToast('Error al sincronizar categoría con la base de datos', 'error');
    }
  });

  const handleAddCategory = useCallback(async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    
    // 1. Update local state
    addCategory(name);
    setNewCategoryName('');
    
    // 2. Sync to DB
    syncCategoryMutation.mutate(name);
    
    showToast('Categoría agregada', 'success');
  }, [newCategoryName, addCategory, showToast, syncCategoryMutation]);

  const handleQuickAdd = useCallback(async (target: 'new' | 'edit') => {
    const name = quickCatText.trim();
    if (!name) {
      setIsAddingQuickCat(null);
      return;
    }
    
    if (categories.includes(name)) {
      // If it exists but not selected, just select it
      if (target === 'new') {
        if (!newProduct.categories.includes(name)) {
          setNewProduct(p => ({ ...p, categories: [...p.categories, name] }));
        }
      } else {
        if (editing && !editing.categories.includes(name)) {
          setEditing(e => e ? { ...e, categories: [...e.categories, name] } : null);
        }
      }
      setQuickCatText('');
      setIsAddingQuickCat(null);
      return;
    }

    addCategory(name);
    syncCategoryMutation.mutate(name);
    
    if (target === 'new') {
      setNewProduct(p => ({ ...p, categories: [...p.categories, name] }));
    } else {
      setEditing(e => e ? { ...e, categories: [...e.categories, name] } : null);
    }
    
    setQuickCatText('');
    setIsAddingQuickCat(null);
    showToast('Categoría creada', 'success');
  }, [quickCatText, categories, addCategory, syncCategoryMutation, showToast, newProduct.categories, editing]);

  const handleDeleteCategory = useCallback((cat: string) => {
    Alert.alert('Eliminar Categoría', `¿Eliminar "${cat}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => removeCategory(cat) },
    ]);
  }, [removeCategory]);

  const handleDelete = useCallback((id: string, name: string, imageUrl?: string) => {
    Alert.alert('Eliminar', `¿Eliminar "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteMutation.mutate({ id, imageUrl }) },
    ]);
  }, [deleteMutation]);

  const handlePickImage = useCallback((target: 'new' | 'edit') => {
    setImagePickerTarget(target);
    setShowImagePicker(true);
  }, []);

  const handleCamera = useCallback(async () => {
    const uri = await pickFromCamera();
    if (uri) {
      if (imagePickerTarget === 'new') {
        setNewProduct((p) => ({ ...p, imageUri: uri }));
      } else {
        setEditing((e) => e ? { ...e, newImageUri: uri } : null);
      }
    }
  }, [imagePickerTarget]);

  const handleGallery = useCallback(async () => {
    const uri = await pickFromGallery();
    if (uri) {
      if (imagePickerTarget === 'new') {
        setNewProduct((p) => ({ ...p, imageUri: uri }));
      } else {
        setEditing((e) => e ? { ...e, newImageUri: uri } : null);
      }
    }
  }, [imagePickerTarget]);

  const toggleCategory = useCallback((cat: string, isNew: boolean = false) => {
    if (isNew) {
      setNewProduct((p) => ({
        ...p,
        categories: p.categories.includes(cat)
          ? p.categories.filter((c) => c !== cat)
          : [...p.categories, cat],
      }));
    } else {
      setEditing((e) => e ? {
        ...e,
        categories: e.categories.includes(cat)
          ? e.categories.filter((c) => c !== cat)
          : [...e.categories, cat],
      } : null);
    }
  }, []);

  const startEdit = (product: Product) => {
    setEditing({
      id: product.id,
      name: product.name,
      price: String(product.price),
      cost: String(product.cost || 0),
      stock: String(product.stock_quantity),
      categories: product.categories || [],
      barcode: product.barcode || '',
      image_url: product.image_url,
    });
  };

  const saveEdit = () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      showToast('El nombre es requerido', 'warning');
      return;
    }
    if (editing.categories.length === 0) {
      showToast('Selecciona al menos una categoría', 'warning');
      return;
    }
    
    // Barcode uniqueness check for edit (exclude current product)
    if (editing.barcode) {
      const duplicate = products.find(p => p.barcode === editing.barcode && p.id !== editing.id);
      if (duplicate) {
        showToast(`El código "${editing.barcode}" ya existe en "${duplicate.name}"`, 'error');
        return;
      }
    }

    updateMutation.mutate(editing);
  };

  const renderItem = useCallback(({ item }: { item: Product }) => {
    if (editing?.id === item.id) {
      return (
        <View style={styles.editCard}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          
          <TouchableOpacity 
            style={styles.closeEditBtn} 
            onPress={() => setEditing(null)}
            activeOpacity={0.7}
          >
            <Icon name="close" size={24} color={tokens.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.imagePickerCard, { marginTop: verticalScale(52) }]} onPress={() => handlePickImage('edit')} activeOpacity={0.85}>
            <View style={styles.imagePickerThumb}>
              {editing.newImageUri || editing.image_url ? (
                <CachedImage
                  remoteUri={(editing.newImageUri || editing.image_url) as string}
                  style={styles.imagePickerThumbImg}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.imagePickerThumbEmpty}>
                  <Icon name="image" size={28} color={tokens.colors.mahogany} />
                </View>
              )}
              <View style={styles.imagePickerCamBadge}>
                <Icon name="camera" size={12} color="#FFF" />
              </View>
            </View>
            <View style={styles.imagePickerInfo}>
              <Text style={styles.imagePickerLabel}>Foto del producto</Text>
              <Text style={styles.imagePickerSub}>
                {editing.newImageUri ? 'Nueva foto seleccionada ✓' : editing.image_url ? 'Toca para cambiar imagen' : 'Toca para agregar imagen'}
              </Text>
            </View>
            <View style={styles.imagePickerArrow}>
              <Icon name="chevron-right" size={18} color={tokens.colors.textMuted} />
            </View>
          </TouchableOpacity>

          <Text style={styles.inputLabel}>Nombre</Text>
            <TextInput
            style={styles.input}
            value={editing.name}
            onChangeText={(v) => setEditing((e) => e ? { ...e, name: v } : null)}
            placeholder="Nombre del producto"
            placeholderTextColor={tokens.colors.textDim}
          />
          <View style={styles.row}>
            <View style={[styles.flex1, styles.formSection]}>
              <Text style={styles.inputLabel}>Precio Venta</Text>
              <TextInput
                style={styles.input}
                value={editing.price}
                onChangeText={(v) => setEditing((e) => e ? { ...e, price: v } : null)}
                placeholder="0.00"
                placeholderTextColor="#6A6A72"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.flex1, styles.formSection]}>
              <Text style={styles.inputLabel}>Costo</Text>
              <TextInput
                style={styles.input}
                value={editing.cost}
                onChangeText={(v) => setEditing((e) => e ? { ...e, cost: v } : null)}
                placeholder="0.00"
                placeholderTextColor="#6A6A72"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.flex1, styles.formSection]}>
              <Text style={styles.inputLabel}>Stock</Text>
              <TextInput
                style={styles.input}
                value={editing.stock}
                onChangeText={(v) => setEditing((e) => e ? { ...e, stock: v } : null)}
                placeholder="0"
                placeholderTextColor="#6A6A72"
                keyboardType="number-pad"
              />
            </View>
          </View>
          <Text style={styles.inputLabel}>Código de barras</Text>
          <TextInput
            style={styles.input}
            value={editing.barcode}
            onChangeText={(v) => setEditing((e) => e ? { ...e, barcode: v } : null)}
            placeholder="Opcional"
            placeholderTextColor="#6A6A72"
          />
          <Text style={styles.inputLabel}>Categorías</Text>
          <View style={styles.catRow}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.catBtn, editing.categories.includes(cat) && styles.catActive]}
                onPress={() => toggleCategory(cat)}
                activeOpacity={0.7}
              >
                {editing.categories.includes(cat) && (
                  <LinearGradient
                    colors={['rgba(184, 123, 90, 0.3)', 'rgba(184, 123, 90, 0.15)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <Text style={[styles.catText, editing.categories.includes(cat) && styles.catTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
            
            {isAddingQuickCat === 'edit' ? (
              <View style={styles.quickAddContainer}>
                <TextInput
                  style={styles.quickAddInput}
                  placeholder="Categoría..."
                  placeholderTextColor={tokens.colors.textDim}
                  value={quickCatText}
                  onChangeText={setQuickCatText}
                  autoFocus
                  onSubmitEditing={() => handleQuickAdd('edit')}
                />
                <TouchableOpacity onPress={() => handleQuickAdd('edit')} style={styles.quickAddActionBtn}>
                  <Icon name="check" size={18} color={tokens.colors.sage} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsAddingQuickCat(null)} style={styles.quickAddActionBtn}>
                  <Icon name="close" size={18} color={tokens.colors.coral} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.quickAddToggle} onPress={() => setIsAddingQuickCat('edit')}>
                <Icon name="plus" size={16} color={tokens.colors.mahogany} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.editActions}>
            {/* Primary: Guardar */}
            <TouchableOpacity
              style={[styles.saveBtn, updateMutation.isPending && styles.btnDisabled]}
              onPress={saveEdit}
              disabled={updateMutation.isPending}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[tokens.colors.mahogany, tokens.colors.mahoganyDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Icon name={updateMutation.isPending ? 'loader' : 'check'} size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>
                {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
              </Text>
            </TouchableOpacity>

            {/* Secondary row: Cancelar + Eliminar */}
            <View style={styles.editSecondaryRow}>
              <TouchableOpacity
                style={[styles.cancelBtnOutline, styles.flex1]}
                onPress={() => setEditing(null)}
                activeOpacity={0.7}
              >
                <Icon name="close" size={16} color={tokens.colors.textMuted} />
                <Text style={styles.cancelBtnOutlineText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.deleteBtnOutline, styles.flex1]}
                onPress={() => handleDelete(item.id, item.name, item.image_url)}
                activeOpacity={0.7}
              >
                <Icon name="trash" size={16} color={tokens.colors.coral} />
                <Text style={styles.deleteBtnOutlineText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity 
        style={styles.listItemWrapper} 
        onPress={() => startEdit(item)}
        activeOpacity={0.7}
      >
        <View style={styles.item}>
          <View style={styles.itemMainRow}>
            <View style={styles.itemImageCircle}>
              {item.image_url ? (
                <CachedImage 
                  remoteUri={item.image_url} 
                  style={styles.thumbImage} 
                  contentFit="cover" 
                />
              ) : (
                <View style={[styles.thumbPlaceholder, { backgroundColor: tokens.colors.mahoganyDim }]}>
                  <Text style={[styles.thumbPlaceholderText, { color: tokens.colors.mahogany }]}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
              <View style={styles.itemMeta}>
                <Text style={styles.itemPrice}>${Number(item.price).toFixed(2)}</Text>
                <View style={[styles.stockDotRow, { backgroundColor: item.stock_quantity < 10 ? tokens.colors.coralDim : 'rgba(255,255,255,0.05)', borderColor: item.stock_quantity < 10 ? tokens.colors.coralDim : 'rgba(255,255,255,0.1)' }]}>
                   <View style={[styles.stockDot, { backgroundColor: item.stock_quantity < 10 ? tokens.colors.coral : tokens.colors.sage }]} />
                   <Text style={[styles.itemStockText, { color: item.stock_quantity < 10 ? tokens.colors.coral : tokens.colors.textSecondary }]}>{item.stock_quantity} uds</Text>
                </View>
              </View>
            </View>

            <View style={styles.itemChevron}>
              <Icon name="chevron-right" size={20} color={tokens.colors.textMuted} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [editing, categories, readOnly, updateMutation.isPending, handlePickImage, toggleCategory, startEdit, handleDelete, saveEdit]);

  const ListHeader = useMemo(() => (
    <View style={{ marginBottom: verticalScale(16) }}>
      <View style={styles.inlineHeader}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.titleMini}>Inventario</Text>
        </View>
        <View style={styles.headerButtonsMini}>
           <TouchableOpacity style={styles.manageCatBtnMini} onPress={() => setShowCategoryManager(!showCategoryManager)}>
            <Icon name="folder" size={16} color={tokens.colors.text} />
            <Text style={styles.manageCatBtnTextMini}>Categorías</Text>
          </TouchableOpacity>
          {!readOnly && (
            <TouchableOpacity 
              style={styles.addBtnMini} 
              onPress={() => setShowAddForm(!showAddForm)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={showAddForm ? [tokens.colors.coral, tokens.colors.coral] : [tokens.colors.mahogany, tokens.colors.mahoganyDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Icon name={showAddForm ? 'close' : 'plus'} size={14} color="#FFF" />
              <Text style={styles.addBtnTextMini}>{showAddForm ? 'Cerrar' : 'Nuevo'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showCategoryManager && (

        <View style={styles.categoryManager}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.categoryManagerHeader}>
            <View style={styles.managerTitleRow}>
              <View style={styles.managerIconCircle}>
                <Icon name="folder" size={20} color={tokens.colors.mahogany} />
              </View>
              <Text style={styles.categoryManagerTitle}>Categorías</Text>
            </View>
            <TouchableOpacity onPress={() => setShowCategoryManager(false)} style={styles.closeManagerBtn}>
              <Icon name="close" size={20} color={tokens.colors.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={styles.addCategoryRow}>
            <TextInput
              style={styles.addCategoryInput}
              placeholder="Nueva categoría..."
              placeholderTextColor="#6A6A72"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
            />
            <TouchableOpacity style={styles.addCategoryBtn} onPress={handleAddCategory}>
              <Icon name="plus" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.catRow}>
            {categories.map((cat) => (
              <Badge 
                key={cat} 
                variant="neutral" 
                style={styles.catManageBadge}
              >
                <View style={styles.catManageContent}>
                  <Text style={styles.catManageText}>{cat}</Text>
                   <TouchableOpacity onPress={() => handleDeleteCategory(cat)} style={styles.catDeleteBtn}>
                    <Icon name="close" size={18} color="#C96B6B" />
                  </TouchableOpacity>
                </View>
              </Badge>
            ))}
          </View>
        </View>
      )}

      <View style={styles.searchRow}>
         <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color={tokens.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, código o categoría..."
            placeholderTextColor={tokens.colors.textDim}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={styles.countContainer}>
          <Badge variant="mahogany">
            {filteredProducts.length}
          </Badge>
        </View>
      </View>

      {showAddForm && !readOnly && (
        <View style={styles.addForm}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.addFormHeader}>
            <View style={styles.addFormTitleRow}>
              <View style={styles.addFormIconCircle}>
                <Icon name="plus" size={20} color={tokens.colors.mahogany} />
              </View>
              <Text style={styles.formTitle}>Nuevo Producto</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.imagePickerCard} onPress={() => handlePickImage('new')} activeOpacity={0.85}>
            <View style={styles.imagePickerThumb}>
              {newProduct.imageUri ? (
                <Image
                  source={{ uri: newProduct.imageUri }}
                  style={styles.imagePickerThumbImg}
                  transition={200}
                  cachePolicy="disk"
                />
              ) : (
                <View style={styles.imagePickerThumbEmpty}>
                  <Icon name="image" size={28} color={tokens.colors.mahogany} />
                </View>
              )}
              <View style={styles.imagePickerCamBadge}>
                <Icon name="camera" size={12} color="#FFF" />
              </View>
            </View>
            <View style={styles.imagePickerInfo}>
              <Text style={styles.imagePickerLabel}>Foto del producto</Text>
              <Text style={styles.imagePickerSub}>
                {newProduct.imageUri ? 'Imagen seleccionada ✓' : 'Toca para agregar una imagen'}
              </Text>
            </View>
            <View style={styles.imagePickerArrow}>
              <Icon name="chevron-right" size={18} color={tokens.colors.textMuted} />
            </View>
          </TouchableOpacity>

          <Text style={styles.inputLabel}>Nombre</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre del producto"
            placeholderTextColor="#6A6A72"
            value={newProduct.name}
            onChangeText={(v) => setNewProduct((p) => ({ ...p, name: v }))}
          />
          <View style={styles.row}>
            <View style={[styles.flex1, styles.formSection]}>
              <Text style={styles.inputLabel}>Precio Venta</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#6A6A72"
                keyboardType="decimal-pad"
                value={newProduct.price}
                onChangeText={(v) => setNewProduct((p) => ({ ...p, price: v }))}
              />
            </View>
            <View style={[styles.flex1, styles.formSection]}>
              <Text style={styles.inputLabel}>Costo</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#6A6A72"
                keyboardType="decimal-pad"
                value={newProduct.cost}
                onChangeText={(v) => setNewProduct((p) => ({ ...p, cost: v }))}
              />
            </View>
            <View style={[styles.flex1, styles.formSection]}>
              <Text style={styles.inputLabel}>Stock</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#6A6A72"
                keyboardType="number-pad"
                value={newProduct.stock}
                onChangeText={(v) => setNewProduct((p) => ({ ...p, stock: v }))}
              />
            </View>
          </View>
          <Text style={styles.inputLabel}>Código de barras</Text>
          <TextInput
            style={styles.input}
            placeholder="Código de barras (opcional)"
            placeholderTextColor="#6A6A72"
            value={newProduct.barcode}
            onChangeText={(v) => setNewProduct((p) => ({ ...p, barcode: v }))}
          />
          <Text style={styles.inputLabel}>Categorías</Text>
          <View style={styles.catRow}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.catBtn, newProduct.categories.includes(cat) && styles.catActive]}
                onPress={() => toggleCategory(cat, true)}
                activeOpacity={0.7}
              >
                {newProduct.categories.includes(cat) && (
                  <LinearGradient
                    colors={['rgba(184, 123, 90, 0.3)', 'rgba(184, 123, 90, 0.15)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <Text style={[styles.catText, newProduct.categories.includes(cat) && styles.catTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}

            {isAddingQuickCat === 'new' ? (
              <View style={styles.quickAddContainer}>
                <TextInput
                  style={styles.quickAddInput}
                  placeholder="Categoría..."
                  placeholderTextColor={tokens.colors.textDim}
                  value={quickCatText}
                  onChangeText={setQuickCatText}
                  autoFocus
                  onSubmitEditing={() => handleQuickAdd('new')}
                />
                <TouchableOpacity onPress={() => handleQuickAdd('new')} style={styles.quickAddActionBtn}>
                  <Icon name="check" size={18} color={tokens.colors.sage} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsAddingQuickCat(null)} style={styles.quickAddActionBtn}>
                  <Icon name="close" size={18} color={tokens.colors.coral} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.quickAddToggle} onPress={() => setIsAddingQuickCat('new')}>
                <Icon name="plus" size={16} color={tokens.colors.mahogany} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.addFormActions}>
            {/* Primary Action: Crear Producto */}
            <TouchableOpacity
              style={[styles.saveBtn, (!newProduct.name || !newProduct.price || newProduct.categories.length === 0 || createMutation.isPending) && styles.btnDisabled]}
              onPress={() => createMutation.mutate()}
              disabled={!newProduct.name || !newProduct.price || newProduct.categories.length === 0 || createMutation.isPending}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={(!newProduct.name || !newProduct.price || newProduct.categories.length === 0)
                  ? ['rgba(184, 123, 90, 0.12)', 'rgba(184, 123, 90, 0.06)']
                  : [tokens.colors.mahogany, tokens.colors.mahoganyDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Icon
                name={createMutation.isPending ? 'loader' : 'plus'}
                size={18}
                color={(!newProduct.name || !newProduct.price || newProduct.categories.length === 0) ? tokens.colors.textDim : '#FFFFFF'}
              />
              <Text style={[styles.saveBtnText, (!newProduct.name || !newProduct.price || newProduct.categories.length === 0) && { color: tokens.colors.textDim }]}>
                {createMutation.isPending ? 'Guardando...' : 'Crear Producto'}
              </Text>
            </TouchableOpacity>

            {/* Secondary Action: Cancelar */}
            <TouchableOpacity
              style={styles.cancelBtnOutline}
              onPress={() => setShowAddForm(false)}
              activeOpacity={0.7}
            >
              <Icon name="close" size={16} color={tokens.colors.textMuted} />
              <Text style={styles.cancelBtnOutlineText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  ), [showCategoryManager, newCategoryName, categories, search, filteredProducts.length, showAddForm, readOnly, newProduct, createMutation.isPending, handleAddCategory, handleDeleteCategory, handlePickImage, toggleCategory, createMutation]);

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <LinearGradient
          colors={['rgba(10, 10, 12, 0.98)', 'rgba(10, 10, 12, 0.95)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        


        <FlashList
          ListHeaderComponent={ListHeader}
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: verticalScale(32) + insets.bottom }]}
          // @ts-ignore
          estimatedItemSize={scale(96)}
          ListEmptyComponent={() => {
            if (isLoading) {
              return (
                <View style={{ gap: verticalScale(12) }}>
                  <SkeletonItem layout="row" count={8} />
                </View>
              );
            }
            if (isError) {
              return (
                <View style={styles.emptyContainer}>
                  <Icon name="exclamation-triangle" size={48} color="#C96B6B" />
                  <Text style={[styles.empty, { color: '#C96B6B' }]}>Error al cargar productos</Text>
                  <TouchableOpacity 
                    style={styles.retryBtn} 
                    onPress={() => refetch()}
                    accessibilityLabel="Reintentar cargar productos"
                    accessibilityRole="button"
                  >
                    <Text style={styles.retryBtnText}>Reintentar</Text>
                  </TouchableOpacity>
                </View>
              );
            }
            return <Text style={styles.empty}>Sin productos</Text>;
          }}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => 
            isFetchingNextPage ? (
              <View style={{ paddingVertical: verticalScale(20) }}>
                <ActivityIndicator color={tokens.colors.mahogany} />
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />

        <ImagePickerModal
          visible={showImagePicker}
          onClose={() => setShowImagePicker(false)}
          onSelectCamera={handleCamera}
          onSelectGallery={handleGallery}
        />
      </View>
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: tokens.colors.bg,
  },
  inlineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(16),
    marginTop: verticalScale(8),
  },
  headerTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: scale(12),
  },
  titleMini: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(22),
    color: tokens.colors.text,
    fontWeight: '800',
  },
  headerButtonsMini: {
    flexDirection: 'row',
    gap: scale(8),
  },
  manageCatBtnMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(8),
    borderRadius: tokens.radius.lg,
    gap: scale(6),
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  manageCatBtnTextMini: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: tokens.colors.text,
  },
  addBtnMini: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
  },
  addBtnTextMini: {
    fontFamily: FontNames.instrumentSans,
    fontWeight: '800',
    fontSize: moderateScale(12),
    color: '#FFFFFF',
  },
  list: { 
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(8),
  },
  categoryManager: { 
    borderRadius: tokens.radius.xl, 
    padding: scale(20),
    marginBottom: verticalScale(20), 
    borderWidth: 1, 
    borderColor: tokens.colors.borderLight,
    overflow: 'hidden',
  },
  categoryManagerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  managerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  managerIconCircle: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: tokens.colors.mahoganyDim,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.mahogany,
  },
  closeManagerBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryManagerTitle: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(16), 
    fontWeight: '800', 
    color: tokens.colors.text, 
  },
  addCategoryRow: { 
    flexDirection: 'row', 
    gap: scale(10), 
    marginBottom: verticalScale(16),
  },
  addCategoryInput: { 
    flex: 1, 
    backgroundColor: 'rgba(255, 255, 255, 0.03)', 
    color: tokens.colors.text, 
    padding: scale(14), 
    borderRadius: tokens.radius.lg, 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(14), 
    borderWidth: 1, 
    borderColor: tokens.colors.borderLight,
  },
  addCategoryBtn: { 
    backgroundColor: tokens.colors.sage, 
    paddingHorizontal: scale(14), 
    borderRadius: tokens.radius.lg, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  catManageBadge: {
    marginRight: scale(8),
    marginBottom: verticalScale(8),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: tokens.radius.pill,
  },
  catManageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  catDeleteBtn: {
    padding: scale(4),
    backgroundColor: 'rgba(201, 107, 107, 0.1)',
    borderRadius: scale(6),
  },
  catManageText: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(13), 
    fontWeight: '700',
    color: tokens.colors.text,
  },
  searchRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: verticalScale(20),
    gap: scale(12),
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: tokens.radius.pill,
    paddingHorizontal: scale(16),
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    gap: scale(12),
  },
  searchInput: { 
    flex: 1,
    color: tokens.colors.text, 
    paddingVertical: verticalScale(14), 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  countContainer: {
    marginLeft: scale(4),
  },
  addForm: { 
    borderRadius: tokens.radius.xl, 
    padding: scale(20),
    marginBottom: verticalScale(24), 
    borderWidth: 1, 
    borderColor: tokens.colors.borderLight,
    overflow: 'hidden',
  },
  addFormHeader: {
    marginBottom: verticalScale(16),
  },
  addFormTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  addFormIconCircle: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: tokens.colors.mahoganyDim,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.mahogany,
  },
  addFormActions: {
    marginTop: verticalScale(24),
  },
  formTitle: { 
    color: tokens.colors.text, 
    fontFamily: FontNames.instrumentSans, 
    fontWeight: '800', 
    fontSize: moderateScale(18), 
  },
  inputLabel: { 
    color: tokens.colors.textMuted, 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(11), 
    marginBottom: verticalScale(4), 
    fontWeight: '800', 
    textTransform: 'uppercase', 
    letterSpacing: 1,
  },
  input: { 
    backgroundColor: 'rgba(255, 255, 255, 0.03)', 
    color: tokens.colors.text, 
    padding: scale(14),
    borderRadius: tokens.radius.lg,
    marginBottom: verticalScale(16),
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    fontFamily: FontNames.instrumentSans,
    fontWeight: '600',
  },
  row: { 
    flexDirection: 'row', 
    marginHorizontal: scale(-6), 
    flexWrap: 'wrap' 
  },
  flex1: { 
    flex: 1, 
    marginHorizontal: scale(6), 
    minWidth: scale(100) 
  },
  formSection: { 
    marginBottom: verticalScale(4) 
  },
  catRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    marginBottom: verticalScale(20), 
    marginTop: verticalScale(4),
    gap: scale(8),
  },
  catBtn: { 
    paddingHorizontal: scale(14), 
    paddingVertical: verticalScale(10), 
    borderRadius: tokens.radius.lg, 
    backgroundColor: 'rgba(255, 255, 255, 0.03)', 
    borderWidth: 1, 
    borderColor: tokens.colors.borderLight, 
    overflow: 'hidden',
    minHeight: verticalScale(42),
    justifyContent: 'center',
  },
  catActive: { 
    backgroundColor: 'transparent',
    borderColor: tokens.colors.mahogany,
  },
  quickAddToggle: {
    width: verticalScale(42),
    height: verticalScale(42),
    borderRadius: tokens.radius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAddContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.mahogany,
    paddingRight: scale(4),
    height: verticalScale(42),
    minWidth: scale(180),
    flexGrow: 1,
  },
  quickAddInput: {
    flex: 1,
    paddingHorizontal: scale(14),
    color: tokens.colors.text,
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    fontWeight: '700',
    height: '100%',
  },
  quickAddActionBtn: {
    padding: scale(6),
    marginLeft: scale(4),
  },
  catText: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(13), 
    fontWeight: '700',
    color: tokens.colors.textMuted,
  },
  catTextActive: { 
    color: tokens.colors.text,
  },
  saveBtn: { 
    height: verticalScale(50),
    borderRadius: tokens.radius.lg, 
    alignItems: 'center',
    flexDirection: 'row',
    gap: scale(8),
    justifyContent: 'center',
    overflow: 'hidden',
  },
  btnDisabled: { 
    opacity: 0.5,
  },
  saveBtnText: { 
    fontFamily: FontNames.instrumentSans, 
    fontWeight: '800', 
    fontSize: moderateScale(16), 
    color: '#FFFFFF',
  },
  listItemWrapper: { 
    marginBottom: verticalScale(12),
    borderRadius: tokens.radius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    overflow: 'hidden',
  },
  item: { 
    padding: scale(16), 
  },
  itemMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(14),
  },
  itemImageCircle: { 
    width: scale(56), 
    height: scale(56), 
    borderRadius: scale(28), 
    overflow: 'hidden', 
    backgroundColor: tokens.colors.bg,
    borderWidth: 1, 
    borderColor: tokens.colors.borderLight,
  },
  thumbImage: { width: '100%', height: '100%' },
  thumbPlaceholder: { 
    flex: 1,
    justifyContent: 'center', 
    alignItems: 'center',
  },
  thumbPlaceholderText: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(20), 
    fontWeight: '800',
  },
  itemInfo: { flex: 1 },
  itemName: { 
    fontFamily: FontNames.instrumentSans, 
    color: tokens.colors.text, 
    fontSize: moderateScale(16), 
    fontWeight: '700', 
    marginBottom: verticalScale(4) 
  },
  itemMeta: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: scale(12),
  },
  itemPrice: { 
    fontFamily: FontNames.jetBrainsMono, 
    color: tokens.colors.mahogany, 
    fontSize: moderateScale(15),
    fontWeight: '800',
  },
  stockDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  stockDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
  },
  itemStockText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(12),
    fontWeight: '800',
    color: tokens.colors.textSecondary,
  },
  itemChevron: {
    marginLeft: scale(4),
  },
  editCard: { 
    borderRadius: tokens.radius.xl, 
    padding: scale(20),
    marginBottom: verticalScale(24),
    borderWidth: 1.5, 
    borderColor: tokens.colors.mahogany, 
    overflow: 'hidden',
  },
  closeEditBtn: {
    position: 'absolute',
    top: scale(16),
    right: scale(16),
    zIndex: 10,
    padding: scale(8),
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: tokens.radius.pill,
  },
  // --- Compact image picker card (shared by edit + new) ---
  imagePickerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    padding: scale(12),
    marginBottom: verticalScale(18),
    gap: scale(14),
  },
  imagePickerThumb: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(12),
    overflow: 'hidden',
    position: 'relative',
  },
  imagePickerThumbImg: {
    width: '100%',
    height: '100%',
  },
  imagePickerThumbEmpty: {
    flex: 1,
    backgroundColor: tokens.colors.mahoganyDim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerCamBadge: {
    position: 'absolute',
    bottom: scale(4),
    right: scale(4),
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    backgroundColor: tokens.colors.mahogany,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerInfo: {
    flex: 1,
    gap: verticalScale(4),
  },
  imagePickerLabel: {
    color: tokens.colors.text,
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    fontWeight: '700',
  },
  imagePickerSub: {
    color: tokens.colors.textMuted,
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(12),
    fontWeight: '500',
  },
  imagePickerArrow: {
    padding: scale(4),
  },
  editActions: { 
    marginTop: verticalScale(24),
    gap: verticalScale(16),
  },
  editSecondaryRow: {
    flexDirection: 'row',
    gap: scale(16),
  },
  cancelBtnOutline: {
    height: verticalScale(44),
    borderRadius: tokens.radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  cancelBtnOutlineText: {
    fontFamily: FontNames.instrumentSans,
    fontWeight: '700',
    fontSize: moderateScale(13),
    color: tokens.colors.textMuted,
  },
  deleteBtnOutline: {
    height: verticalScale(44),
    borderRadius: tokens.radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    backgroundColor: 'rgba(201, 107, 107, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(201, 107, 107, 0.35)',
  },
  deleteBtnOutlineText: {
    fontFamily: FontNames.instrumentSans,
    fontWeight: '700',
    fontSize: moderateScale(13),
    color: tokens.colors.coral,
  },
  // Legacy (kept for safety, unused)
  deleteBtnInline: {
    height: verticalScale(48),
    borderRadius: tokens.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(10),
    overflow: 'hidden',
  },
  deleteBtnTextInline: {
    fontFamily: FontNames.instrumentSans,
    fontWeight: '800',
    fontSize: moderateScale(14),
    color: '#FFFFFF',
  },
  cancelBtn: { 
    height: verticalScale(48),
    alignItems: 'center', 
    justifyContent: 'center',
    marginTop: verticalScale(12),
  },
  cancelBtnText: { 
    color: tokens.colors.textMuted, 
    fontFamily: FontNames.instrumentSans, 
    fontWeight: '700', 
    fontSize: moderateScale(15) 
  },
  // (addImageSection styles merged into imagePickerCard above)
  empty: { 
    color: tokens.colors.textMuted, 
    fontFamily: FontNames.instrumentSans, 
    textAlign: 'center', 
    marginTop: verticalScale(60),
    fontWeight: '700',
  },
  retryBtn: {
    backgroundColor: tokens.colors.coralDim,
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.coral,
    marginTop: verticalScale(16),
  },
  retryBtnText: {
    color: tokens.colors.coral,
    fontFamily: FontNames.instrumentSans,
    fontWeight: '800',
    fontSize: moderateScale(14),
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(40),
  },
  addFormActions: { 
    marginTop: verticalScale(24),
    gap: verticalScale(16),
  },
  cancelAddBtn: { 
    height: verticalScale(48),
    alignItems: 'center', 
    justifyContent: 'center',
  },
});

