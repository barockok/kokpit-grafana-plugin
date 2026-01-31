/**
 * Port of expression builders from internal/grafana/dashboard.go and
 * internal/prometheus/rules.go.
 */
import { substituteAll } from './substitute';
import type { SLI, Composite } from './schema';

/** Build expression for a single SLI, applying normalization if configured. */
export function buildSLIExpr(
  sli: SLI,
  vars: Record<string, string> | undefined,
  window: string
): string {
  let expr = substituteAll(sli.query, vars, window);

  if (sli.type === 'custom' && sli.normalize) {
    const diff = sli.normalize.max - sli.normalize.min;
    expr = `clamp_min(clamp_max((${sli.normalize.max} - (${expr})) / ${diff}, 1), 0)`;
  }

  return expr;
}

/** Build composite SLI expression from multiple SLIs. */
export function buildFinalSLIExpr(
  slis: SLI[],
  composite: Composite | undefined,
  vars: Record<string, string> | undefined,
  window: string
): string {
  if (slis.length === 1) {
    return buildSLIExpr(slis[0], vars, window);
  }

  const method = composite?.method ?? 'average';

  switch (method) {
    case 'weighted':
      return buildWeightedExpr(slis, composite?.weights ?? {}, vars, window);
    case 'minimum':
      return buildMinimumExpr(slis, vars, window);
    case 'average':
    default:
      return buildAverageExpr(slis, vars, window);
  }
}

function buildWeightedExpr(
  slis: SLI[],
  weights: Record<string, number>,
  vars: Record<string, string> | undefined,
  window: string
): string {
  const parts = slis
    .filter((sli) => sli.name in weights)
    .map((sli) => `(${buildSLIExpr(sli, vars, window)}) * ${weights[sli.name]}`);
  return parts.join(' + ');
}

function buildMinimumExpr(
  slis: SLI[],
  vars: Record<string, string> | undefined,
  window: string
): string {
  if (slis.length === 0) {
    return '0';
  }
  if (slis.length === 1) {
    return buildSLIExpr(slis[0], vars, window);
  }

  let result = `(${buildSLIExpr(slis[0], vars, window)})`;
  for (let i = 1; i < slis.length; i++) {
    const next = `(${buildSLIExpr(slis[i], vars, window)})`;
    result = `((${result}) <= bool (${next})) * (${result}) + ((${result}) > bool (${next})) * (${next})`;
  }
  return result;
}

function buildAverageExpr(
  slis: SLI[],
  vars: Record<string, string> | undefined,
  window: string
): string {
  if (slis.length === 0) {
    return '0';
  }
  if (slis.length === 1) {
    return buildSLIExpr(slis[0], vars, window);
  }

  const parts = slis.map((sli) => `(${buildSLIExpr(sli, vars, window)})`);
  return `(${parts.join(' + ')}) / ${slis.length}`;
}

/** Build burn rate expression: (1 - sli) / (1 - target) */
export function buildBurnRateExpr(
  slis: SLI[],
  composite: Composite | undefined,
  vars: Record<string, string> | undefined,
  window: string,
  target: number
): string {
  return `(1 - (${buildFinalSLIExpr(slis, composite, vars, window)})) / (1 - ${target})`;
}

/** Build error budget expression: 1 - ((1 - sli) / (1 - target)) */
export function buildErrorBudgetExpr(
  slis: SLI[],
  composite: Composite | undefined,
  vars: Record<string, string> | undefined,
  window: string,
  target: number
): string {
  return `1 - ((1 - (${buildFinalSLIExpr(slis, composite, vars, window)})) / (1 - ${target}))`;
}
