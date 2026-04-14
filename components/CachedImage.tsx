import React, { useState, useEffect } from 'react';
import { Image, ImageProps } from 'expo-image';
import { getCachedImage } from '../lib/imageCache';

interface CachedImageProps extends ImageProps {
  remoteUri: string;
}

/**
 * A wrapper around expo-image that prioritizes local filesystem cache.
 * Falls back to remote URI if local image is not yet available.
 */
export const CachedImage = ({ remoteUri, style, ...props }: CachedImageProps) => {
  const [sourceUri, setSourceUri] = useState<string>(remoteUri);

  useEffect(() => {
    let isMounted = true;

    async function resolveImage() {
      if (!remoteUri) return;
      
      const localUri = await getCachedImage(remoteUri);
      if (isMounted && localUri) {
        setSourceUri(localUri);
      }
    }

    resolveImage();
    
    return () => {
      isMounted = false;
    };
  }, [remoteUri]);

  return (
    <Image
      {...props}
      source={{ uri: sourceUri }}
      style={style}
      transition={sourceUri.startsWith('file') ? 0 : 200} // Sniper shot: no transition if local
      cachePolicy="disk"
    />
  );
};
