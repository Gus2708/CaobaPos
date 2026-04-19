import { supabase } from './supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export async function pickFromCamera(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (!result.canceled && result.assets[0]) {
    return result.assets[0].uri;
  }
  return null;
}

export async function pickFromGallery(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (!result.canceled && result.assets[0]) {
    return result.assets[0].uri;
  }
  return null;
}

export async function uploadProductImage(uri: string, productId: string): Promise<string | null> {
  try {
    console.log('Starting upload for URI:', uri);
    
    // Read the file as base64 using expo-file-system (much more reliable on mobile)
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });
    
    const filename = `${productId}-${Date.now()}.jpg`;
    
    // Convert base64 to ArrayBuffer for Supabase Storage
    const arrayBuffer = decode(base64);

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filename, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('Supabase Storage Upload Error:', error.message, error);
      // Check if it's a "bucket not found" error to provide better advice
      if (error.message?.includes('bucket') || (error as any).status === 404) {
        console.warn('CRITICAL: The "product-images" bucket might be missing in your Supabase project.');
      }
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(data.path);

    if (!urlData || !urlData.publicUrl) {
      console.error('Could not generate public URL for uploaded image');
      return null;
    }

    console.log('Upload successful! Public URL:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error: any) {
    console.error('Image upload exception:', error.message || error);
    return null;
  }
}

export async function deleteProductImage(imageUrl: string): Promise<void> {
  try {
    // Extract filename from public URL
    // Format: .../storage/v1/object/public/products/filename.jpg
    const parts = imageUrl.split('/');
    const filename = parts[parts.length - 1];
    
    if (!filename) return;

    const { error } = await supabase.storage
      .from('product-images')
      .remove([filename]);

    if (error) {
      console.error('Delete image error:', error);
    }
  } catch (error) {
    console.error('Delete image failed:', error);
  }
}
