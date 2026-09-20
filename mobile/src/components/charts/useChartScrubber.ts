import { useRef } from 'react';
import { PanResponder, type View } from 'react-native';
import { feedback } from '@/utils/feedback';

export function useChartScrubber(count: number, left: number, right: number, onIndex: (index: number) => void) {
  const ref = useRef<View>(null);
  const latest = useRef({ count, left, right, onIndex });
  latest.current = { count, left, right, onIndex };
  const origin = useRef(0);
  const last = useRef(-1);
  const select = (pageX: number) => {
    const props = latest.current;
    if (!props.count) return;
    const ratio = Math.max(0, Math.min(1, (pageX - origin.current - props.left) / Math.max(1, props.right - props.left)));
    const index = Math.round(ratio * (props.count - 1));
    if (index !== last.current) { last.current = index; props.onIndex(index); feedback(); }
  };
  const responder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
    onPanResponderGrant: (_, gesture) => { last.current = -1; const pageX = gesture.moveX; ref.current?.measureInWindow(x => { origin.current = x; select(pageX); }); },
    onPanResponderMove: (_, gesture) => select(gesture.moveX),
    onPanResponderTerminationRequest: () => true,
  })).current;
  return { ref, panHandlers: responder.panHandlers };
}
