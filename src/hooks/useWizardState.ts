import { useState, useCallback, useEffect } from 'react';
import { createDefaultState, createDefaultSLI } from '../lib/yaml-generator';
import type { WizardState, SLIState } from '../lib/yaml-generator';

const STORAGE_KEY_STATE = 'kokpit-wizard-state';
const STORAGE_KEY_STEP = 'kokpit-wizard-step';

function loadState(): WizardState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATE);
    if (raw) {
      return JSON.parse(raw) as WizardState;
    }
  } catch {
    // ignore corrupt data
  }
  return createDefaultState();
}

function loadStep(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STEP);
    if (raw) {
      const n = parseInt(raw, 10);
      if (n >= 0 && n <= 2) {
        return n;
      }
    }
  } catch {
    // ignore
  }
  return 0;
}

export function useWizardState() {
  const [state, setState] = useState<WizardState>(loadState);
  const [step, setStep] = useState(loadStep);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_STEP, String(step));
  }, [step]);

  const update = useCallback(<K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateSLI = useCallback((index: number, changes: Partial<SLIState>) => {
    setState((prev) => {
      const slis = [...prev.slis];
      slis[index] = { ...slis[index], ...changes };
      return { ...prev, slis };
    });
  }, []);

  const addSLI = useCallback(() => {
    setState((prev) => ({ ...prev, slis: [...prev.slis, createDefaultSLI()] }));
  }, []);

  const removeSLI = useCallback((index: number) => {
    setState((prev) => {
      const slis = prev.slis.filter((_, i) => i !== index);
      return { ...prev, slis: slis.length === 0 ? [createDefaultSLI()] : slis };
    });
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_STATE);
    localStorage.removeItem(STORAGE_KEY_STEP);
    setState(createDefaultState());
    setStep(0);
  }, []);

  const nextStep = useCallback(() => setStep((s) => Math.min(s + 1, 2)), []);
  const prevStep = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);
  const goToStep = useCallback((s: number) => setStep(s), []);

  return {
    state,
    step,
    update,
    updateSLI,
    addSLI,
    removeSLI,
    reset,
    nextStep,
    prevStep,
    goToStep,
  };
}
