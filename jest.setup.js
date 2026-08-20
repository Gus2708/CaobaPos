// Mocks for CaobaPOS tests

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: jest.fn((callback) => callback({ data: [], error: null })),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://mock-image.url' } })),
      })),
    },
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  })),
}));

// Mock Expo Modules
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(),
  isLoaded: jest.fn(() => true),
  useFonts: jest.fn(() => [true, null]),
}));

jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Image: ({ children, ...props }) => React.createElement(View, props, children),
  };
});

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }) => React.createElement(View, props, children),
  };
});

// Mock @expo/vector-icons (used internally by component Icon)
jest.mock('@expo/vector-icons', () => ({
  FontAwesome5: 'FontAwesome5',
  EvilIcons: 'EvilIcons',
}));

// Mock Expo FileSystem
jest.mock('expo-file-system', () => ({
  Paths: {
    cache: 'mock-cache-path',
  },
  File: jest.fn(),
  Directory: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => inset,
  };
});

// Mock NetInfo
jest.mock(
  '@react-native-community/netinfo',
  () => ({
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn().mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    }),
    useNetInfo: jest.fn(() => ({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    })),
  }),
  { virtual: true }
);

// Mock Expo Haptics
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: ({ children, ...props }: any) => {
      const React = require('react');
      return React.createElement(View, props, children);
    },
    GestureDetector: ({ children }: any) => children,
    Gesture: {
      Pan: () => {
        const pan: any = {
          activeOffsetY: () => pan,
          activeOffsetX: () => pan,
          onStart: () => pan,
          onUpdate: () => pan,
          onEnd: () => pan,
        };
        return pan;
      },
    },
  };
});

// Mock react-native-worklets
jest.mock('react-native-worklets', () => ({
  scheduleOnRN: (fn, ...args) => fn?.(...args),
  createSerializable: (val) => val,
  isWorkletFunction: () => false,
  serializableMappingCache: new Map(),
  runOnUI: (fn) => fn,
  RuntimeKind: { JS: 0, UI: 1 },
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default = Reanimated.default || Reanimated;
  Reanimated.useReducedMotion = jest.fn(() => false);
  const mockBuilder = {
    duration: () => mockBuilder,
    easing: () => mockBuilder,
    delay: () => mockBuilder,
    springify: () => mockBuilder,
  };
  Reanimated.FadeIn = mockBuilder;
  Reanimated.FadeOut = mockBuilder;
  Reanimated.FadeInDown = mockBuilder;
  Reanimated.FadeOutDown = mockBuilder;
  Reanimated.LinearTransition = mockBuilder;
  return Reanimated;
});

// Global mocks
jest.mock('react-native/Libraries/Animated/animations/TimingAnimation');

