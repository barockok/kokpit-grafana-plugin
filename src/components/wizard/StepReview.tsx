import React, { useState, useMemo } from 'react';
import { css } from '@emotion/css';
import { useStyles2, Button, Field, Input, Collapse, TextArea, Select } from '@grafana/ui';
import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { generateYAML } from '../../lib/yaml-generator';
import type { WizardState } from '../../lib/yaml-generator';

interface Props {
  state: WizardState;
  update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
}

const SEVERITY_OPTIONS: Array<SelectableValue<string>> = [
  { label: 'critical', value: 'critical' },
  { label: 'warning', value: 'warning' },
  { label: 'info', value: 'info' },
];

export function StepReview({ state, update }: Props) {
  const styles = useStyles2(getStyles);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const yaml = useMemo(() => generateYAML(state), [state]);

  const download = () => {
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.name || 'slo'}.slo.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(yaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.container}>
      <Field label="Grafana Folder">
        <Input
          value={state.grafanaFolder}
          onChange={(e) => update('grafanaFolder', e.currentTarget.value)}
        />
      </Field>

      <Collapse label="Alert Settings" isOpen={alertsOpen} onToggle={() => setAlertsOpen(!alertsOpen)}>
        <div className={styles.alertSection}>
          <Field label="Enable Alerts">
            <input
              type="checkbox"
              checked={state.alertsEnabled}
              onChange={(e) => update('alertsEnabled', e.target.checked)}
            />
          </Field>

          {state.alertsEnabled && (
            <>
              <h5>Fast Burn</h5>
              <div className={styles.alertRow}>
                <Field label="Window">
                  <Input
                    value={state.fastBurn.window}
                    onChange={(e) =>
                      update('fastBurn', { ...state.fastBurn, window: e.currentTarget.value })
                    }
                  />
                </Field>
                <Field label="Burn Rate">
                  <Input
                    type="number"
                    step="0.1"
                    value={state.fastBurn.burnRate}
                    onChange={(e) =>
                      update('fastBurn', {
                        ...state.fastBurn,
                        burnRate: parseFloat(e.currentTarget.value) || 0,
                      })
                    }
                  />
                </Field>
                <Field label="Severity">
                  <Select
                    options={SEVERITY_OPTIONS}
                    value={state.fastBurn.severity}
                    onChange={(v) =>
                      update('fastBurn', { ...state.fastBurn, severity: v.value ?? 'critical' })
                    }
                  />
                </Field>
              </div>

              <h5>Slow Burn</h5>
              <div className={styles.alertRow}>
                <Field label="Window">
                  <Input
                    value={state.slowBurn.window}
                    onChange={(e) =>
                      update('slowBurn', { ...state.slowBurn, window: e.currentTarget.value })
                    }
                  />
                </Field>
                <Field label="Burn Rate">
                  <Input
                    type="number"
                    step="0.1"
                    value={state.slowBurn.burnRate}
                    onChange={(e) =>
                      update('slowBurn', {
                        ...state.slowBurn,
                        burnRate: parseFloat(e.currentTarget.value) || 0,
                      })
                    }
                  />
                </Field>
                <Field label="Severity">
                  <Select
                    options={SEVERITY_OPTIONS}
                    value={state.slowBurn.severity}
                    onChange={(v) =>
                      update('slowBurn', { ...state.slowBurn, severity: v.value ?? 'warning' })
                    }
                  />
                </Field>
              </div>
            </>
          )}
        </div>
      </Collapse>

      <div className={styles.yamlSection}>
        <h4>Generated YAML</h4>
        <TextArea value={yaml} rows={15} readOnly />
        <div className={styles.actions}>
          <Button variant="primary" icon="download-alt" onClick={download}>
            Download YAML
          </Button>
          <Button variant="secondary" icon="copy" onClick={copyToClipboard}>
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </Button>
        </div>
      </div>
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
    alertSection: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(1),
      padding: theme.spacing(1, 0),
    }),
    alertRow: css({
      display: 'flex',
      gap: theme.spacing(2),
    }),
    yamlSection: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(1),
    }),
    actions: css({
      display: 'flex',
      gap: theme.spacing(1),
    }),
  };
}
