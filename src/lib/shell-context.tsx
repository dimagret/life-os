'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type { UiState } from '@/types';
import { useCurrentUiState } from '@/lib/useCurrentUiState';

type ShellContextType = {
  /** When true the Sidebar, BottomNav and right rail are hidden (e.g. during onboarding). */
  hideShell: boolean;
  setHideShell: (v: boolean) => void;
  currentState: UiState;
  setCurrentState: (state: UiState) => void;
};

const ShellContext = createContext<ShellContextType>({
  hideShell: false,
  setHideShell: () => {},
  currentState: 'control',
  setCurrentState: () => {},
});

export function ShellProvider({ children }: { children: ReactNode }) {
  const [hideShell, setHideShell] = useState(false);
  const { currentState, setCurrentState } = useCurrentUiState();
  return (
    <ShellContext.Provider value={{ hideShell, setHideShell, currentState, setCurrentState }}>
      {children}
    </ShellContext.Provider>
  );
}

export const useShell = () => useContext(ShellContext);
