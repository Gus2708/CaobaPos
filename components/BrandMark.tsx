import React from 'react';
import { type StyleProp } from 'react-native';
import { Image, type ImageStyle } from 'expo-image';
import {
  ESPIRAL_BASE64,
  FLOR1_BASE64,
  FLOR2_BASE64,
  ISOTIPO_BASE64,
  LOGO_BASE64,
} from '../lib/brandAssets';

/**
 * Renders a mark from the Caoba brand manual.
 *
 * The brand assets are inline `data:image/svg+xml` URIs. React Native's own `Image`
 * cannot decode SVG on iOS or Android — it silently renders nothing — so every brand
 * mark must go through `expo-image`, which supports SVG on all three platforms.
 * Import this component instead of reaching for the raw base64 constants.
 */
export type BrandMotif = 'logo' | 'isotipo' | 'espiral' | 'flor1' | 'flor2';

const MOTIF_SOURCES: Record<BrandMotif, string> = {
  logo: LOGO_BASE64,
  isotipo: ISOTIPO_BASE64,
  espiral: ESPIRAL_BASE64,
  flor1: FLOR1_BASE64,
  flor2: FLOR2_BASE64,
};

interface BrandMarkProps {
  motif: BrandMotif;
  style?: StyleProp<ImageStyle>;
  contentFit?: 'contain' | 'cover' | 'fill';
  /**
   * Provide only when the mark carries meaning on its own (the logo in the header,
   * for example). Without it the mark is treated as decoration: hidden from assistive
   * technology and transparent to touches.
   */
  accessibilityLabel?: string;
}

export function BrandMark({
  motif,
  style,
  contentFit = 'contain',
  accessibilityLabel,
}: BrandMarkProps) {
  const isDecorative = !accessibilityLabel;

  return (
    <Image
      source={{ uri: MOTIF_SOURCES[motif] }}
      style={[isDecorative && DECORATIVE_STYLE, style]}
      contentFit={contentFit}
      // Inline data URIs decode instantly; a fade would only add latency to a static mark.
      transition={0}
      cachePolicy="memory"
      accessible={!isDecorative}
      alt={accessibilityLabel ?? ''}
    />
  );
}

// expo-image's ImageStyle omits `pointerEvents`, but the view it renders honours it —
// without this a large watermark would swallow taps meant for the content beneath it.
const DECORATIVE_STYLE = { pointerEvents: 'none' } as unknown as ImageStyle;
