import React, { useMemo, useState, useCallback } from 'react';
import { css } from '@emotion/css';
import { useStyles2, Input, Field, Select, Button, IconButton, RadioButtonGroup, Slider, InlineLabel, Alert, Collapse } from '@grafana/ui';
import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';
import type { WizardState, SLIState } from '../../lib/yaml-generator';
import { QueryEditorContainer } from './QueryEditorContainer';

interface Props {
  state: WizardState;
  update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
  updateSLI: (index: number, changes: Partial<SLIState>) => void;
  addSLI: () => void;
  removeSLI: (index: number) => void;
}

const TYPE_OPTIONS: Array<SelectableValue<string>> = [
  { label: 'Ratio', value: 'ratio' },
  { label: 'Custom', value: 'custom' },
];

const COMPOSITE_OPTIONS: Array<SelectableValue<string>> = [
  { label: 'Average', value: 'average' },
  { label: 'Weighted', value: 'weighted' },
  { label: 'Minimum', value: 'minimum' },
];

const STEP_OPTIONS: Array<SelectableValue<number>> = [
  { label: '0.01', value: 0.01 },
  { label: '0.05', value: 0.05 },
  { label: '0.1', value: 0.1 },
];

const MODE_OPTIONS: Array<SelectableValue<string>> = [
  { label: 'Sliders', value: 'sliders' },
  { label: 'Manual', value: 'manual' },
];

