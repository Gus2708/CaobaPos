/**
 * @jest-environment jsdom
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { OverlayPortal } from '../../components/OverlayPortal.web';

describe('OverlayPortal (web)', () => {
  it('renders its children in a fixed host above the modals and cleans it up', async () => {
    const appRoot = document.createElement('div');
    document.body.appendChild(appRoot);
    const root = createRoot(appRoot);

    await act(async () => {
      root.render(
        <OverlayPortal>
          <span>Venta eliminada y stock restaurado</span>
        </OverlayPortal>
      );
    });

    const host = document.body.lastElementChild as HTMLElement;
    expect(host).not.toBe(appRoot);
    expect(host.style.position).toBe('fixed');
    expect(host.style.zIndex).toBe('10000');
    expect(host.style.pointerEvents).toBe('none');
    expect(host.textContent).toBe('Venta eliminada y stock restaurado');

    await act(async () => {
      root.unmount();
    });

    expect(document.body.contains(host)).toBe(false);
    appRoot.remove();
  });
});
