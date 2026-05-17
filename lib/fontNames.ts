import { Platform } from 'react-native';

export const FontNames = {
  // Instrument Sans variants
  instrumentSans: Platform.select({
    web: 'InstrumentSans_400Regular, "Instrument Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    default: 'InstrumentSans_400Regular',
  }),
  instrumentSansMedium: Platform.select({
    web: 'InstrumentSans_500Medium, "Instrument Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    default: 'InstrumentSans_500Medium',
  }),
  instrumentSansSemiBold: Platform.select({
    web: 'InstrumentSans_600SemiBold, "Instrument Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    default: 'InstrumentSans_600SemiBold',
  }),
  instrumentSansBold: Platform.select({
    web: 'InstrumentSans_700Bold, "Instrument Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    default: 'InstrumentSans_700Bold',
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