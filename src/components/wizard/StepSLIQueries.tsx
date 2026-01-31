import React from 'react';
import { css } from '@emotion/css';
import { useStyles2, Input, Field, Select, Button, IconButton, TextArea, RadioButtonGroup, Slider } from '@grafana/ui';
import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';
import type { WizardState, SLIState } from '../../lib/yaml-generator';

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

export function StepSLIQueries({ state, update, updateSLI, addSLI, removeSLI }: Props) {
  const styles = useStyles2(getStyles);

  // Get available Prometheus datasources
  let datasources: Array<SelectableValue<string>> = [];
  try {
    datasources = getDataSourceSrv()
      .getList({ type: 'prometheus' })
      .map((ds) => ({ label: ds.name, value: ds.name }));
  } catch {
    datasources = [{ label: 'prometheus', value: 'prometheus' }];
  }

  return (
    <div className={styles.container}>
      {state.slis.map((sli, i) => (
        <div key={i} className={styles.sliCard}>
          <div className={styles.sliHeader}>
            <h4>SLI {i + 1}</h4>
            {state.slis.length > 1 && (
              <IconButton name="trash-alt" tooltip="Remove SLI" onClick={() => removeSLI(i)} />
            )}
          </div>

          <Field label="Name" required>
            <Input
              value={sli.name}
              onChange={(e) => updateSLI(i, { name: e.currentTarget.value })}
              placeholder="availability"
            />
          </Field>

          <Field label="Type">
            <RadioButtonGroup
              options={TYPE_OPTIONS}
              value={sli.type}
              onChange={(v) => updateSLI(i, { type: v as SLIState['type'] })}
            />
          </Field>

          <Field label="Datasource">
            <Select
              options={datasources}
              value={sli.datasource}
              onChange={(v) => updateSLI(i, { datasource: v.value ?? 'prometheus' })}
            />
          </Field>

          <Field label="Query" description="Use {{window}} for window placeholder, {{.var}} for variables">
            <TextArea
              value={sli.query}
              rows={4}
              onChange={(e) => updateSLI(i, { query: e.currentTarget.value })}
              placeholder="sum(rate(http_requests_total{code=~'5..'}[{{window}}])) / sum(rate(http_requests_total[{{window}}]))"
            />
          </Field>

          {sli.type === 'custom' && (
            <div className={styles.normalizeRow}>
              <Field label="Normalize Min" description="Best-case value, maps to 1.0 (e.g. 0.0)">
                <Input
                  type="number"
                  step={0.1}
                  placeholder="0.0"
                  value={sli.normalizeMin}
                  onChange={(e) => updateSLI(i, { normalizeMin: parseFloat(e.currentTarget.value) || 0 })}
                />
              </Field>
              <Field label="Normalize Max" description="Worst-case value, maps to 0.0 (e.g. 1000.0)">
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
      ))}

      <Button variant="secondary" icon="plus" onClick={addSLI}>
        Add SLI
      </Button>

      {state.slis.length >= 2 && (
        <div className={styles.composite}>
          <Field label="Composite Method" description="How to combine multiple SLIs into a single value">
            <RadioButtonGroup
              options={COMPOSITE_OPTIONS}
              value={state.compositeMethod}
              onChange={(v) => update('compositeMethod', v as WizardState['compositeMethod'])}
            />
          </Field>

          {state.compositeMethod === 'weighted' && (
            <div className={styles.weights}>
              {state.slis
                .filter((s) => s.name)
                .map((sli) => (
                  <Field key={sli.name} label={`${sli.name} — ${((state.compositeWeights[sli.name] ?? 0) * 100).toFixed(0)}%`}>
                    <Slider
                      min={0}
                      max={1}
                      step={0.05}
                      value={state.compositeWeights[sli.name] ?? 0}
                      onChange={(v) =>
                        update('compositeWeights', {
                          ...state.compositeWeights,
                          [sli.name]: v,
                        })
                      }
                      inputId={`weight-${sli.name}`}
                    />
                  </Field>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(2),
    }),
    sliCard: css({
      border: `1px solid ${theme.colors.border.weak}`,
      borderRadius: theme.shape.radius.default,
      padding: theme.spacing(2),
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(1),
    }),
    sliHeader: css({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }),
    normalizeRow: css({
      display: 'flex',
      gap: theme.spacing(2),
    }),
    composite: css({
      border: `1px solid ${theme.colors.border.weak}`,
      borderRadius: theme.shape.radius.default,
      padding: theme.spacing(2),
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(1),
    }),
    weights: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(1),
    }),
  };
}
