import React, { useState, useEffect, useRef } from 'react';
import { Image, ImageProps } from 'expo-image';
import { getCachedImage } from '../lib/imageCache';

interface CachedImageProps extends ImageProps {
  remoteUri: string;
}

/**
 * Optimized image component that:
 * 1. Shows remote URI immediately (no flash/blank)                      [instant-preview]
 * 2. Upgrades to local filesystem cache in the background               [bg-upgrade]
 * 3. Uses expo-image disk cache as secondary layer                      [disk-fallback]
 * 4. Skips redundant resolves when remoteUri hasn't changed             [stable-ref]
 */
export const CachedImage = ({ remoteUri, style, ...props }: CachedImageProps) => {
  const [sourceUri, setSourceUri] = useState<string>(remoteUri);
  const [hasError, setHasError] = useState(false);
  const resolvedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!remoteUri) {
      setHasError(true);
      return;
    }

    if (resolvedRef.current === remoteUri) return;

    let cancelled = false;

    async function resolveImage() {
      const localUri = await getCachedImage(remoteUri);
      if (!cancelled && localUri && localUri !== remoteUri) {
        resolvedRef.current = remoteUri;
        setSourceUri(localUri);
        setHasError(false);
      }
    }

    resolveImage();

    return () => {
      cancelled = true;
    };
  }, [remoteUri]);

  useEffect(() => {
    if (remoteUri && sourceUri !== remoteUri && resolvedRef.current !== remoteUri) {
      setSourceUri(remoteUri);
      setHasError(false);
    }
  }, [remoteUri]);

  if (hasError) return null;

  return (
    <Image
      {...props}
      source={{ uri: sourceUri }}
      style={[style, { backgroundColor: 'rgba(184,123,90,0.05)' }]}
      transition={sourceUri.startsWith('file') ? 0 : 150}
      cachePolicy="disk"
      onError={() => setHasError(true)}
    />
  );
};
