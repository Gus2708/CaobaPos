import React from 'react';

interface OverlayPortalProps {
  children: React.ReactNode;
}

/**
 * Renders its children in place. Native draws modals inside the same window, so an
 * overlay declared at the app root already sits on top.
 *
 * The web build (`OverlayPortal.web.tsx`) moves them into a portal above every modal:
 * react-native-web mounts each modal in its own document.body portal at z-index 9999,
 * and gives every View its own stacking context, so an overlay left inside the app
 * tree is painted underneath any open modal.
 */
export function OverlayPortal({ children }: OverlayPortalProps) {
  return <>{children}</>;
}
