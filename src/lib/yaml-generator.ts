import jsYaml from 'js-yaml';
import type { SLOConfig, SLO, SLI, AlertsConfig, DashboardConfig } from './schema';
import { DEFAULTS } from './schema';

/** Wizard form state used by the UI */
export interface WizardState {
  name: string;
  target: number;
  windows: string[];
  description: string;
  tags: Record<string, string>;
  variables: Record<string, string>;
  slis: SLIState[];
  compositeMethod: 'weighted' | 'minimum' | 'average';
  compositeWeights: Record<string, number>;
  alertsEnabled: boolean;
  alertMode: 'raw' | 'recorded';
  fastBurn: { window: string; burnRate: number; severity: string };
  slowBurn: { window: string; burnRate: number; severity: string };
  grafanaFolder: string;
  dashboardTemplate: string;
  dashboardMode: string;
  realtimeMode: string;
  realtimeWindow: string;
  weightStepSize: number;
  weightInputMode: 'sliders' | 'manual';
}

export interface SLIState {
  name: string;
  displayName: string;
  type: 'ratio' | 'custom';
  datasource: string;
  query: string;
  normalizeMin: number;
  normalizeMax: number;
  record: boolean;
}

export function createDefaultState(): WizardState {
  return {
    name: '',
    target: 0.999,
    windows: [...DEFAULTS.windows],
    description: '',
    tags: {},
    variables: {},
    slis: [createDefaultSLI()],
    compositeMethod: 'average',
    compositeWeights: {},
    alertsEnabled: false,
    alertMode: DEFAULTS.alertMode,
    fastBurn: { window: '1h', burnRate: 14.4, severity: 'critical' },
    slowBurn: { window: '6h', burnRate: 6, severity: 'warning' },
    grafanaFolder: DEFAULTS.grafanaFolder,
    dashboardTemplate: DEFAULTS.dashboardTemplate,
    dashboardMode: DEFAULTS.dashboardMode,
    realtimeMode: DEFAULTS.realtimeMode,
    realtimeWindow: DEFAULTS.realtimeWindow,
    weightStepSize: 0.05,
    weightInputMode: 'sliders',
  };
}

export function createDefaultSLI(): SLIState {
  return {
    name: '',
    displayName: '',
    type: 'ratio',
    datasource: 'prometheus',
    query: '',
    normalizeMin: 0,
    normalizeMax: 1,
    record: false,
  };
}

/** Convert wizard state to the YAML config structure, omitting defaults. */
export function stateToConfig(state: WizardState): SLOConfig {
  const slis: SLI[] = state.slis.map((s) => {
    const sli: SLI = {
      name: s.name,
      type: s.type,
      datasource: s.datasource,
      query: s.query,
    };
    if (s.displayName) {
      sli.display_name = s.displayName;
    }
    if (s.type === 'custom' && (s.normalizeMin !== 0 || s.normalizeMax !== 1)) {
      sli.normalize = { min: s.normalizeMin, max: s.normalizeMax };
    }
    if (s.record) {
      sli.record = true;
    }
    return sli;
  });

  const slo: SLO = {
    name: state.name,
    target: state.target,
    slis,
  };

  // Only include non-default fields
  if (Object.keys(state.variables).length > 0) {
    slo.variables = state.variables;
  }
  if (state.description) {
    slo.description = state.description;
  }
  if (JSON.stringify(state.windows) !== JSON.stringify(DEFAULTS.windows)) {
    slo.windows = state.windows;
  }
  if (Object.keys(state.tags).length > 0) {
    slo.tags = state.tags;
  }

  // Composite (only if 2+ SLIs)
  if (slis.length >= 2) {
    slo.composite = { method: state.compositeMethod };
    if (state.compositeMethod === 'weighted') {
      slo.composite.weights = state.compositeWeights;
    }
  }

  // Alerts
  if (state.alertsEnabled) {
    const alerts: AlertsConfig = {};
    if (state.alertMode !== DEFAULTS.alertMode) {
      alerts.mode = state.alertMode;
    }
    alerts.fast_burn = {
      window: state.fastBurn.window,
      burn_rate: state.fastBurn.burnRate,
      severity: state.fastBurn.severity,
    };
    alerts.slow_burn = {
      window: state.slowBurn.window,
      burn_rate: state.slowBurn.burnRate,
      severity: state.slowBurn.severity,
    };
    slo.alerts = alerts;
  }

  // Dashboard config (only non-defaults)
  const dashboard: DashboardConfig = {};
  if (state.dashboardTemplate !== DEFAULTS.dashboardTemplate) {
    dashboard.template = state.dashboardTemplate as DashboardConfig['template'];
  }
  if (state.dashboardMode !== DEFAULTS.dashboardMode) {
    dashboard.mode = state.dashboardMode as DashboardConfig['mode'];
  }
  if (state.realtimeMode !== DEFAULTS.realtimeMode) {
    dashboard.realtime_mode = state.realtimeMode as DashboardConfig['realtime_mode'];
  }
  if (state.realtimeWindow !== DEFAULTS.realtimeWindow) {
    dashboard.realtime_window = state.realtimeWindow;
  }
  if (Object.keys(dashboard).length > 0) {
    slo.dashboard = dashboard;
  }

  return {
    version: '1',
    slo,
    grafana: { folder: state.grafanaFolder },
  };
}

/** Generate YAML string from wizard state. */
export function generateYAML(state: WizardState): string {
  const config = stateToConfig(state);
  return jsYaml.dump(config, {
    lineWidth: -1,
    quotingType: '"',
    forceQuotes: false,
    noRefs: true,
  });
}
