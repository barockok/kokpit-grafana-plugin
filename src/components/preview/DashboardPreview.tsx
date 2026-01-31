import React, { useState, useMemo } from 'react';
import { css } from '@emotion/css';
import { useStyles2, Select, Badge, Spinner } from '@grafana/ui';
import { GrafanaTheme2, LoadingState, type PanelData, type SelectableValue } from '@grafana/data';
import { PanelRenderer } from '@grafana/runtime';
import { buildSLIExpr, buildFinalSLIExpr, buildBurnRateExpr, buildErrorBudgetExpr } from '../../lib/expression-builder';
import { useContainerSize } from '../../hooks/useContainerSize';
import { usePrometheusQuery, usePrometheusQueries } from '../../hooks/usePrometheusQuery';
import { createStaticStatData } from '../../lib/static-panel-data';
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

const PANEL_HEIGHT = 120;
const TIMESERIES_HEIGHT = 200;

function stateToSLIs(state: WizardState): SLI[] {
  return state.slis
    .filter((s) => s.query)
    .map((s, i) => ({
      name: s.name || `SLI ${i + 1}`,
      type: s.type,
      datasource: s.datasource,
      query: s.query,
      normalize:
        s.type === 'custom' && (s.normalizeMin !== 0 || s.normalizeMax !== 1)
          ? { min: s.normalizeMin, max: s.normalizeMax }
          : undefined,
    }));
}

function primaryDatasource(slis: SLI[]): string {
  return slis[0]?.datasource ?? 'prometheus';
}

/** Panel that renders a live Grafana visualization via PanelRenderer. */
function PreviewPanel({
  title,
  pluginId,
  expr,
  datasource,
  staticData,
  queryType = 'instant',
  window,
  width: widthClass,
  height: panelHeight,
  options,
  fieldConfig,
}: {
  title: string;
  pluginId: string;
  expr?: string;
  datasource?: string;
  staticData?: PanelData;
  queryType?: 'instant' | 'range';
  window: string;
  width: 'quarter' | 'half' | 'full';
  height: number;
  options?: Record<string, unknown>;
  fieldConfig?: Record<string, unknown>;
}) {
  const styles = useStyles2(getStyles);
  const { ref, width: containerWidth } = useContainerSize();
  const liveData = usePrometheusQuery({
    expr: staticData ? '' : (expr ?? ''),
    datasource: datasource ?? 'prometheus',
    queryType,
    window,
  });

  const data = staticData ?? liveData;
  const isLoading = data?.state === LoadingState.Loading;
  const isError = data?.state === LoadingState.Error;
  const widthCls =
    widthClass === 'full' ? styles.panelFull : widthClass === 'half' ? styles.panelHalf : styles.panelQuarter;

  return (
    <div className={`${styles.panel} ${widthCls}`}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>{title}</span>
        <Badge text={pluginId} color="orange" />
      </div>
      <div ref={ref} className={styles.panelBody} style={{ height: panelHeight }}>
        {isLoading && (
          <div className={styles.centered}>
            <Spinner />
          </div>
        )}
        {isError && (
          <div className={styles.errorText}>
            {data?.errors?.[0]?.message ?? 'Query error'}
          </div>
        )}
        {data && !isLoading && !isError && containerWidth > 0 ? (
          <PanelRenderer
            pluginId={pluginId}
            title=""
            data={data}
            width={containerWidth}
            height={panelHeight}
            options={options ?? {}}
            fieldConfig={fieldConfig ?? { defaults: {}, overrides: [] }}
          />
        ) : (
          !isLoading && !isError && (
            <code className={styles.expr}>{expr ?? ''}</code>
          )
        )}
      </div>
      {expr && (
        <div className={styles.panelSubtitle}>
          <code className={styles.expr}>{expr}</code>
        </div>
      )}
    </div>
  );
}

