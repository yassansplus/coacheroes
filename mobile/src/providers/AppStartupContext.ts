import { createContext, useContext } from 'react';

/** Prevent launch-time navigation and celebrations from covering the splash. */
export const AppStartupContext = createContext(false);
export const useAppStarting = () => useContext(AppStartupContext);
