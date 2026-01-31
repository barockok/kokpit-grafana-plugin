import React, { useState } from 'react';
import { css } from '@emotion/css';
import { useStyles2, Input, Field, Collapse, Checkbox } from '@grafana/ui';
import { GrafanaTheme2 } from '@grafana/data';
import { KeyValueEditor } from '../shared/KeyValueEditor';
import type { WizardState } from '../../lib/yaml-generator';

interface Props {
  state: WizardState;
  update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
}

const WINDOW_OPTIONS = ['1h', '1d', '7d', '30d'];

export function StepSLOBasics({ state, update }: Props) {
  const styles = useStyles2(getStyles);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const toggleWindow = (w: string) => {
    const windows = state.windows.includes(w)
      ? state.windows.filter((x) => x !== w)
      : [...state.windows, w];
    update('windows', windows);
  };

  return (
    <div className={styles.container}>
      <Field label="SLO Name" description="Lowercase with hyphens (e.g., api-gateway)" required>
        <Input
          value={state.name}
          onChange={(e) => update('name', e.currentTarget.value)}
          placeholder="my-service"
        />
      </Field>

      <Field label="Target" description="SLO target between 0 and 1" required>
        <Input
          type="number"
          step="0.001"
          min={0}
          max={1}
          value={state.target}
          onChange={(e) => update('target', parseFloat(e.currentTarget.value) || 0)}
        />
      </Field>

      <Collapse label="Advanced Settings" isOpen={advancedOpen} onToggle={() => setAdvancedOpen(!advancedOpen)}>
        <div className={styles.advanced}>
          <Field label="Windows">
            <div className={styles.checkboxRow}>
              {WINDOW_OPTIONS.map((w) => (
                <Checkbox
                  key={w}
                  label={w}
                  value={state.windows.includes(w)}
                  onChange={() => toggleWindow(w)}
                />
              ))}
            </div>
          </Field>

          <Field label="Description">
            <Input
              value={state.description}
              onChange={(e) => update('description', e.currentTarget.value)}
              placeholder="Service reliability description"
            />
          </Field>

          <Field label="Tags">
            <KeyValueEditor
              values={state.tags}
              onChange={(v) => update('tags', v)}
              keyPlaceholder="Tag name"
              valuePlaceholder="Tag value"
            />
          </Field>

          <Field label="Variables" description="Referenced in queries as {{.key}}">
            <KeyValueEditor
              values={state.variables}
              onChange={(v) => update('variables', v)}
              keyPlaceholder="Variable name"
              valuePlaceholder="Variable value"
            />
          </Field>
        </div>
      </Collapse>
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
    advanced: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(2),
      padding: theme.spacing(1, 0),
    }),
    checkboxRow: css({
      display: 'flex',
      gap: theme.spacing(2),
    }),
  };
}