function SLIBreakdownPanel({
  perSLI,
  datasource,
  window,
}: {
  perSLI: Array<{ name: string; expr: string; datasource: string }>;
  datasource: string;
  window: string;
}) {
  const styles = useStyles2(getStyles);
  const { ref, width: containerWidth } = useContainerSize();

  const targets = useMemo(
    () =>
      perSLI.map((s, i) => ({
        expr: s.expr,
        refId: String.fromCharCode(65 + i),
        legendFormat: s.name,
      })),
    [perSLI]
  );

  const data = usePrometheusQueries({
    targets,
    datasource,
    window,
  });

  const isLoading = data?.state === LoadingState.Loading;
  const isError = data?.state === LoadingState.Error;

  return (
    <div className={`${styles.panel} ${styles.panelFull}`}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>SLI Breakdown</span>
        <Badge text="timeseries" color="orange" />
      </div>
      <div ref={ref} className={styles.panelBody} style={{ height: TIMESERIES_HEIGHT }}>
        {isLoading && (
          <div className={styles.centered}>
            <Spinner />
          </div>
        )}
        {isError && (
          <div className={styles.errorText}>
            {data?.errors?.[0]?.message ?? 'Query error'}
          </div>
        )}
        {data && !isLoading && !isError && containerWidth > 0 ? (
          <PanelRenderer
            pluginId="timeseries"
            title=""
            data={data}
            width={containerWidth}
            height={TIMESERIES_HEIGHT}
            options={{ legend: { displayMode: 'list', placement: 'bottom' } }}
            fieldConfig={{
              defaults: {
                unit: 'percentunit',
                custom: { lineWidth: 2, fillOpacity: 10, spanNulls: true },
              },
              overrides: [],
            }}
          />
        ) : (
          !isLoading &&
          !isError && (
            <code className={styles.expr}>
              {perSLI.map((s) => s.expr).join('\n')}
            </code>
          )
        )}
      </div>
      <div className={styles.panelSubtitle}>
        <code className={styles.expr}>
          {perSLI.map((s) => `${s.name}: ${s.expr}`).join(' | ')}
        </code>
      </div>
    </div>
  );
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

  const ds = primaryDatasource(slis);

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
        datasource: s.datasource,
      })),
    };
  }, [slis, composite, state.variables, state.target, previewWindow]);

  const targetData = useMemo(
    () => createStaticStatData(state.target * 100),
    [state.target]
  );

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
          <PreviewPanel
            title="Target"
            pluginId="stat"
            staticData={targetData}
            window={previewWindow}
            width="quarter"
            height={PANEL_HEIGHT}
            options={{ colorMode: 'background', graphMode: 'none' }}
            fieldConfig={{
              defaults: { unit: 'percent', thresholds: { mode: 'absolute', steps: [{ color: 'green', value: null }] } },
              overrides: [],
            }}
          />

          <PreviewPanel
            title="SLI Value"
            pluginId="stat"
            expr={exprs.sli}
            datasource={ds}
            window={previewWindow}
            width="quarter"
            height={PANEL_HEIGHT}
            options={{ colorMode: 'background', graphMode: 'area' }}
            fieldConfig={{
              defaults: {
                unit: 'percentunit',
                thresholds: { mode: 'absolute', steps: [
                  { color: 'red', value: null },
                  { color: 'orange', value: state.target - 0.01 },
                  { color: 'green', value: state.target },
                ]},
              },
              overrides: [],
            }}
          />

          <PreviewPanel
            title="Error Budget"
            pluginId="gauge"
            expr={exprs.errorBudget}
            datasource={ds}
            window={previewWindow}
            width="quarter"
            height={PANEL_HEIGHT}
            options={{ showThresholdLabels: false, showThresholdMarkers: true }}
            fieldConfig={{
              defaults: {
                unit: 'percentunit',
                min: 0,
                max: 1,
                thresholds: { mode: 'absolute', steps: [
                  { color: 'red', value: null },
                  { color: 'orange', value: 0.25 },
                  { color: 'green', value: 0.5 },
                ]},
              },
              overrides: [],
            }}
          />

          <PreviewPanel
            title="Burn Rate"
            pluginId="timeseries"
            expr={exprs.burnRate}
            datasource={ds}
            queryType="range"
            window={previewWindow}
            width="quarter"
            height={PANEL_HEIGHT}
            options={{ legend: { displayMode: 'hidden' } }}
            fieldConfig={{
              defaults: {
                custom: { lineWidth: 2, fillOpacity: 10, spanNulls: true },
                thresholds: { mode: 'absolute', steps: [
                  { color: 'green', value: null },
                  { color: 'orange', value: 6 },
                  { color: 'red', value: 14.4 },
                ]},
              },
              overrides: [],
            }}
          />

          <PreviewPanel
            title="SLI Trend"
            pluginId="timeseries"
            expr={exprs.sli}
            datasource={ds}
            queryType="range"
            window={previewWindow}
            width="full"
            height={TIMESERIES_HEIGHT}
            options={{ legend: { displayMode: 'hidden' } }}
            fieldConfig={{
              defaults: {
                unit: 'percentunit',
                custom: { lineWidth: 2, fillOpacity: 10, spanNulls: true },
              },
              overrides: [],
            }}
          />

          {slis.length >= 2 && (
            <SLIBreakdownPanel
              perSLI={exprs.perSLI}
              datasource={ds}
              window={previewWindow}
            />
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
      position: 'relative',
      minHeight: '60px',
    }),
    panelSubtitle: css({
      padding: theme.spacing(0.5, 1),
      borderTop: `1px solid ${theme.colors.border.weak}`,
      background: theme.colors.background.secondary,
    }),
    centered: css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      position: 'absolute',
      inset: 0,
    }),
    errorText: css({
      color: theme.colors.error.text,
      fontSize: theme.typography.bodySmall.fontSize,
      padding: theme.spacing(1),
    }),
    expr: css({
      fontSize: theme.typography.bodySmall.fontSize,
      color: theme.colors.text.secondary,
      wordBreak: 'break-all',
      display: 'block',
    }),
  };
}
