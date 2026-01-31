/** TypeScript types mirroring the Go config schema in internal/config/schema.go */

export interface SLOConfig {
  version: '1';
  slo: SLO;
  grafana: GrafanaConfig;
}

export interface SLO {
  name: string;
  variables?: Record<string, string>;
  description?: string | DescriptionConfig;
  target: number;
  windows?: string[];
  tags?: Record<string, string>;
  slis: SLI[];
  composite?: Composite;
  alerts?: AlertsConfig;
  dashboard?: DashboardConfig;
}

export interface DescriptionConfig {
  format: 'markdown' | 'html';
  text: string;
}

export interface SLI {
  name: string;
  display_name?: string;
  type: 'ratio' | 'custom';
  datasource: string;
  query: string;
  normalize?: Normalize;
  record?: boolean;
  tags?: Record<string, string>;
}

export interface Normalize {
  min: number;
  max: number;
}

export interface Composite {
  method: 'weighted' | 'minimum' | 'average';
  weights?: Record<string, number>;
}

export interface AlertsConfig {
  mode?: 'raw' | 'recorded';
  tags?: Record<string, string>;
  fast_burn?: BurnRateConfig;
  slow_burn?: BurnRateConfig;
}

export interface BurnRateConfig {
  window: string;
  burn_rate: number;
  severity: string;
}

export interface GrafanaConfig {
  folder: string;
}

export interface DashboardConfig {
  template?: 'slo-dashboard' | 'slo-dashboard-v1' | 'slo-dashboard-v2';
  mode?: 'raw' | 'slo' | 'both';
  raw_window?: string;
  realtime_mode?: 'raw' | 'recorded';
  realtime_window?: string;
  query_options?: QueryOptionsConfig;
}

export interface QueryOptionsConfig {
  min_interval?: string;
}

/** Default values applied when fields are omitted */
export const DEFAULTS = {
  windows: ['7d', '30d'],
  dashboardTemplate: 'slo-dashboard-v2' as const,
  dashboardMode: 'slo' as const,
  realtimeMode: 'raw' as const,
  realtimeWindow: '5m',
  alertMode: 'raw' as const,
  grafanaFolder: 'SLO Dashboards',
};
