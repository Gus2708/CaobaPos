import React, { memo, useState, useCallback, useMemo, useEffect, useRef, createContext, useContext } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Text } from '../components/Text';
import { CachedImage } from '../components/CachedImage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const categories = useSettingsStore((state) => state.categories);
  const addCategory = useSettingsStore((state) => state.addCategory);
  const removeCategory = useSettingsStore((state) => state.removeCategory);

  const { data: products = [], isLoading, isError, refetch } = useQuery<Product[]>({
    queryKey: ['inventory-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_categories (
            category:categories(name)
          )
        `)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      
      return (data || []).map(p => ({
        ...p,
        categories: p.product_categories?.map((pc: any) => pc.category.name) || []
      }));
    },
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!debouncedSearch.trim()) return products;
    const s = debouncedSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        p.categories.some((c) => c.toLowerCase().includes(s)) ||
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

  const handleAddCategory = useCallback(() => {
    if (!newCategoryName.trim()) return;
    addCategory(newCategoryName.trim());
    setNewCategoryName('');
    showToast('Categoría agregada', 'success');
  }, [newCategoryName, addCategory, showToast]);

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
            colors={['rgba(10, 10, 12, 0.6)', 'rgba(10, 10, 12, 0.4)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.imageSection}>
            {editing.newImageUri || editing.image_url ? (
              <CachedImage 
                remoteUri={editing.newImageUri || editing.image_url} 
                style={styles.previewImage} 
                contentFit="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Icon name="camera" size={32} color="rgba(184, 123, 90, 0.4)" />
                <Text style={styles.imagePlaceholderText}>Sin imagen</Text>
              </View>
            )}
            <TouchableOpacity style={styles.imageButton} onPress={() => handlePickImage('edit')}>
              <LinearGradient
                colors={['rgba(184, 123, 90, 0.3)', 'rgba(184, 123, 90, 0.15)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.imageButtonText}>{editing.newImageUri ? 'Cambiar' : 'Agregar'} Imagen</Text>
            </TouchableOpacity>
          </View>

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
          </View>
          <View style={styles.editActions}>
            <TouchableOpacity style={styles.saveBtn} onPress={saveEdit} disabled={updateMutation.isPending}>
              <LinearGradient
                colors={['rgba(109, 184, 138, 0.85)', 'rgba(109, 184, 138, 0.7)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.saveBtnText}>{updateMutation.isPending ? '...' : 'Guardar Cambios'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(null)}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.listItemWrapper}>
        <LinearGradient
          colors={['rgba(10, 10, 12, 0.5)', 'rgba(10, 10, 12, 0.3)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.item}>
          <View style={styles.itemMainRow}>
            <View style={styles.itemImage}>
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
              <Text style={styles.itemName} numberOfLines={2}>
                {item.name}
              </Text>
              {item.barcode && (
                <Text style={styles.itemBarcode} numberOfLines={1}>
                  {item.barcode}
                </Text>
              )}
              <View style={styles.itemMeta}>
                <Text style={styles.itemPrice}>${Number(item.price).toFixed(2)}</Text>
                <View style={[styles.stockBadge, item.stock_quantity < 10 && styles.stockLow]}>
                  <Text style={[styles.stockText, item.stock_quantity < 10 && styles.stockTextLow]}>
                    {item.stock_quantity} uds
                  </Text>
                </View>
              </View>
              <View style={styles.catTags}>
                {item.categories?.map((cat) => (
                  <View key={cat} style={styles.catTag}>
                    <Text style={styles.catTagText} numberOfLines={1}>
                      {cat}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
          {!readOnly && (
            <View style={styles.itemActions}>
              <TouchableOpacity style={styles.editBtn} onPress={() => startEdit(item)}>
                <Text style={styles.btnText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item.id, item.name, item.image_url)}>
                <Text style={styles.btnText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }, [editing, categories, readOnly, updateMutation.isPending, handlePickImage, toggleCategory, startEdit, handleDelete, saveEdit]);

  const ListHeader = useMemo(() => (
    <View style={{ marginBottom: verticalScale(16) }}>
      {showCategoryManager && (
        <View style={styles.categoryManager}>
          <LinearGradient
            colors={['rgba(10, 10, 12, 0.6)', 'rgba(10, 10, 12, 0.4)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.categoryManagerTitle}>Gestionar Categorías</Text>
          <View style={styles.addCategoryRow}>
            <TextInput
              style={styles.addCategoryInput}
              placeholder="Nueva categoría..."
              placeholderTextColor="#6A6A72"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
            />
            <TouchableOpacity style={styles.addCategoryBtn} onPress={handleAddCategory}>
              <Icon name="plus" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.catRow}>
            {categories.map((cat) => (
              <View key={cat} style={styles.catManageItem}>
                <Text style={styles.catManageText}>{cat}</Text>
                <TouchableOpacity onPress={() => handleDeleteCategory(cat)}>
                  <Icon name="close" size={16} color="#C96B6B" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.searchRow}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={18} color={tokens.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar producto..."
            placeholderTextColor={tokens.colors.textDim}
            value={search}
            onChangeText={setSearch}
            accessibilityLabel="Buscar productos"
            accessibilityRole="search"
          />
        </View>
        <Text style={styles.count} accessibilityLabel={`${filteredProducts.length} productos encontrados`}>
          {filteredProducts.length}
        </Text>
      </View>

      {showAddForm && !readOnly && (
        <View style={styles.addForm}>
          <LinearGradient
            colors={['rgba(10, 10, 12, 0.6)', 'rgba(10, 10, 12, 0.4)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.formTitle}>Nuevo Producto</Text>
          
          <TouchableOpacity style={styles.addImageSection} onPress={() => handlePickImage('new')}>
            {newProduct.imageUri ? (
              <Image 
                source={{ uri: newProduct.imageUri }} 
                style={styles.addImagePreview} 
                transition={200}
                cachePolicy="disk"
              />
            ) : (
              <View style={styles.addImagePlaceholder}>
                <Icon name="camera" size={32} color="rgba(184, 123, 90, 0.5)" />
                <Text style={styles.addImagePlaceholderText}>Agregar Imagen</Text>
              </View>
            )}
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
          </View>
          <View style={styles.addFormActions}>
            <TouchableOpacity
              style={[styles.saveBtn, (!newProduct.name || !newProduct.price || newProduct.categories.length === 0) && styles.btnDisabled]}
              onPress={() => createMutation.mutate()}
              disabled={!newProduct.name || !newProduct.price || newProduct.categories.length === 0 || createMutation.isPending}
            >
              <LinearGradient
                colors={(!newProduct.name || !newProduct.price || newProduct.categories.length === 0) 
                  ? ['rgba(109, 184, 138, 0.5)', 'rgba(109, 184, 138, 0.4)']
                  : ['rgba(109, 184, 138, 0.85)', 'rgba(109, 184, 138, 0.7)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.saveBtnText}>
                {createMutation.isPending ? 'Guardando...' : 'Crear Producto'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelAddBtn} onPress={() => setShowAddForm(false)}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
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
        
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.titleIcon}>
              <Icon name="folder" size={20} color="#B87B5A" />
            </View>
            <Text style={styles.title}>Inventario</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.manageCatBtn} onPress={() => setShowCategoryManager(!showCategoryManager)}>
              <Icon name="folder" size={14} color="#F0F0F2" />
              <Text style={styles.manageCatBtnText}>Categorías</Text>
            </TouchableOpacity>
            {!readOnly && (
              <TouchableOpacity 
                style={styles.addBtn} 
                onPress={() => setShowAddForm(!showAddForm)}
                accessibilityLabel={showAddForm ? 'Cerrar formulario de agregar' : 'Agregar nuevo producto'}
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={showAddForm ? ['rgba(201, 107, 107, 0.8)', 'rgba(201, 107, 107, 0.6)'] : ['rgba(184, 123, 90, 0.85)', 'rgba(139, 90, 60, 0.7)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.addBtnText}>{showAddForm ? 'Cerrar' : '+ Agregar'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <FlatList
          ListHeaderComponent={ListHeader}
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: verticalScale(32) + insets.bottom }]}
          ListEmptyComponent={() => {
            if (isLoading) return null;
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
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
        />

        {isLoading && (
          <ActivityIndicator size="large" color="#B87B5A" style={styles.loader} />
        )}

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
    position: 'relative',
    backgroundColor: tokens.colors.bg,
    padding: scale(16),
  },
  header: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    gap: scale(12),
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: verticalScale(16),
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  titleIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: 'rgba(184, 123, 90, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.2)',
  },
  title: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(22), 
    color: '#F0F0F2', 
    fontWeight: '700', 
    letterSpacing: scale(1),
  },
  headerButtons: { 
    flexDirection: 'row', 
    gap: scale(10),
  },
  manageCatBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255, 255, 255, 0.04)', 
    paddingHorizontal: scale(14), 
    paddingVertical: verticalScale(10), 
    borderRadius: scale(12), 
    gap: scale(6), 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.08)',
    minHeight: verticalScale(44),
  },
  manageCatBtnText: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(13), 
    fontWeight: '600', 
    color: '#F0F0F2',
  },
  addBtn: { 
    position: 'relative',
    paddingHorizontal: scale(16), 
    paddingVertical: verticalScale(10), 
    borderRadius: scale(12),
    minHeight: verticalScale(44),
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.3)',
  },
  addBtnText: { 
    fontFamily: FontNames.instrumentSans, 
    fontWeight: '600', 
    fontSize: moderateScale(14), 
    color: '#F0F0F2',
  },
  categoryManager: { 
    position: 'relative',
    backgroundColor: 'rgba(10, 10, 12, 0.5)',
    padding: scale(16), 
    borderRadius: scale(20), 
    marginBottom: verticalScale(16), 
    borderWidth: 1, 
    borderColor: 'rgba(184, 123, 90, 0.15)',
    overflow: 'hidden',
  },
  categoryManagerTitle: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(14), 
    fontWeight: '600', 
    color: '#F0F0F2', 
    marginBottom: verticalScale(12),
  },
  addCategoryRow: { 
    flexDirection: 'row', 
    gap: scale(10), 
    marginBottom: verticalScale(12),
  },
  addCategoryInput: { 
    flex: 1, 
    backgroundColor: 'rgba(255, 255, 255, 0.04)', 
    color: '#F0F0F2', 
    padding: scale(14), 
    borderRadius: scale(12), 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(14), 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.08)',
  },
  addCategoryBtn: { 
    backgroundColor: 'rgba(109, 184, 138, 0.8)', 
    paddingHorizontal: scale(16), 
    borderRadius: scale(12), 
    justifyContent: 'center', 
    alignItems: 'center',
    minWidth: scale(50),
  },
  catManageItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: 'rgba(255, 255, 255, 0.04)', 
    paddingHorizontal: scale(14), 
    paddingVertical: verticalScale(10), 
    borderRadius: scale(12), 
    marginRight: scale(8), 
    marginBottom: verticalScale(8), 
    minWidth: scale(120),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  catManageText: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(13), 
    color: '#F0F0F2',
  },
  searchRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: verticalScale(16),
    gap: scale(12),
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.bg,
    borderRadius: scale(14),
    paddingHorizontal: scale(14),
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.15)',
    gap: scale(10),
  },
  searchInput: { 
    flex: 1,
    backgroundColor: 'transparent',
    color: '#F0F0F2', 
    paddingVertical: verticalScale(14), 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(15),
  },
  count: { 
    color: '#B87B5A', 
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(12),
    fontWeight: '600',
    backgroundColor: 'rgba(184, 123, 90, 0.15)',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(8),
  },
  loader: { marginTop: verticalScale(40) },
  addForm: { 
    position: 'relative',
    backgroundColor: tokens.colors.bg,
    padding: scale(22), 
    borderRadius: scale(24), 
    marginBottom: verticalScale(16), 
    borderWidth: 1, 
    borderColor: 'rgba(184, 123, 90, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  formTitle: { 
    color: '#F0F0F2', 
    fontFamily: FontNames.instrumentSans, 
    fontWeight: '600', 
    fontSize: moderateScale(20), 
    marginBottom: verticalScale(20),
  },
  input: { 
    backgroundColor: 'rgba(255, 255, 255, 0.04)', 
    color: '#F0F0F2', 
    padding: scale(14), 
    borderRadius: scale(12), 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(15), 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: verticalScale(16),
  },
  inputLabel: { 
    color: '#B0B0B8', 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(12), 
    marginBottom: verticalScale(8), 
    fontWeight: '600', 
    textTransform: 'uppercase', 
    letterSpacing: scale(0.5),
  },
  row: { flexDirection: 'row', marginHorizontal: scale(-6), flexWrap: 'wrap' },
  flex1: { flex: 1, flexGrow: 1, marginHorizontal: scale(6), minWidth: scale(130) },
  formSection: { marginBottom: verticalScale(4) },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: verticalScale(20), marginTop: verticalScale(4) },
  catBtn: { 
    position: 'relative',
    paddingHorizontal: scale(16), 
    paddingVertical: verticalScale(10), 
    borderRadius: scale(14), 
    backgroundColor: 'rgba(255, 255, 255, 0.03)', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.06)', 
    marginRight: scale(10), 
    marginBottom: verticalScale(8),
    overflow: 'hidden',
    minHeight: verticalScale(44),
    justifyContent: 'center',
  },
  catActive: { 
    backgroundColor: 'transparent',
    borderColor: 'rgba(184, 123, 90, 0.4)',
  },
  catText: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(13), 
    color: '#8A8A96',
  },
  catTextActive: { 
    fontWeight: '600', 
    color: '#F0F0F2',
  },
  saveBtn: { 
    position: 'relative',
    padding: scale(16), 
    borderRadius: scale(14), 
    alignItems: 'center', 
    borderWidth: 1,
    borderColor: 'rgba(109, 184, 138, 0.4)',
    overflow: 'hidden',
    minHeight: verticalScale(52),
    justifyContent: 'center',
  },
  btnDisabled: { 
    opacity: 0.5,
  },
  saveBtnText: { 
    fontFamily: FontNames.instrumentSans, 
    fontWeight: '700', 
    fontSize: moderateScale(15), 
    color: '#FFFFFF',
  },
  list: { paddingBottom: verticalScale(20) },
  listItemWrapper: { 
    position: 'relative',
    marginBottom: verticalScale(10),
    borderRadius: scale(18),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  item: { 
    backgroundColor: tokens.colors.bg,
    padding: scale(14), 
    borderRadius: scale(18),
    flexDirection: 'column', 
  },
  itemMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  itemImage: { 
    width: scale(64), 
    height: scale(64), 
    marginRight: scale(14), 
    borderRadius: scale(14), 
    overflow: 'hidden', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.08)' 
  },
  thumbImage: { width: '100%', height: '100%' },
  thumbPlaceholder: { 
    width: '100%', 
    height: '100%', 
    justifyContent: 'center', 
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  thumbPlaceholderText: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(26), 
    color: tokens.colors.mahogany, 
    fontWeight: '700',
  },
  itemInfo: { flex: 1 },
  itemName: { 
    fontFamily: FontNames.instrumentSans, 
    color: tokens.colors.text, 
    fontSize: moderateScale(15), 
    fontWeight: '600', 
    marginBottom: verticalScale(2) 
  },
  itemBarcode: { 
    fontFamily: FontNames.jetBrainsMono, 
    color: tokens.colors.textMuted, 
    fontSize: moderateScale(11), 
    marginBottom: verticalScale(4) 
  },
  itemMeta: { flexDirection: 'row', alignItems: 'center', marginTop: verticalScale(4) },
  itemPrice: { 
    fontFamily: FontNames.jetBrainsMono, 
    color: tokens.colors.mahogany, 
    fontSize: moderateScale(15),
    marginRight: scale(10),
    fontWeight: '700',
  },
  stockBadge: { 
    backgroundColor: 'rgba(255, 255, 255, 0.04)', 
    paddingHorizontal: scale(10), 
    paddingVertical: verticalScale(4), 
    borderRadius: scale(8), 
    marginRight: scale(10), 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.06)' 
  },
  stockLow: { 
    backgroundColor: 'rgba(201,107,107,0.2)', 
    borderColor: 'rgba(201,107,107,0.3)' 
  },
  stockText: { 
    fontFamily: FontNames.jetBrainsMono, 
    color: '#8A8A96', 
    fontSize: moderateScale(12),
  },
  stockTextLow: { color: '#C96B6B' },
  catTags: { flexDirection: 'row', flexWrap: 'wrap', marginTop: verticalScale(6) },
  catTag: { 
    backgroundColor: 'rgba(184, 123, 90, 0.15)', 
    paddingHorizontal: scale(8), 
    paddingVertical: verticalScale(3), 
    borderRadius: scale(6), 
    marginRight: scale(6),
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.2)',
  },
  catTagText: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(10), 
    color: tokens.colors.mahogany, 
    textTransform: 'capitalize' 
  },
  itemActions: { 
    flexDirection: 'row',
    marginTop: verticalScale(12),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: verticalScale(12),
    justifyContent: 'flex-end',
    width: '100%',
  },
  editBtn: { 
    backgroundColor: 'rgba(184, 123, 90, 0.8)', 
    paddingHorizontal: scale(14), 
    paddingVertical: verticalScale(10), 
    borderRadius: scale(12), 
    marginRight: scale(8), 
    minWidth: scale(85), 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.4)',
    flex: 1,
  },
  delBtn: { 
    backgroundColor: 'rgba(201, 107, 107, 0.2)', 
    paddingHorizontal: scale(14), 
    paddingVertical: verticalScale(10), 
    borderRadius: scale(12), 
    minWidth: scale(85), 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201, 107, 107, 0.3)',
    flex: 1,
  },
  btnText: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(14), 
    fontWeight: '600', 
    color: '#F0F0F2', 
    textAlign: 'center' 
  },
  editCard: { 
    position: 'relative',
    backgroundColor: 'rgba(10, 10, 12, 0.6)',
    padding: scale(22), 
    borderRadius: scale(24), 
    borderWidth: 1.5, 
    borderColor: 'rgba(184, 123, 90, 0.3)', 
    marginTop: verticalScale(12), 
    marginBottom: verticalScale(24),
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  imageSection: { alignItems: 'center', marginBottom: verticalScale(18) },
  previewImage: { 
    width: scale(100), 
    height: scale(100), 
    borderRadius: scale(18), 
    marginBottom: verticalScale(10), 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)' 
  },
  imagePlaceholder: { 
    width: scale(100), 
    height: scale(100), 
    borderRadius: scale(18), 
    backgroundColor: 'rgba(255, 255, 255, 0.04)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: verticalScale(10), 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.08)',
    gap: scale(8),
  },
  imagePlaceholderText: { 
    color: '#8A8A96', 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(12) 
  },
  imageButton: { 
    position: 'relative',
    backgroundColor: 'rgba(184, 123, 90, 0.2)',
    paddingHorizontal: scale(18), 
    paddingVertical: verticalScale(12), 
    borderRadius: scale(12), 
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.3)',
    overflow: 'hidden',
  },
  imageButtonText: { 
    color: '#B87B5A', 
    fontFamily: FontNames.instrumentSans, 
    fontWeight: '600', 
    fontSize: moderateScale(13) 
  },
  editActions: { marginTop: verticalScale(18) },
  cancelBtn: { 
    backgroundColor: 'rgba(255, 255, 255, 0.04)', 
    padding: scale(16), 
    borderRadius: scale(14), 
    alignItems: 'center', 
    marginTop: verticalScale(12), 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)',
    minHeight: verticalScale(48),
  },
  cancelBtnText: { 
    color: '#A0A0A8', 
    fontFamily: FontNames.instrumentSans, 
    fontWeight: '600', 
    fontSize: moderateScale(15) 
  },
  addImageSection: { marginBottom: verticalScale(18), alignItems: 'center' },
  addImagePreview: { 
    width: scale(100), 
    height: scale(100), 
    borderRadius: scale(18), 
    marginBottom: verticalScale(10), 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)' 
  },
  addImagePlaceholder: { 
    width: scale(100), 
    height: scale(100), 
    borderRadius: scale(18), 
    borderWidth: 2, 
    borderColor: 'rgba(184, 123, 90, 0.4)', 
    borderStyle: 'dashed', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: verticalScale(10), 
    gap: scale(8),
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  addImagePlaceholderText: { 
    color: '#B87B5A', 
    fontFamily: FontNames.instrumentSans, 
    fontWeight: '600', 
    fontSize: moderateScale(11), 
    marginTop: verticalScale(4) 
  },
  empty: { 
    color: '#8A8A96', 
    fontFamily: FontNames.instrumentSans, 
    textAlign: 'center', 
    marginTop: verticalScale(40) 
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: verticalScale(8), paddingBottom: verticalScale(32) },
  addFormActions: { 
    marginTop: verticalScale(18),
  },
  cancelAddBtn: { 
    backgroundColor: 'rgba(255, 255, 255, 0.04)', 
    padding: scale(16), 
    borderRadius: scale(14), 
    alignItems: 'center', 
    marginTop: verticalScale(12), 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)',
    minHeight: verticalScale(48),
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(60),
    gap: verticalScale(16),
  },
  retryBtn: {
    backgroundColor: 'rgba(201, 107, 107, 0.15)',
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: 'rgba(201, 107, 107, 0.3)',
  },
  retryBtnText: {
    color: '#C96B6B',
    fontFamily: FontNames.instrumentSans,
    fontWeight: '600',
    fontSize: moderateScale(14),
  },
});

