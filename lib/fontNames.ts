import { Platform } from 'react-native';

export const FontNames = {
  // Parkinsans variants (Official Brand Font)
  parkinsans: Platform.select({
    web: 'Parkinsans_400Regular, Parkinsans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    default: 'Parkinsans_400Regular',
  }),
  parkinsansSemiBold: Platform.select({
    web: 'Parkinsans_600SemiBold, Parkinsans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    default: 'Parkinsans_600SemiBold',
  }),
  parkinsansBold: Platform.select({
    web: 'Parkinsans_700Bold, Parkinsans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    default: 'Parkinsans_700Bold',
  }),
  parkinsansExtraBold: Platform.select({
    web: 'Parkinsans_800ExtraBold, Parkinsans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    default: 'Parkinsans_800ExtraBold',
  }),

  // JetBrains Mono variants
  jetBrainsMono: Platform.select({
    web: 'JetBrainsMono_400Regular, "JetBrains Mono", monospace',
    default: 'JetBrainsMono_400Regular',
  }),
  jetBrainsMonoBold: Platform.select({
    web: 'JetBrainsMono_700Bold, "JetBrains Mono", monospace',
    default: 'JetBrainsMono_700Bold',
  }),
} as const;