export function StepSLIQueries({ state, update, updateSLI, addSLI, removeSLI }: Props) {
  const styles = useStyles2(getStyles);
  const [expandedSLIs, setExpandedSLIs] = useState<Set<number>>(() => new Set(state.slis.map((_, i) => i)));

  const toggleSLI = useCallback((index: number) => {
    setExpandedSLIs((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleAddSLI = useCallback(() => {
    addSLI();
    setExpandedSLIs((prev) => new Set(prev).add(state.slis.length));
  }, [addSLI, state.slis.length]);

  const handleRemoveSLI = useCallback(
    (index: number) => {
      removeSLI(index);
      setExpandedSLIs((prev) => {
        const next = new Set<number>();
        for (const i of prev) {
          if (i < index) {
            next.add(i);
          } else if (i > index) {
            next.add(i - 1);
          }
        }
        return next;
      });
    },
    [removeSLI]
  );

  // Get available Prometheus datasources
  let datasources: Array<SelectableValue<string>> = [];
  try {
    datasources = getDataSourceSrv()
      .getList({ type: 'prometheus' })
      .map((ds) => ({ label: ds.name, value: ds.name }));
  } catch {
    datasources = [{ label: 'prometheus', value: 'prometheus' }];
  }

  const namedSLIs = state.slis.filter((s) => s.name);
  const totalWeight = useMemo(
    () => namedSLIs.reduce((sum, sli) => sum + (state.compositeWeights[sli.name] ?? 0), 0),
    [namedSLIs, state.compositeWeights]
  );
  const isWeightExceeded = totalWeight > 1.0 + 1e-9;
  const isWeightAtMax = totalWeight >= 1.0 - 1e-9;

  const handleWeightChange = (sliName: string, newValue: number) => {
    const clamped = Math.max(0, Math.min(1, newValue));
    update('compositeWeights', {
      ...state.compositeWeights,
      [sliName]: Math.round(clamped * 1000) / 1000,
    });
  };

  return (
    <div className={styles.container}>
      {state.slis.map((sli, i) => {
        const isExpanded = expandedSLIs.has(i);
        const summary = sli.name || 'unnamed';
        const detail = sli.datasource && sli.query
          ? ` — ${sli.datasource}: ${sli.query.slice(0, 40)}${sli.query.length > 40 ? '…' : ''}`
          : '';

        return (
          <div key={i} className={styles.sliCard}>
            <div className={styles.sliHeader}>
              <h4
                className={styles.sliTitle}
                onClick={() => toggleSLI(i)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { toggleSLI(i); } }}
              >
                SLI {i + 1}: {summary}{!isExpanded ? detail : ''}
              </h4>
              {state.slis.length > 1 && (
                <IconButton name="trash-alt" tooltip="Remove SLI" onClick={() => handleRemoveSLI(i)} />
              )}
            </div>

            <Collapse label="" isOpen={isExpanded} onToggle={() => toggleSLI(i)} collapsible>
              <div className={styles.sliBody}>
                <div className={styles.inlineRow}>
                  <Field label="Name" className={styles.flexField} required>
                    <Input
                      value={sli.name}
                      onChange={(e) => updateSLI(i, { name: e.currentTarget.value })}
                      placeholder="availability"
                    />
                  </Field>
                  <Field label="Type" className={styles.typeField}>
                    <RadioButtonGroup
                      options={TYPE_OPTIONS}
                      value={sli.type}
                      onChange={(v) => updateSLI(i, { type: v as SLIState['type'] })}
                    />
                  </Field>
                </div>

                <Field label="Datasource" className={styles.compactField}>
                  <Select
                    options={datasources}
                    value={sli.datasource}
                    onChange={(v) => updateSLI(i, { datasource: v.value ?? 'prometheus' })}
                  />
                </Field>

                <Field label="Query" description="Use {{window}} for window placeholder, {{.var}} for variables" className={styles.compactField}>
                  <QueryEditorContainer
                    datasourceName={sli.datasource}
                    query={sli.query}
                    onChange={(expr) => updateSLI(i, { query: expr })}
                  />
                </Field>

                {sli.type === 'custom' && (
                  <div className={styles.normalizeRow}>
                    <Field label="Normalize Min" description="Best-case value, maps to 1.0">
                      <Input
                        type="number"
                        step={0.1}
                        placeholder="0.0"
                        value={sli.normalizeMin}
                        onChange={(e) => updateSLI(i, { normalizeMin: parseFloat(e.currentTarget.value) || 0 })}
                      />
                    </Field>
                    <Field label="Normalize Max" description="Worst-case value, maps to 0.0">
                      <Input
                        type="number"
                        step={0.1}
                        placeholder="1.0"
                        value={sli.normalizeMax}
                        onChange={(e) => updateSLI(i, { normalizeMax: parseFloat(e.currentTarget.value) || 0 })}
                      />
                    </Field>
                  </div>
                )}
              </div>
            </Collapse>
          </div>
        );
      })}

      <Button variant="secondary" icon="plus" onClick={handleAddSLI} size="sm">
        Add SLI
      </Button>

      {state.slis.length >= 2 && (
        <div className={styles.composite}>
          <Field label="Composite Method" description="How to combine multiple SLIs into a single value" className={styles.compactField}>
            <RadioButtonGroup
              options={COMPOSITE_OPTIONS}
              value={state.compositeMethod}
              onChange={(v) => update('compositeMethod', v as WizardState['compositeMethod'])}
            />
          </Field>

          {state.compositeMethod === 'weighted' && (
            <div className={styles.weights}>
              <div className={styles.weightControls}>
                <div className={styles.weightControlGroup}>
                  <InlineLabel width="auto">Step size</InlineLabel>
                  <RadioButtonGroup
                    options={STEP_OPTIONS}
                    value={state.weightStepSize}
                    onChange={(v) => update('weightStepSize', v)}
                    size="sm"
                  />
                </div>
                <div className={styles.weightControlGroup}>
                  <InlineLabel width="auto">Mode</InlineLabel>
                  <RadioButtonGroup
                    options={MODE_OPTIONS}
                    value={state.weightInputMode}
                    onChange={(v) => update('weightInputMode', v as WizardState['weightInputMode'])}
                    size="sm"
                  />
                </div>
              </div>

              <div className={styles.weightTotal}>
                <span>Total: {(totalWeight * 100).toFixed(1)}% / 100%</span>
              </div>

              {isWeightExceeded && (
                <Alert title="Total weight exceeds 100%" severity="error">
                  Reduce weights before proceeding. The Next button is disabled.
                </Alert>
              )}

              {!isWeightExceeded && !isWeightAtMax && totalWeight > 0 && (
                <Alert title={`Weights sum to ${(totalWeight * 100).toFixed(1)}%`} severity="warning">
                  Weights sum to less than 100%.
                </Alert>
              )}

              {namedSLIs.map((sli) => {
                const weight = state.compositeWeights[sli.name] ?? 0;
                const pct = (weight * 100).toFixed(1);

                return (
                  <Field key={sli.name} label={`${sli.name} — ${pct}%`} className={styles.compactField}>
                    {state.weightInputMode === 'sliders' ? (
                      <Slider
                        min={0}
                        max={1}
                        step={state.weightStepSize}
                        value={weight}
                        onChange={(v) => handleWeightChange(sli.name, v)}
                        inputId={`weight-${sli.name}`}
                      />
                    ) : (
                      <Input
                        type="number"
                        min={0}
                        max={1}
                        step={state.weightStepSize}
                        value={weight}
                        onChange={(e) => {
                          const v = parseFloat(e.currentTarget.value);
                          if (!isNaN(v)) {
                            handleWeightChange(sli.name, v);
                          }
                        }}
                      />
                    )}
                  </Field>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function useWeightValidation(state: WizardState): boolean {
  if (state.slis.length < 2 || state.compositeMethod !== 'weighted') {
    return true;
  }
  const namedSLIs = state.slis.filter((s) => s.name);
  const total = namedSLIs.reduce((sum, sli) => sum + (state.compositeWeights[sli.name] ?? 0), 0);
  return total <= 1.0 + 1e-9;
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(1.5),
    }),
    sliCard: css({
      border: `1px solid ${theme.colors.border.weak}`,
      borderRadius: theme.shape.radius.default,
      padding: theme.spacing(1.5),
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(0.5),
    }),
    sliHeader: css({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing(0.5),
    }),
    sliTitle: css({
      margin: 0,
      fontSize: theme.typography.body.fontSize,
      cursor: 'pointer',
      userSelect: 'none',
    }),
    sliBody: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(0.5),
    }),
    inlineRow: css({
      display: 'flex',
      gap: theme.spacing(1),
      alignItems: 'flex-start',
    }),
    flexField: css({
      flex: 1,
      marginBottom: 0,
    }),
    typeField: css({
      flex: '0 0 auto',
      marginBottom: 0,
    }),
    compactField: css({
      marginBottom: 0,
    }),
    normalizeRow: css({
      display: 'flex',
      gap: theme.spacing(1),
    }),
    composite: css({
      border: `1px solid ${theme.colors.border.weak}`,
      borderRadius: theme.shape.radius.default,
      padding: theme.spacing(1.5),
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(0.5),
    }),
    weights: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(0.5),
    }),
    weightControls: css({
      display: 'flex',
      gap: theme.spacing(2),
      alignItems: 'center',
      flexWrap: 'wrap',
      marginBottom: theme.spacing(0.5),
    }),
    weightControlGroup: css({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(0.5),
    }),
    weightTotal: css({
      fontSize: theme.typography.bodySmall.fontSize,
      color: theme.colors.text.secondary,
      fontWeight: theme.typography.fontWeightMedium,
      padding: theme.spacing(0.5, 0),
    }),
  };
}
