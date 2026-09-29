import { requireOptionalNativeModule } from 'expo';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { HomeWidgetSnapshot } from './model';

export const supportsHomeWidget = () => Constants.executionEnvironment !== ExecutionEnvironment.StoreClient && Boolean(requireOptionalNativeModule('ExpoWidgets'));
export function publishHomeWidget(current: HomeWidgetSnapshot, expiry?: { date: Date; props: HomeWidgetSnapshot }): void {
  if (!supportsHomeWidget()) return;
  // Guard before loading native UI: an older development build must keep working.
  const widget = (require('./TodayWidget') as typeof import('./TodayWidget')).default;
  widget.updateTimeline([{ date: new Date(), props: current }, ...(expiry ? [expiry] : [])]);
}
