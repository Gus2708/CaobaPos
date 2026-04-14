import { supabase } from './supabase';
import * as ImagePicker from 'expo-image-picker';

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
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = `${productId}-${Date.now()}.jpg`;
    const arrayBuffer = await blobToArrayBuffer(blob);

    const { data, error } = await supabase.storage
      .from('products')
      .upload(filename, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('products')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Upload failed:', error);
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
      .from('products')
      .remove([filename]);

    if (error) {
      console.error('Delete image error:', error);
    }
  } catch (error) {
    console.error('Delete image failed:', error);
  }
}

function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}