import jsYaml from 'js-yaml';
import { createDefaultState, createDefaultSLI, stateToConfig, generateYAML } from './yaml-generator';
import type { WizardState, SLIState } from './yaml-generator';
import { DEFAULTS } from './schema';

/** Build a minimal valid WizardState for testing stateToConfig. */
function minimalState(overrides?: Partial<WizardState>): WizardState {
  return {
    ...createDefaultState(),
    name: 'test-slo',
    slis: [
      {
        ...createDefaultSLI(),
        name: 'availability',
        query: 'sum(rate(http_requests_total{code=~"2.."}[{{window}}])) / sum(rate(http_requests_total[{{window}}]))',
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// createDefaultState
// ---------------------------------------------------------------------------
describe('createDefaultState', () => {
  it('returns valid default values', () => {
    const state = createDefaultState();
    expect(state.name).toBe('');
    expect(state.target).toBe(0.999);
    expect(state.windows).toEqual(['7d', '30d']);
    expect(state.description).toBe('');
    expect(state.tags).toEqual({});
    expect(state.variables).toEqual({});
    expect(state.compositeMethod).toBe('average');
    expect(state.compositeWeights).toEqual({});
    expect(state.alertsEnabled).toBe(false);
    expect(state.alertMode).toBe('raw');
    expect(state.fastBurn).toEqual({ window: '1h', burnRate: 14.4, severity: 'critical' });
    expect(state.slowBurn).toEqual({ window: '6h', burnRate: 6, severity: 'warning' });
    expect(state.grafanaFolder).toBe('SLO Dashboards');
    expect(state.dashboardTemplate).toBe('slo-dashboard-v2');
    expect(state.dashboardMode).toBe('slo');
    expect(state.realtimeMode).toBe('raw');
    expect(state.realtimeWindow).toBe('5m');
  });

  it('contains exactly one default SLI', () => {
    const state = createDefaultState();
    expect(state.slis).toHaveLength(1);
    expect(state.slis[0]).toEqual(createDefaultSLI());
  });

  it('returns a new array for windows (not a shared reference)', () => {
    const a = createDefaultState();
    const b = createDefaultState();
    expect(a.windows).not.toBe(b.windows);
  });
});

// ---------------------------------------------------------------------------
// createDefaultSLI
// ---------------------------------------------------------------------------
describe('createDefaultSLI', () => {
  it('returns valid SLI defaults', () => {
    const sli = createDefaultSLI();
    expect(sli.name).toBe('');
    expect(sli.displayName).toBe('');
    expect(sli.type).toBe('ratio');
    expect(sli.datasource).toBe('prometheus');
    expect(sli.query).toBe('');
    expect(sli.normalizeMin).toBe(0);
    expect(sli.normalizeMax).toBe(1);
    expect(sli.record).toBe(false);
  });

  it('returns a fresh object each call', () => {
    const a = createDefaultSLI();
    const b = createDefaultSLI();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// stateToConfig
// ---------------------------------------------------------------------------
describe('stateToConfig', () => {
  it('converts minimal state to correct SLOConfig shape', () => {
    const config = stateToConfig(minimalState());

    expect(config.version).toBe('1');
    expect(config.grafana.folder).toBe('SLO Dashboards');
    expect(config.slo.name).toBe('test-slo');
    expect(config.slo.target).toBe(0.999);
    expect(config.slo.slis).toHaveLength(1);
    expect(config.slo.slis[0].name).toBe('availability');
    expect(config.slo.slis[0].type).toBe('ratio');
    expect(config.slo.slis[0].datasource).toBe('prometheus');
  });

  it('omits default values (windows, dashboard, alerts, composite, description, tags, variables)', () => {
    const config = stateToConfig(minimalState());

    expect(config.slo.windows).toBeUndefined();
    expect(config.slo.dashboard).toBeUndefined();
    expect(config.slo.alerts).toBeUndefined();
    expect(config.slo.composite).toBeUndefined();
    expect(config.slo.description).toBeUndefined();
    expect(config.slo.tags).toBeUndefined();
    expect(config.slo.variables).toBeUndefined();
  });

  it('includes description when set', () => {
    const config = stateToConfig(minimalState({ description: 'Tracks overall availability' }));
    expect(config.slo.description).toBe('Tracks overall availability');
  });

  it('includes variables when set', () => {
    const config = stateToConfig(minimalState({ variables: { env: 'production', region: 'us-east-1' } }));
    expect(config.slo.variables).toEqual({ env: 'production', region: 'us-east-1' });
  });

  it('includes tags when set', () => {
    const config = stateToConfig(minimalState({ tags: { team: 'platform', tier: 'critical' } }));
    expect(config.slo.tags).toEqual({ team: 'platform', tier: 'critical' });
  });

  it('includes non-default windows', () => {
    const config = stateToConfig(minimalState({ windows: ['1d', '7d', '30d'] }));
    expect(config.slo.windows).toEqual(['1d', '7d', '30d']);
  });

  it('omits windows when they match the default', () => {
    const config = stateToConfig(minimalState({ windows: ['7d', '30d'] }));
    expect(config.slo.windows).toBeUndefined();
  });

  it('includes composite config when 2+ SLIs with average method', () => {
    const sli2: SLIState = { ...createDefaultSLI(), name: 'latency', query: 'histogram_quantile(0.99, rate(http_duration_seconds_bucket[{{window}}]))' };
    const config = stateToConfig(minimalState({ slis: [minimalState().slis[0], sli2], compositeMethod: 'average' }));

    expect(config.slo.composite).toBeDefined();
    expect(config.slo.composite!.method).toBe('average');
    expect(config.slo.composite!.weights).toBeUndefined();
  });

  it('includes composite config with weighted method and weights', () => {
    const sli2: SLIState = { ...createDefaultSLI(), name: 'latency', query: 'some_query' };
    const config = stateToConfig(
      minimalState({
        slis: [minimalState().slis[0], sli2],
        compositeMethod: 'weighted',
        compositeWeights: { availability: 70, latency: 30 },
      })
    );

    expect(config.slo.composite).toBeDefined();
    expect(config.slo.composite!.method).toBe('weighted');
    expect(config.slo.composite!.weights).toEqual({ availability: 70, latency: 30 });
  });

  it('does not include composite for a single SLI', () => {
    const config = stateToConfig(minimalState());
    expect(config.slo.composite).toBeUndefined();
  });

  it('includes alerts when enabled', () => {
    const config = stateToConfig(minimalState({ alertsEnabled: true }));

    expect(config.slo.alerts).toBeDefined();
    expect(config.slo.alerts!.fast_burn).toEqual({ window: '1h', burn_rate: 14.4, severity: 'critical' });
    expect(config.slo.alerts!.slow_burn).toEqual({ window: '6h', burn_rate: 6, severity: 'warning' });
    // Default alertMode is 'raw', so mode should be omitted
    expect(config.slo.alerts!.mode).toBeUndefined();
  });

  it('includes alert mode when not the default', () => {
    const config = stateToConfig(minimalState({ alertsEnabled: true, alertMode: 'recorded' }));
    expect(config.slo.alerts!.mode).toBe('recorded');
  });

  it('does not include alerts when disabled', () => {
    const config = stateToConfig(minimalState({ alertsEnabled: false }));
    expect(config.slo.alerts).toBeUndefined();
  });

  it('includes non-default dashboard config', () => {
    const config = stateToConfig(
      minimalState({
        dashboardTemplate: 'slo-dashboard-v1',
        dashboardMode: 'both',
        realtimeMode: 'recorded',
        realtimeWindow: '10m',
      })
    );

    expect(config.slo.dashboard).toBeDefined();
    expect(config.slo.dashboard!.template).toBe('slo-dashboard-v1');
    expect(config.slo.dashboard!.mode).toBe('both');
    expect(config.slo.dashboard!.realtime_mode).toBe('recorded');
    expect(config.slo.dashboard!.realtime_window).toBe('10m');
  });

  it('omits dashboard when all fields are defaults', () => {
    const config = stateToConfig(minimalState());
    expect(config.slo.dashboard).toBeUndefined();
  });

  it('includes only the non-default dashboard fields', () => {
    const config = stateToConfig(minimalState({ realtimeWindow: '15m' }));
    expect(config.slo.dashboard).toBeDefined();
    expect(config.slo.dashboard!.realtime_window).toBe('15m');
    // The rest should be omitted because they are default
    expect(config.slo.dashboard!.template).toBeUndefined();
    expect(config.slo.dashboard!.mode).toBeUndefined();
    expect(config.slo.dashboard!.realtime_mode).toBeUndefined();
  });

  it('includes custom SLI normalize when not default (0,1)', () => {
    const sli: SLIState = {
      ...createDefaultSLI(),
      name: 'quality-score',
      type: 'custom',
      query: 'custom_metric',
      normalizeMin: 0,
      normalizeMax: 100,
    };
    const config = stateToConfig(minimalState({ slis: [sli] }));

    expect(config.slo.slis[0].normalize).toEqual({ min: 0, max: 100 });
  });

  it('omits normalize for custom SLI when min=0 and max=1', () => {
    const sli: SLIState = {
      ...createDefaultSLI(),
      name: 'custom-default',
      type: 'custom',
      query: 'custom_metric',
      normalizeMin: 0,
      normalizeMax: 1,
    };
    const config = stateToConfig(minimalState({ slis: [sli] }));
    expect(config.slo.slis[0].normalize).toBeUndefined();
  });

  it('omits normalize for ratio SLI even with non-default values', () => {
    const sli: SLIState = {
      ...createDefaultSLI(),
      name: 'ratio-sli',
      type: 'ratio',
      query: 'some_query',
      normalizeMin: 10,
      normalizeMax: 100,
    };
    const config = stateToConfig(minimalState({ slis: [sli] }));
    expect(config.slo.slis[0].normalize).toBeUndefined();
  });

  it('includes SLI display_name when set', () => {
    const sli: SLIState = {
      ...createDefaultSLI(),
      name: 'avail',
      displayName: 'Availability',
      query: 'some_query',
    };
    const config = stateToConfig(minimalState({ slis: [sli] }));
    expect(config.slo.slis[0].display_name).toBe('Availability');
  });

  it('omits SLI display_name when empty', () => {
    const config = stateToConfig(minimalState());
    expect(config.slo.slis[0].display_name).toBeUndefined();
  });

  it('includes SLI record when true', () => {
    const sli: SLIState = { ...createDefaultSLI(), name: 'avail', query: 'q', record: true };
    const config = stateToConfig(minimalState({ slis: [sli] }));
    expect(config.slo.slis[0].record).toBe(true);
  });

  it('omits SLI record when false', () => {
    const config = stateToConfig(minimalState());
    expect(config.slo.slis[0].record).toBeUndefined();
  });

  it('uses custom grafana folder', () => {
    const config = stateToConfig(minimalState({ grafanaFolder: 'My Custom Folder' }));
    expect(config.grafana.folder).toBe('My Custom Folder');
  });
});

// ---------------------------------------------------------------------------
// generateYAML
// ---------------------------------------------------------------------------
describe('generateYAML', () => {
  it('produces a valid YAML string that can be parsed back', () => {
    const state = minimalState();
    const yaml = generateYAML(state);

    expect(typeof yaml).toBe('string');
    expect(yaml.length).toBeGreaterThan(0);

    const parsed = jsYaml.load(yaml);
    expect(parsed).toBeDefined();
    expect(typeof parsed).toBe('object');
  });

  it('round-trip: parsed YAML matches stateToConfig output', () => {
    const state = minimalState({
      description: 'End-to-end SLO',
      tags: { team: 'sre' },
      variables: { env: 'prod' },
      alertsEnabled: true,
      alertMode: 'recorded',
    });

    const config = stateToConfig(state);
    const yaml = generateYAML(state);
    const parsed = jsYaml.load(yaml);

    expect(parsed).toEqual(config);
  });

  it('round-trip with composite config', () => {
    const sli2: SLIState = { ...createDefaultSLI(), name: 'latency', query: 'latency_query' };
    const state = minimalState({
      slis: [minimalState().slis[0], sli2],
      compositeMethod: 'weighted',
      compositeWeights: { availability: 80, latency: 20 },
    });

    const config = stateToConfig(state);
    const yaml = generateYAML(state);
    const parsed = jsYaml.load(yaml);

    expect(parsed).toEqual(config);
  });

  it('round-trip with dashboard overrides', () => {
    const state = minimalState({
      dashboardTemplate: 'slo-dashboard',
      dashboardMode: 'raw',
      realtimeMode: 'recorded',
      realtimeWindow: '1m',
    });

    const config = stateToConfig(state);
    const yaml = generateYAML(state);
    const parsed = jsYaml.load(yaml);

    expect(parsed).toEqual(config);
  });
});
