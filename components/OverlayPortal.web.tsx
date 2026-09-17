import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface OverlayPortalProps {
  children: React.ReactNode;
}

/** Above react-native-web's modals, which all render at z-index 9999. */
const OVERLAY_Z_INDEX = '10000';

/**
 * Web counterpart of `OverlayPortal`: renders its children in a fixed host appended to
 * document.body, so toasts stay visible while a modal is open. The host does not take
 * pointer events; children re-enable them (a View with `pointerEvents="box-none"`).
 */
export function OverlayPortal({ children }: OverlayPortalProps) {
  const [host] = useState(() => {
    const element = document.createElement('div');
    element.style.position = 'fixed';
    element.style.top = '0';
    element.style.right = '0';
    element.style.bottom = '0';
    element.style.left = '0';
    element.style.zIndex = OVERLAY_Z_INDEX;
    element.style.pointerEvents = 'none';
    return element;
  });

  useEffect(() => {
    document.body.appendChild(host);
    return () => {
      host.remove();
    };
  }, [host]);

  return createPortal(children, host);
}
