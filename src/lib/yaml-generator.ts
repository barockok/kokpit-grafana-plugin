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

/** Parse a YAML string back into WizardState. Throws on invalid input. */
export function parseYAMLToState(yamlString: string): WizardState {
  const raw = jsYaml.load(yamlString) as Record<string, unknown>;
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid YAML: expected an object');
  }

  const config = raw as Partial<SLOConfig>;
  const slo = config.slo as Partial<SLO> | undefined;
  if (!slo) {
    throw new Error('Missing required field: slo');
  }
  if (!slo.name) {
    throw new Error('Missing required field: slo.name');
  }
  if (slo.target === undefined || slo.target === null) {
    throw new Error('Missing required field: slo.target');
  }
  if (!Array.isArray(slo.slis) || slo.slis.length === 0) {
    throw new Error('Missing required field: slo.slis (need at least one SLI)');
  }

  for (let i = 0; i < slo.slis.length; i++) {
    const s = slo.slis[i];
    if (!s.name) {
      throw new Error(`Missing required field: slo.slis[${i}].name`);
    }
    if (!s.type) {
      throw new Error(`Missing required field: slo.slis[${i}].type`);
    }
    if (!s.datasource) {
      throw new Error(`Missing required field: slo.slis[${i}].datasource`);
    }
    if (!s.query) {
      throw new Error(`Missing required field: slo.slis[${i}].query`);
    }
  }

  const base = createDefaultState();
  const description = typeof slo.description === 'string'
    ? slo.description
    : (slo.description as { text?: string })?.text ?? '';

  const state: WizardState = {
    ...base,
    name: slo.name,
    target: slo.target,
    description,
    windows: slo.windows ?? base.windows,
    tags: slo.tags ?? {},
    variables: slo.variables ?? {},
    slis: slo.slis.map((s) => ({
      name: s.name,
      displayName: s.display_name ?? '',
      type: s.type,
      datasource: s.datasource,
      query: s.query,
      normalizeMin: s.normalize?.min ?? 0,
      normalizeMax: s.normalize?.max ?? 1,
      record: s.record ?? false,
    })),
    grafanaFolder: config.grafana?.folder ?? base.grafanaFolder,
  };

  // Composite
  if (slo.composite) {
    state.compositeMethod = slo.composite.method ?? 'average';
    state.compositeWeights = slo.composite.weights ?? {};
  }

  // Alerts
  if (slo.alerts) {
    state.alertsEnabled = true;
    if (slo.alerts.mode) {
      state.alertMode = slo.alerts.mode;
    }
    if (slo.alerts.fast_burn) {
      state.fastBurn = {
        window: slo.alerts.fast_burn.window,
        burnRate: slo.alerts.fast_burn.burn_rate,
        severity: slo.alerts.fast_burn.severity,
      };
    }
    if (slo.alerts.slow_burn) {
      state.slowBurn = {
        window: slo.alerts.slow_burn.window,
        burnRate: slo.alerts.slow_burn.burn_rate,
        severity: slo.alerts.slow_burn.severity,
      };
    }
  }

  // Dashboard
  if (slo.dashboard) {
    if (slo.dashboard.template) {
      state.dashboardTemplate = slo.dashboard.template;
    }
    if (slo.dashboard.mode) {
      state.dashboardMode = slo.dashboard.mode;
    }
    if (slo.dashboard.realtime_mode) {
      state.realtimeMode = slo.dashboard.realtime_mode;
    }
    if (slo.dashboard.realtime_window) {
      state.realtimeWindow = slo.dashboard.realtime_window;
    }
  }

  return state;
}
