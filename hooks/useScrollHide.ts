import { useRef, useCallback } from 'react';
import { useUIStore } from '../store/uiStore';

export function useScrollHide() {
  const setHeaderVisible = useUIStore((state) => state.setHeaderVisible);
  const lastOffset = useRef(0);
  const isScrollingDown = useRef(false);

  const handleScroll = useCallback((event: any) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    const distance = currentOffset - lastOffset.current;

    // Only update direction if there's a meaningful scroll (e.g. > 15px) 
    // to ignore layout shifts, bounce, and jitter
    if (Math.abs(distance) > 15) {
      isScrollingDown.current = distance > 0;
    }

    if (currentOffset <= 20) {
      setHeaderVisible(true);
    } else if (isScrollingDown.current && currentOffset > 60) {
      setHeaderVisible(false);
    } else if (!isScrollingDown.current) {
      setHeaderVisible(true);
    }

    lastOffset.current = currentOffset;
  }, [setHeaderVisible]);

  return handleScroll;
}
