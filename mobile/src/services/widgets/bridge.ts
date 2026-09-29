import type { HomeWidgetSnapshot } from './model';
// Expo Go, Android and web keep the app usable; the iOS extension is optional.
export const supportsHomeWidget = () => false;
export function publishHomeWidget(_current: HomeWidgetSnapshot, _expiry?: { date: Date; props: HomeWidgetSnapshot }): void {}
