'use client';

import { useCallback, useEffect, useState } from 'react';
import type { UiState } from '@/types';
import { loadAppState, saveAppState } from '@/lib/storage';

const UI_STATE_CHANGED_EVENT = 'lifeos:ui-state-changed';

type UiStateChangedDetail = {
  currentState: UiState;
};

function readCurrentUiState(): UiState {
  return loadAppState().currentState;
}

function applyDocumentState(state: UiState): void {
  if (typeof document === 'undefined') return;
  document.body.dataset.state = state;
}

export function setCurrentUiState(nextState: UiState): void {
  saveAppState({ currentState: nextState });
  applyDocumentState(nextState);

  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<UiStateChangedDetail>(UI_STATE_CHANGED_EVENT, {
      detail: { currentState: nextState },
    })
  );
}

export function useCurrentUiState() {
  const [currentState, setCurrentStateLocal] = useState<UiState>(() =>
    typeof window === 'undefined' ? 'control' : readCurrentUiState()
  );

  useEffect(() => {
    function syncFromStorage() {
      const nextState = readCurrentUiState();
      applyDocumentState(nextState);
      setCurrentStateLocal(nextState);
    }

    function syncFromEvent(event: Event) {
      const detail = (event as CustomEvent<UiStateChangedDetail>).detail;
      if (detail?.currentState) {
        applyDocumentState(detail.currentState);
        setCurrentStateLocal(detail.currentState);
        return;
      }
      syncFromStorage();
    }

    syncFromStorage();
    window.addEventListener(UI_STATE_CHANGED_EVENT, syncFromEvent);
    window.addEventListener('storage', syncFromStorage);
    return () => {
      window.removeEventListener(UI_STATE_CHANGED_EVENT, syncFromEvent);
      window.removeEventListener('storage', syncFromStorage);
    };
  }, []);

  const setCurrentState = useCallback((nextState: UiState) => {
    setCurrentStateLocal(nextState);
    setCurrentUiState(nextState);
  }, []);

  return { currentState, setCurrentState };
}
