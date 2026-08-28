import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { useDeviceSize, calculateDeviceWidth } from '../../hooks/useDeviceSize';

describe('useDeviceSize hook (TDD)', () => {
  describe('calculateDeviceWidth utility', () => {
    it('caps width at 480px when on web platform with large desktop monitor width', () => {
      const result = calculateDeviceWidth(1920, 'web', 480);
      expect(result).toBe(480);
    });

    it('keeps smaller mobile web width if window is less than 480px on web', () => {
      const result = calculateDeviceWidth(360, 'web', 480);
      expect(result).toBe(360);
    });

    it('returns full native width on mobile platforms (ios/android)', () => {
      expect(calculateDeviceWidth(800, 'ios', 480)).toBe(800);
      expect(calculateDeviceWidth(1080, 'android', 480)).toBe(1080);
    });
  });

  describe('useDeviceSize hook integration', () => {
    it('returns width, height and boolean flags inside a component', async () => {
      let hookResult: any;
      function TestComponent() {
        const size = useDeviceSize();
        hookResult = size;
        return <Text testID="size-text">{size.width}x{size.height}</Text>;
      }
      await render(<TestComponent />);

      const el = await screen.findByTestId('size-text');
      expect(el).toBeTruthy();
      expect(hookResult).toBeDefined();
      expect(hookResult.width).toBeGreaterThan(0);
      expect(hookResult.height).toBeGreaterThan(0);
      expect(typeof hookResult.isWeb).toBe('boolean');
      expect(typeof hookResult.isMobile).toBe('boolean');
    });
  });
});
