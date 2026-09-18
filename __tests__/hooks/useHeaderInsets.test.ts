import { resolveHeaderTopInset, MIN_HEADER_TOP_INSET } from '../../hooks/useHeaderInsets';

describe('resolveHeaderTopInset', () => {
  it('keeps a minimum gap when the web view reports no inset (iOS PWA)', () => {
    expect(resolveHeaderTopInset(0, 'web')).toBe(MIN_HEADER_TOP_INSET);
  });

  it('uses the safe area when it is larger than the minimum (notched iPhone)', () => {
    const notch = MIN_HEADER_TOP_INSET + 30;
    expect(resolveHeaderTopInset(notch, 'ios')).toBe(notch);
  });

  it('covers the Android status bar when the safe area is smaller', () => {
    const statusBar = MIN_HEADER_TOP_INSET + 10;
    expect(resolveHeaderTopInset(0, 'android', statusBar)).toBe(statusBar);
  });

  it('ignores the status bar height outside Android', () => {
    expect(resolveHeaderTopInset(0, 'ios', MIN_HEADER_TOP_INSET + 40)).toBe(MIN_HEADER_TOP_INSET);
  });
});
