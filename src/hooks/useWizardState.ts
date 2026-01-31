import { useState, useCallback } from 'react';
import { createDefaultState, createDefaultSLI } from '../lib/yaml-generator';
import type { WizardState, SLIState } from '../lib/yaml-generator';

export function useWizardState() {
  const [state, setState] = useState<WizardState>(createDefaultState);
  const [step, setStep] = useState(0);

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
    nextStep,
    prevStep,
    goToStep,
  };
}
