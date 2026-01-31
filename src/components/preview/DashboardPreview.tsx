import React, { useState, useMemo } from 'react';
import { css } from '@emotion/css';
import { useStyles2, Select, Badge } from '@grafana/ui';
import { GrafanaTheme2, SelectableValue } from '@grafana/data';
import { buildSLIExpr, buildFinalSLIExpr, buildBurnRateExpr, buildErrorBudgetExpr } from '../../lib/expression-builder';
import type { WizardState } from '../../lib/yaml-generator';
import type { SLI } from '../../lib/schema';

interface Props {
  state: WizardState;
}

const WINDOW_OPTIONS: Array<SelectableValue<string>> = [
  { label: '5m', value: '5m' },
  { label: '1h', value: '1h' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
];

function stateToSLIs(state: WizardState): SLI[] {
  return state.slis
    .filter((s) => s.name && s.query)
    .map((s) => ({
      name: s.name,
      type: s.type,
      datasource: s.datasource,
      query: s.query,
      normalize:
        s.type === 'custom' && (s.normalizeMin !== 0 || s.normalizeMax !== 1)
          ? { min: s.normalizeMin, max: s.normalizeMax }
          : undefined,
    }));
}

export function DashboardPreview({ state }: Props) {
  const styles = useStyles2(getStyles);
  const [previewWindow, setPreviewWindow] = useState('5m');

  const slis = useMemo(() => stateToSLIs(state), [state]);
  const composite = useMemo(
    () =>
      slis.length >= 2
        ? { method: state.compositeMethod, weights: state.compositeWeights }
        : undefined,
    [slis.length, state.compositeMethod, state.compositeWeights]
  );

  const exprs = useMemo(() => {
    if (slis.length === 0) {
      return null;
    }
    return {
      sli: buildFinalSLIExpr(slis, composite, state.variables, previewWindow),
      burnRate: buildBurnRateExpr(slis, composite, state.variables, previewWindow, state.target),
      errorBudget: buildErrorBudgetExpr(slis, composite, state.variables, previewWindow, state.target),
      perSLI: slis.map((s) => ({
        name: s.name,
        expr: buildSLIExpr(s, state.variables, previewWindow),
      })),
    };
  }, [slis, composite, state.variables, state.target, previewWindow]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>SLO: {state.name || '(unnamed)'}</h3>
        <Select
          options={WINDOW_OPTIONS}
          value={previewWindow}
          onChange={(v) => setPreviewWindow(v.value ?? '5m')}
          width={12}
        />
      </div>

      {!exprs ? (
        <div className={styles.empty}>Configure at least one SLI with a name and query to see the preview.</div>
      ) : (
        <div className={styles.panels}>
          <Panel title="Target" type="stat" width="quarter">
            <div className={styles.statValue}>{(state.target * 100).toFixed(2)}%</div>
          </Panel>

          <Panel title="SLI Value" type="stat" width="quarter">
            <ExprDisplay expr={exprs.sli} />
          </Panel>

          <Panel title="Error Budget" type="gauge" width="quarter">
            <ExprDisplay expr={exprs.errorBudget} />
          </Panel>

          <Panel title="Burn Rate" type="timeseries" width="quarter">
            <ExprDisplay expr={exprs.burnRate} />
          </Panel>

          <Panel title="SLI Trend" type="timeseries" width="full">
            <ExprDisplay expr={exprs.sli} />
          </Panel>

          {slis.length >= 2 && (
            <>
              <div className={styles.sectionTitle}>
                <Badge text="SLI Breakdown" color="blue" />
              </div>
              {exprs.perSLI.map((s) => (
                <Panel key={s.name} title={s.name} type="stat" width="half">
                  <ExprDisplay expr={s.expr} />
                </Panel>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Panel({
  title,
  type,
  width,
  children,
}: {
  title: string;
  type: string;
  width: 'quarter' | 'half' | 'full';
  children: React.ReactNode;
}) {
  const styles = useStyles2(getStyles);
  const widthClass = width === 'full' ? styles.panelFull : width === 'half' ? styles.panelHalf : styles.panelQuarter;

  return (
    <div className={`${styles.panel} ${widthClass}`}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>{title}</span>
        <Badge text={type} color="orange" />
      </div>
      <div className={styles.panelBody}>{children}</div>
    </div>
  );
}

function ExprDisplay({ expr }: { expr: string }) {
  const styles = useStyles2(getStyles);
  return <code className={styles.expr}>{expr}</code>;
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(2),
    }),
    header: css({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }),
    empty: css({
      color: theme.colors.text.secondary,
      textAlign: 'center',
      padding: theme.spacing(4),
    }),
    panels: css({
      display: 'flex',
      flexWrap: 'wrap',
      gap: theme.spacing(1),
    }),
    sectionTitle: css({
      width: '100%',
      paddingTop: theme.spacing(1),
    }),
    panel: css({
      border: `1px solid ${theme.colors.border.weak}`,
      borderRadius: theme.shape.radius.default,
      overflow: 'hidden',
    }),
    panelQuarter: css({
      flex: '1 1 calc(25% - 8px)',
      minWidth: '140px',
    }),
    panelHalf: css({
      flex: '1 1 calc(50% - 8px)',
      minWidth: '200px',
    }),
    panelFull: css({
      flex: '1 1 100%',
    }),
    panelHeader: css({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing(0.5, 1),
      background: theme.colors.background.secondary,
      borderBottom: `1px solid ${theme.colors.border.weak}`,
      fontSize: theme.typography.bodySmall.fontSize,
    }),
    panelTitle: css({
      fontWeight: theme.typography.fontWeightMedium,
    }),
    panelBody: css({
      padding: theme.spacing(1),
      minHeight: '60px',
    }),
    statValue: css({
      fontSize: theme.typography.h3.fontSize,
      fontWeight: theme.typography.fontWeightBold,
      color: theme.colors.text.primary,
    }),
    expr: css({
      fontSize: theme.typography.bodySmall.fontSize,
      color: theme.colors.text.secondary,
      wordBreak: 'break-all',
      display: 'block',
    }),
  };
}
