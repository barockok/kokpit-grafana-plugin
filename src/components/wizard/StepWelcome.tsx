import React, { useState } from 'react';
import { css } from '@emotion/css';
import { useStyles2, Button, TextArea, Alert, Icon } from '@grafana/ui';
import { GrafanaTheme2 } from '@grafana/data';
import { parseYAMLToState } from '../../lib/yaml-generator';
import type { WizardState } from '../../lib/yaml-generator';

interface Props {
  onStartFresh: () => void;
  onImport: (state: WizardState) => void;
}

export function StepWelcome({ onStartFresh, onImport }: Props) {
  const styles = useStyles2(getStyles);
  const [showImport, setShowImport] = useState(false);
  const [yamlInput, setYamlInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleImport = () => {
    setError(null);
    try {
      const state = parseYAMLToState(yamlInput);
      onImport(state);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse YAML');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.heading}>
        <h2 className={styles.title}>Kokpit SLO Wizard</h2>
        <p className={styles.subtitle}>Create or import an SLO configuration</p>
      </div>

      <div className={styles.cards}>
        <button className={styles.card} onClick={onStartFresh} type="button">
          <div className={styles.cardIcon}>
            <Icon name="plus-circle" size="xxxl" />
          </div>
          <h3 className={styles.cardTitle}>Start Fresh</h3>
          <p className={styles.cardDesc}>Create a new SLO configuration from scratch</p>
        </button>

        <button
          className={`${styles.card} ${showImport ? styles.cardActive : ''}`}
          onClick={() => setShowImport(true)}
          type="button"
        >
          <div className={styles.cardIcon}>
            <Icon name="upload" size="xxxl" />
          </div>
          <h3 className={styles.cardTitle}>Import YAML</h3>
          <p className={styles.cardDesc}>Paste an existing SLO configuration</p>
        </button>
      </div>

      {showImport && (
        <div className={styles.importSection}>
          <TextArea
            value={yamlInput}
            rows={12}
            onChange={(e) => {
              setYamlInput(e.currentTarget.value);
              setError(null);
            }}
            placeholder="Paste your slo.yaml content here..."
          />
          {error && (
            <Alert title="Invalid YAML" severity="error">
              {error}
            </Alert>
          )}
          <Button variant="primary" onClick={handleImport} disabled={!yamlInput.trim()}>
            Import
          </Button>
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
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing(3),
      maxWidth: '640px',
      margin: '0 auto',
      padding: theme.spacing(4, 2),
    }),
    heading: css({
      textAlign: 'center',
    }),
    title: css({
      margin: 0,
      fontSize: theme.typography.h2.fontSize,
    }),
    subtitle: css({
      margin: theme.spacing(0.5, 0, 0),
      color: theme.colors.text.secondary,
    }),
    cards: css({
      display: 'flex',
      gap: theme.spacing(2),
      width: '100%',
    }),
    card: css({
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: theme.spacing(1),
      padding: theme.spacing(3),
      border: `1px solid ${theme.colors.border.weak}`,
      borderRadius: theme.shape.radius.default,
      background: theme.colors.background.secondary,
      cursor: 'pointer',
      transition: 'border-color 0.15s, background 0.15s',
      '&:hover': {
        borderColor: theme.colors.primary.border,
        background: theme.colors.background.primary,
      },
    }),
    cardActive: css({
      borderColor: theme.colors.primary.border,
      background: theme.colors.background.primary,
    }),
    cardIcon: css({
      color: theme.colors.text.secondary,
    }),
    cardTitle: css({
      margin: 0,
      fontSize: theme.typography.h4.fontSize,
    }),
    cardDesc: css({
      margin: 0,
      color: theme.colors.text.secondary,
      fontSize: theme.typography.bodySmall.fontSize,
      textAlign: 'center',
    }),
    importSection: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(1.5),
      width: '100%',
    }),
  };
}
