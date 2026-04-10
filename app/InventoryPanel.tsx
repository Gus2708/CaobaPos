import React, { useState, useMemo, memo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image, ScrollView } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { Product, useSettingsStore } from '../store/cartStore';
import { FontNames } from '../lib/fontNames';
import { pickFromCamera, pickFromGallery, uploadProductImage } from '../lib/imageUpload';
import { Icon } from '../components/Icon';
import { ImagePickerModal } from '../components/ImagePickerModal';
import { useToast } from '../components/Toast';
import { tokens } from '../lib/designTokens';

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

export const InventoryPanel = memo(function InventoryPanel({ readOnly = false }: { readOnly?: boolean }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<EditState | null>(null);
  const [newProduct, setNewProduct] = useState<NewProductState>({ name: '', price: '', cost: '', stock: '', categories: [], barcode: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [imagePickerTarget, setImagePickerTarget] = useState<'new' | 'edit'>('new');
  const { showToast } = useToast();
  
  const categories = useSettingsStore((state) => state.categories);
  const addCategory = useSettingsStore((state) => state.addCategory);
  const removeCategory = useSettingsStore((state) => state.removeCategory);

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ['inventory-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, product_categories(categories(name))')
        .order('name');
      if (error) throw error;
      
      const productsWithCategories = (data ?? []).map((p: any) => ({
        ...p,
        categories: p.product_categories?.map((pc: any) => pc.categories?.name).filter(Boolean) || []
      }));
      
      return productsWithCategories;
    },
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!search.trim()) return products;
    const s = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        p.categories.some((c) => c.toLowerCase().includes(s)) ||
        p.barcode?.toLowerCase().includes(s)
    );
  }, [products, search]);

  const updateMutation = useMutation({
    mutationFn: async (item: EditState) => {
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
      };
      
      if (item.barcode) {
        updates.barcode = item.barcode;
      }

      if (item.newImageUri) {
        const imageUrl = await uploadProductImage(item.newImageUri, item.id);
        if (imageUrl) {
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
    },
    onError: () => showToast('No se pudo actualizar', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory-products'] }),
    onError: () => showToast('No se pudo eliminar', 'error'),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error: insertError } = await supabase.from('products').insert({
        name: newProduct.name,
        price: parseFloat(newProduct.price) || 0,
        cost: parseFloat(newProduct.cost) || 0,
        stock_quantity: parseInt(newProduct.stock) || 0,
        barcode: newProduct.barcode || null,
        is_active: true,
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
    },
    onError: () => showToast('No se pudo crear el producto', 'error'),
  });

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    addCategory(newCategoryName.trim());
    setNewCategoryName('');
    showToast('Categoría agregada', 'success');
  };

  const handleDeleteCategory = (cat: string) => {
    Alert.alert('Eliminar Categoría', `¿Eliminar "${cat}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => removeCategory(cat) },
    ]);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Eliminar', `¿Eliminar "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  const handlePickImage = (target: 'new' | 'edit') => {
    setImagePickerTarget(target);
    setShowImagePicker(true);
  };

  const handleCamera = async () => {
    const uri = await pickFromCamera();
    if (uri) {
      if (imagePickerTarget === 'new') {
        setNewProduct((p) => ({ ...p, imageUri: uri }));
      } else {
        setEditing((e) => e ? { ...e, newImageUri: uri } : null);
      }
    }
  };

  const handleGallery = async () => {
    const uri = await pickFromGallery();
    if (uri) {
      if (imagePickerTarget === 'new') {
        setNewProduct((p) => ({ ...p, imageUri: uri }));
      } else {
        setEditing((e) => e ? { ...e, newImageUri: uri } : null);
      }
    }
  };

  const toggleCategory = (cat: string, isNew: boolean = false) => {
    if (isNew) {
      setNewProduct((p) => ({
        ...p,
        categories: p.categories.includes(cat)
          ? p.categories.filter((c) => c !== cat)
          : [...p.categories, cat],
      }));
    } else if (editing) {
      setEditing((e) => e ? {
        ...e,
        categories: e.categories.includes(cat)
          ? e.categories.filter((c) => c !== cat)
          : [...e.categories, cat],
      } : null);
    }
  };

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
    updateMutation.mutate(editing);
  };

  const renderItem = ({ item }: { item: Product }) => {
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
            {(editing.newImageUri || editing.image_url) ? (
              <Image source={{ uri: editing.newImageUri || editing.image_url }} style={styles.previewImage} />
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
            placeholderTextColor="#6A6A72"
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
          <View style={styles.itemImage}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.thumbImage} />
            ) : (
              <View style={styles.thumbPlaceholder}>
                <LinearGradient
                  colors={['rgba(184, 123, 90, 0.2)', 'rgba(184, 123, 90, 0.1)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.thumbPlaceholderText}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
            {item.barcode && <Text style={styles.itemBarcode}>{item.barcode}</Text>}
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
                  <Text style={styles.catTagText}>{cat}</Text>
                </View>
              ))}
            </View>
          </View>
          {!readOnly && (
            <View style={styles.itemActions}>
              <TouchableOpacity style={styles.editBtn} onPress={() => startEdit(item)}>
                <Text style={styles.btnText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item.id, item.name)}>
                <Text style={styles.btnText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
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
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddForm(!showAddForm)}>
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
          <Icon name="search" size={18} color="#8A8A96" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar producto..."
            placeholderTextColor="#6A6A72"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <Text style={styles.count}>{filteredProducts.length}</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
                <Image source={{ uri: newProduct.imageUri }} style={styles.addImagePreview} />
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
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator size="large" color="#B87B5A" style={styles.loader} />
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>Sin productos</Text>}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
          />
        )}
      </ScrollView>

      <ImagePickerModal
        visible={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onSelectCamera={handleCamera}
        onSelectGallery={handleGallery}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    position: 'relative',
    backgroundColor: tokens.colors.bg,
    padding: 16,
  },
  header: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(184, 123, 90, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.2)',
  },
  title: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: 22, 
    color: '#F0F0F2', 
    fontWeight: '700', 
    letterSpacing: 1,
  },
  headerButtons: { 
    flexDirection: 'row', 
    gap: 10,
  },
  manageCatBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255, 255, 255, 0.04)', 
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    borderRadius: 12, 
    gap: 6, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.08)',
    minHeight: 44,
  },
  manageCatBtnText: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#F0F0F2',
  },
  addBtn: { 
    position: 'relative',
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.3)',
  },
  addBtnText: { 
    fontFamily: FontNames.instrumentSans, 
    fontWeight: '600', 
    fontSize: 14, 
    color: '#F0F0F2',
  },
  categoryManager: { 
    position: 'relative',
    backgroundColor: 'rgba(10, 10, 12, 0.5)',
    padding: 16, 
    borderRadius: 20, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(184, 123, 90, 0.15)',
    overflow: 'hidden',
  },
  categoryManagerTitle: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#F0F0F2', 
    marginBottom: 12,
  },
  addCategoryRow: { 
    flexDirection: 'row', 
    gap: 10, 
    marginBottom: 12,
  },
  addCategoryInput: { 
    flex: 1, 
    backgroundColor: 'rgba(255, 255, 255, 0.04)', 
    color: '#F0F0F2', 
    padding: 14, 
    borderRadius: 12, 
    fontFamily: FontNames.instrumentSans, 
    fontSize: 14, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.08)',
  },
  addCategoryBtn: { 
    backgroundColor: 'rgba(109, 184, 138, 0.8)', 
    paddingHorizontal: 16, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
    minWidth: 50,
  },
  catManageItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: 'rgba(255, 255, 255, 0.04)', 
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    borderRadius: 12, 
    marginRight: 8, 
    marginBottom: 8, 
    minWidth: 120,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  catManageText: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: 13, 
    color: '#F0F0F2',
  },
  searchRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.bg,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.15)',
    gap: 10,
  },
  searchInput: { 
    flex: 1,
    backgroundColor: 'transparent',
    color: '#F0F0F2', 
    paddingVertical: 14, 
    fontFamily: FontNames.instrumentSans, 
    fontSize: 15,
  },
  count: { 
    color: '#B87B5A', 
    fontFamily: FontNames.jetBrainsMono,
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(184, 123, 90, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  loader: { marginTop: 40 },
  addForm: { 
    position: 'relative',
    backgroundColor: tokens.colors.bg,
    padding: 22, 
    borderRadius: 24, 
    marginBottom: 16, 
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
    fontSize: 20, 
    marginBottom: 20,
  },
  input: { 
    backgroundColor: 'rgba(255, 255, 255, 0.04)', 
    color: '#F0F0F2', 
    padding: 14, 
    borderRadius: 12, 
    fontFamily: FontNames.instrumentSans, 
    fontSize: 15, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  inputLabel: { 
    color: '#B0B0B8', 
    fontFamily: FontNames.instrumentSans, 
    fontSize: 12, 
    marginBottom: 8, 
    fontWeight: '600', 
    textTransform: 'uppercase', 
    letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', marginHorizontal: -6 },
  flex1: { flex: 1, marginHorizontal: 6 },
  formSection: { marginBottom: 4 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20, marginTop: 4 },
  catBtn: { 
    position: 'relative',
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 14, 
    backgroundColor: 'rgba(255, 255, 255, 0.03)', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.06)', 
    marginRight: 10, 
    marginBottom: 8,
    overflow: 'hidden',
    minHeight: 44,
    justifyContent: 'center',
  },
  catActive: { 
    backgroundColor: 'transparent',
    borderColor: 'rgba(184, 123, 90, 0.4)',
  },
  catText: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: 13, 
    color: '#8A8A96',
  },
  catTextActive: { 
    fontWeight: '600', 
    color: '#F0F0F2',
  },
  saveBtn: { 
    position: 'relative',
    padding: 16, 
    borderRadius: 14, 
    alignItems: 'center', 
    borderWidth: 1,
    borderColor: 'rgba(109, 184, 138, 0.4)',
    overflow: 'hidden',
    minHeight: 52,
    justifyContent: 'center',
  },
  btnDisabled: { 
    opacity: 0.5,
  },
  saveBtnText: { 
    fontFamily: FontNames.instrumentSans, 
    fontWeight: '700', 
    fontSize: 15, 
    color: '#FFFFFF',
  },
  list: { paddingBottom: 20 },
  listItemWrapper: { 
    position: 'relative',
    marginBottom: 10,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  item: { 
    backgroundColor: tokens.colors.bg,
    padding: 14, 
    borderRadius: 18,
    flexDirection: 'row', 
    alignItems: 'center',
  },
  itemImage: { 
    width: 64, 
    height: 64, 
    marginRight: 14, 
    borderRadius: 14, 
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
    fontSize: 26, 
    color: '#B87B5A', 
    fontWeight: '700',
  },
  itemInfo: { flex: 1 },
  itemName: { 
    fontFamily: FontNames.instrumentSans, 
    color: '#F0F0F2', 
    fontSize: 15, 
    fontWeight: '500', 
    marginBottom: 4 
  },
  itemBarcode: { 
    fontFamily: FontNames.jetBrainsMono, 
    color: '#8A8A96', 
    fontSize: 11, 
    marginBottom: 4 
  },
  itemMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  itemPrice: { 
    fontFamily: FontNames.jetBrainsMono, 
    color: '#B87B5A', 
    fontSize: 15,
    marginRight: 10,
    fontWeight: '600',
  },
  stockBadge: { 
    backgroundColor: 'rgba(255, 255, 255, 0.04)', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8, 
    marginRight: 10, 
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
    fontSize: 12,
  },
  stockTextLow: { color: '#C96B6B' },
  catTags: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  catTag: { 
    backgroundColor: 'rgba(184, 123, 90, 0.15)', 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 6, 
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.2)',
  },
  catTagText: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: 10, 
    color: '#B87B5A', 
    textTransform: 'capitalize' 
  },
  itemActions: { 
    flexDirection: 'row',
    marginLeft: 8,
  },
  editBtn: { 
    backgroundColor: 'rgba(184, 123, 90, 0.8)', 
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    borderRadius: 12, 
    marginRight: 8, 
    minWidth: 75, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.4)',
  },
  delBtn: { 
    backgroundColor: 'rgba(201, 107, 107, 0.2)', 
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    borderRadius: 12, 
    minWidth: 75, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201, 107, 107, 0.3)',
  },
  btnText: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#F0F0F2', 
    textAlign: 'center' 
  },
  editCard: { 
    position: 'relative',
    backgroundColor: 'rgba(10, 10, 12, 0.6)',
    padding: 22, 
    borderRadius: 24, 
    borderWidth: 1.5, 
    borderColor: 'rgba(184, 123, 90, 0.3)', 
    marginTop: 12, 
    marginBottom: 24,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  imageSection: { alignItems: 'center', marginBottom: 18 },
  previewImage: { 
    width: 100, 
    height: 100, 
    borderRadius: 18, 
    marginBottom: 10, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)' 
  },
  imagePlaceholder: { 
    width: 100, 
    height: 100, 
    borderRadius: 18, 
    backgroundColor: 'rgba(255, 255, 255, 0.04)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 10, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  imagePlaceholderText: { 
    color: '#8A8A96', 
    fontFamily: FontNames.instrumentSans, 
    fontSize: 12 
  },
  imageButton: { 
    position: 'relative',
    backgroundColor: 'rgba(184, 123, 90, 0.2)',
    paddingHorizontal: 18, 
    paddingVertical: 12, 
    borderRadius: 12, 
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.3)',
    overflow: 'hidden',
  },
  imageButtonText: { 
    color: '#B87B5A', 
    fontFamily: FontNames.instrumentSans, 
    fontWeight: '600', 
    fontSize: 13 
  },
  editActions: { marginTop: 18 },
  cancelBtn: { 
    backgroundColor: 'rgba(255, 255, 255, 0.04)', 
    padding: 16, 
    borderRadius: 14, 
    alignItems: 'center', 
    marginTop: 12, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)',
    minHeight: 48,
  },
  cancelBtnText: { 
    color: '#A0A0A8', 
    fontFamily: FontNames.instrumentSans, 
    fontWeight: '600', 
    fontSize: 15 
  },
  addImageSection: { marginBottom: 18, alignItems: 'center' },
  addImagePreview: { 
    width: 100, 
    height: 100, 
    borderRadius: 18, 
    marginBottom: 10, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)' 
  },
  addImagePlaceholder: { 
    width: 100, 
    height: 100, 
    borderRadius: 18, 
    borderWidth: 2, 
    borderColor: 'rgba(184, 123, 90, 0.4)', 
    borderStyle: 'dashed', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 10, 
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  addImagePlaceholderText: { 
    color: '#B87B5A', 
    fontFamily: FontNames.instrumentSans, 
    fontWeight: '600', 
    fontSize: 11, 
    marginTop: 4 
  },
  empty: { 
    color: '#8A8A96', 
    fontFamily: FontNames.instrumentSans, 
    textAlign: 'center', 
    marginTop: 40 
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 8, paddingBottom: 32 },
});
