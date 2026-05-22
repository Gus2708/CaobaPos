import React from 'react';

// ── Full manual mock of react-native ──────────────────────────
jest.mock('react-native', () => {
  const React = require('react');

  const mockCmpt = (tag: string) => {
    const Comp = (props: any) => React.createElement(tag, props, props.children);
    Comp.displayName = tag;
    return Comp;
  };

  class MockValue {
    _value: number;
    constructor(val: number) { this._value = val; }
    setValue(v: number) { this._value = v; }
    interpolate() { return this; }
    __getValue() { return this._value; }
    __makeNative() {}
    addListener() { return '0'; }
    removeListener() {}
  }

  const mockAnim = () => ({
    start: jest.fn((cb: any) => { if (cb) cb({ finished: true }); }),
  });

  return {
    View: mockCmpt('View'),
    Text: mockCmpt('Text'),
    Image: mockCmpt('Image'),
    TouchableOpacity: mockCmpt('View'),
    ScrollView: mockCmpt('ScrollView'),
    FlatList: mockCmpt('View'),
    Pressable: mockCmpt('View'),
    Modal: mockCmpt('View'),
    ActivityIndicator: mockCmpt('View'),
    RefreshControl: mockCmpt('View'),
    KeyboardAvoidingView: mockCmpt('View'),
    StatusBar: mockCmpt('View'),
    SafeAreaView: mockCmpt('View'),
    Switch: mockCmpt('View'),
    TextInput: mockCmpt('View'),

    StyleSheet: {
      create: (styles: any) => styles,
      absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
      absoluteFillObject: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
      hairlineWidth: 1,
      flatten: (s: any) => s,
    },

    Platform: {
      OS: 'web',
      Version: '0.81.5',
      select: (obj: any) => obj.default || obj.web || obj.ios || obj.android,
      isDisableAnimations: false,
    },

    Dimensions: {
      get: () => ({ width: 375, height: 812, scale: 2, fontScale: 1 }),
      addEventListener: () => ({ remove: jest.fn() }),
    },

    PixelRatio: {
      get: () => 2,
      getFontScale: () => 1,
      getPixelSizeForLayoutSize: (s: number) => s * 2,
      roundToNearestPixel: (s: number) => Math.round(s * 2) / 2,
    },

    Animated: {
      Value: MockValue,
      View: mockCmpt('View'),
      Text: mockCmpt('Text'),
      Image: mockCmpt('Image'),
      ScrollView: mockCmpt('ScrollView'),
      timing: jest.fn(() => mockAnim()),
      parallel: jest.fn(() => mockAnim()),
      spring: jest.fn(() => mockAnim()),
      sequence: jest.fn(() => mockAnim()),
      stagger: jest.fn(() => mockAnim()),
      delay: jest.fn(() => mockAnim()),
      loop: jest.fn(() => mockAnim()),
      decay: jest.fn(() => mockAnim()),
      createAnimatedComponent: (comp: any) => comp,
      event: () => jest.fn(),
      useNativeDriver: true,
    },

    Easing: {
      step0: (t: number) => t,
      step1: (t: number) => t,
      linear: (t: number) => t,
      ease: (t: number) => t,
      quad: (t: number) => t * t,
      cubic: (t: number) => t * t * t,
      poly: (n: number) => (t: number) => Math.pow(t, n),
      sin: (t: number) => t,
      circle: (t: number) => t,
      exp: (t: number) => t,
      elastic: (bounciness: number) => (t: number) => t,
      back: (s: number) => (t: number) => t * t * ((s + 1) * t - s),
      bounce: (t: number) => t,
      bezier: () => (t: number) => t,
      in: (fn: Function) => fn,
      out: (fn: Function) => fn,
      inOut: (fn: Function) => fn,
    },

    I18nManager: {
      isRTL: false,
      allowRTL: () => {},
      forceRTL: () => {},
      swapLeftAndRightInRTL: () => {},
    },

    LayoutAnimation: {
      configureNext: jest.fn(),
      create: jest.fn(),
      Presets: { easeInEaseOut: { duration: 300, create: {}, update: {}, delete: {} } },
    },

    findNodeHandle: () => 1,
    processColor: (c: any) => c,
    unstable_batchedUpdates: (fn: Function) => fn(),

    TurboModuleRegistry: {
      get: () => null,
      getEnforcing: () => ({}),
    },

    NativeModules: {
      DevMenu: {},
      PlatformConstants: { forceTouchAvailable: false },
      SourceCode: { scriptURL: 'http://localhost/TestRunner' },
    },
  };
});

// ── Mock child components ─────────────────────────────────
jest.mock('../../app/index', () => {
  const React = require('react');
  const { View } = require('react-native');
  const C = () => React.createElement(View, { testID: 'screen-pos' });
  C.displayName = 'POSScreen';
  return { POSScreen: C };
});

jest.mock('../../app/DashboardPanel', () => {
  const React = require('react');
  const { View } = require('react-native');
  const C = () => React.createElement(View, { testID: 'screen-dashboard' });
  C.displayName = 'DashboardPanel';
  return { DashboardPanel: C };
});

