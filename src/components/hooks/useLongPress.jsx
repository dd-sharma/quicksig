import { useCallback, useRef, useState } from "react";

export function useLongPress(callback, options = {}) {
  const { delay = 500, onStart, onCancel } = options;
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timeout = useRef();
  const target = useRef();

  const start = useCallback((e) => {
    onStart?.(e);
    timeout.current = setTimeout(() => {
      callback(e);
      setLongPressTriggered(true);
      if (navigator.vibrate) navigator.vibrate(10);
    }, delay);
  }, [callback, delay, onStart]);

  const clear = useCallback((e, shouldTriggerClick = true) => {
    if (timeout.current) {
      clearTimeout(timeout.current);
      if (!longPressTriggered && shouldTriggerClick) {
        target.current?.click?.();
      }
      setLongPressTriggered(false);
      onCancel?.(e);
    }
  }, [longPressTriggered, onCancel]);

  return {
    onTouchStart: (e) => {
      target.current = e.target;
      start(e);
    },
    onTouchEnd: (e) => clear(e, true),
    onTouchMove: (e) => clear(e, false),
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear
  };
}