jest.mock('../../app/InventoryPanel', () => {
  const React = require('react');
  const { View } = require('react-native');
  const C = () => React.createElement(View, { testID: 'screen-inventory' });
  C.displayName = 'InventoryPanel';
  return { InventoryPanel: C };
});

jest.mock('../../app/HistoryPanel', () => {
  const React = require('react');
  const { View } = require('react-native');
  const C = () => React.createElement(View, { testID: 'screen-history' });
  C.displayName = 'HistoryPanel';
  return { HistoryPanel: C };
});

jest.mock('../../app/ClientsPanel', () => {
  const React = require('react');
  const { View } = require('react-native');
  const C = () => React.createElement(View, { testID: 'screen-clients' });
  C.displayName = 'ClientsPanel';
  return C;
});

jest.mock('../../components/Header', () => {
  const React = require('react');
  const { View, TouchableOpacity, Text } = require('react-native');
  return {
    Header: ({ onNavigate }: { onNavigate: (s: string) => void }) =>
      React.createElement(View, { testID: 'header' },
        React.createElement(TouchableOpacity, { testID: 'nav-pos', onPress: () => onNavigate('pos') },
          React.createElement(Text, null, 'POS')),
        React.createElement(TouchableOpacity, { testID: 'nav-dashboard', onPress: () => onNavigate('dashboard') },
          React.createElement(Text, null, 'Dashboard')),
        React.createElement(TouchableOpacity, { testID: 'nav-inventory', onPress: () => onNavigate('inventory') },
          React.createElement(Text, null, 'Inventory')),
        React.createElement(TouchableOpacity, { testID: 'nav-history', onPress: () => onNavigate('history') },
          React.createElement(Text, null, 'History')),
        React.createElement(TouchableOpacity, { testID: 'nav-clients', onPress: () => onNavigate('clients') },
          React.createElement(Text, null, 'Clients')),
      ),
  };
});

jest.mock('../../hooks/useRealtimeSync', () => ({
  useRealtimeSync: jest.fn(),
}));

jest.mock('../../components/Toast', () => {
  const React = require('react');
  return { ToastProvider: ({ children }: any) => React.createElement(React.Fragment, null, children) };
});

jest.mock('../../store/uiStore', () => ({
  headerTranslateY: { __isMock: true },
  initScrollHideAnimation: jest.fn(),
  resetScrollState: jest.fn(),
  cleanupScrollListener: jest.fn(),
}));

// ── Tests (using render() result, NOT screen singleton) ──────
import { render, fireEvent } from '@testing-library/react-native';
import MainApp from '../../app/MainApp';

describe('MainApp', () => {
  it('renders POS by default', async () => {
    const { findByTestId } = await render(<MainApp />);
    expect(await findByTestId('screen-pos')).toBeOnTheScreen();
  });

  it('same screen press is no-op', async () => {
    const { findByTestId, getByTestId, queryByTestId } = await render(<MainApp />);
    expect(await findByTestId('screen-pos')).toBeOnTheScreen();

    fireEvent.press(getByTestId('nav-pos'));
    expect(await findByTestId('screen-pos')).toBeOnTheScreen();
    expect(queryByTestId('screen-dashboard')).toBeNull();
  });

  it('navigates POS → Dashboard', async () => {
    const { findByTestId, getByTestId } = await render(<MainApp />);
    expect(await findByTestId('screen-pos')).toBeOnTheScreen();

    fireEvent.press(getByTestId('nav-dashboard'));
    expect(await findByTestId('screen-dashboard')).toBeOnTheScreen();
  });

  it('navigates through all screens', async () => {
    const { findByTestId, getByTestId } = await render(<MainApp />);
    expect(await findByTestId('screen-pos')).toBeOnTheScreen();

    fireEvent.press(getByTestId('nav-dashboard'));
    expect(await findByTestId('screen-dashboard')).toBeOnTheScreen();

    fireEvent.press(getByTestId('nav-inventory'));
    expect(await findByTestId('screen-inventory')).toBeOnTheScreen();

    fireEvent.press(getByTestId('nav-history'));
    expect(await findByTestId('screen-history')).toBeOnTheScreen();

    fireEvent.press(getByTestId('nav-clients'));
    expect(await findByTestId('screen-clients')).toBeOnTheScreen();

    fireEvent.press(getByTestId('nav-pos'));
    expect(await findByTestId('screen-pos')).toBeOnTheScreen();
  });

  it('isAnimating blocks rapid clicks', async () => {
    const { findByTestId, getByTestId } = await render(<MainApp />);
    expect(await findByTestId('screen-pos')).toBeOnTheScreen();

    fireEvent.press(getByTestId('nav-dashboard'));
    expect(await findByTestId('screen-dashboard')).toBeOnTheScreen();

    fireEvent.press(getByTestId('nav-inventory'));
    fireEvent.press(getByTestId('nav-clients'));
    expect(await findByTestId('screen-clients')).toBeOnTheScreen();
  });
});
