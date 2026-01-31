import {
  buildSLIExpr,
  buildFinalSLIExpr,
  buildBurnRateExpr,
  buildErrorBudgetExpr,
} from './expression-builder';
import type { SLI, Composite } from './schema';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ratioSLI: SLI = {
  name: 'availability',
  type: 'ratio',
  datasource: 'prometheus',
  query:
    'sum(rate(http_requests_total{code=~"2.."}[{{window}}])) / sum(rate(http_requests_total[{{window}}]))',
};

const customSLINoNormalize: SLI = {
  name: 'latency',
  type: 'custom',
  datasource: 'prometheus',
  query: 'histogram_quantile(0.99, rate(http_duration_bucket[{{window}}]))',
};

const customSLINormalized: SLI = {
  name: 'latency',
  type: 'custom',
  datasource: 'prometheus',
  query: 'histogram_quantile(0.99, rate(http_duration_bucket[{{window}}]))',
  normalize: { min: 0, max: 500 },
};

const sliWithVars: SLI = {
  name: 'throughput',
  type: 'ratio',
  datasource: 'prometheus',
  query:
    'sum(rate(http_requests_total{service="{{.service}}"}[{{window}}])) / sum(rate(http_requests_total[{{window}}]))',
};

const sliA: SLI = {
  name: 'a',
  type: 'ratio',
  datasource: 'prometheus',
  query: 'metric_a[{{window}}]',
};

const sliB: SLI = {
  name: 'b',
  type: 'ratio',
  datasource: 'prometheus',
  query: 'metric_b[{{window}}]',
};

const sliC: SLI = {
  name: 'c',
  type: 'ratio',
  datasource: 'prometheus',
  query: 'metric_c[{{window}}]',
};

// ---------------------------------------------------------------------------
// buildSLIExpr
// ---------------------------------------------------------------------------

describe('buildSLIExpr', () => {
  it('substitutes {{window}} for a ratio SLI', () => {
    const result = buildSLIExpr(ratioSLI, undefined, '30d');
    expect(result).toBe(
      'sum(rate(http_requests_total{code=~"2.."}[30d])) / sum(rate(http_requests_total[30d]))'
    );
  });

  it('handles custom type without normalize the same as ratio', () => {
    const result = buildSLIExpr(customSLINoNormalize, undefined, '7d');
    expect(result).toBe('histogram_quantile(0.99, rate(http_duration_bucket[7d]))');
  });

  it('wraps in clamp_min/clamp_max for custom type with normalize', () => {
    const result = buildSLIExpr(customSLINormalized, undefined, '7d');
    const inner = 'histogram_quantile(0.99, rate(http_duration_bucket[7d]))';
    expect(result).toBe(`clamp_min(clamp_max((500 - (${inner})) / 500, 1), 0)`);
  });

  it('substitutes variables and window together', () => {
    const vars = { service: 'api-gateway' };
    const result = buildSLIExpr(sliWithVars, vars, '30d');
    expect(result).toBe(
      'sum(rate(http_requests_total{service="api-gateway"}[30d])) / sum(rate(http_requests_total[30d]))'
    );
  });
});

// ---------------------------------------------------------------------------
// buildFinalSLIExpr
// ---------------------------------------------------------------------------

describe('buildFinalSLIExpr', () => {
  it('returns the single SLI expression when only one SLI is provided', () => {
    const result = buildFinalSLIExpr([ratioSLI], undefined, undefined, '30d');
    expect(result).toBe(
      'sum(rate(http_requests_total{code=~"2.."}[30d])) / sum(rate(http_requests_total[30d]))'
    );
  });

  describe('average method', () => {
    it('defaults to average when no composite is provided', () => {
      const result = buildFinalSLIExpr([sliA, sliB], undefined, undefined, '7d');
      expect(result).toBe('((metric_a[7d]) + (metric_b[7d])) / 2');
    });

    it('averages three SLIs with explicit composite', () => {
      const composite: Composite = { method: 'average' };
      const result = buildFinalSLIExpr([sliA, sliB, sliC], composite, undefined, '7d');
      expect(result).toBe('((metric_a[7d]) + (metric_b[7d]) + (metric_c[7d])) / 3');
    });
  });

  describe('weighted method', () => {
    it('produces weighted sum expression', () => {
      const composite: Composite = {
        method: 'weighted',
        weights: { a: 0.7, b: 0.3 },
      };
      const result = buildFinalSLIExpr([sliA, sliB], composite, undefined, '7d');
      expect(result).toBe('(metric_a[7d]) * 0.7 + (metric_b[7d]) * 0.3');
    });

    it('filters out SLIs not present in weights', () => {
      const composite: Composite = {
        method: 'weighted',
        weights: { a: 1 },
      };
      const result = buildFinalSLIExpr([sliA, sliB], composite, undefined, '7d');
      expect(result).toBe('(metric_a[7d]) * 1');
      expect(result).not.toContain('metric_b');
    });
  });

  describe('minimum method', () => {
    it('produces pairwise minimum expression for two SLIs', () => {
      const composite: Composite = { method: 'minimum' };
      const result = buildFinalSLIExpr([sliA, sliB], composite, undefined, '7d');
      // The minimum implementation uses boolean comparison:
      // ((a) <= bool (b)) * (a) + ((a) > bool (b)) * (b)
      expect(result).toContain('<= bool');
      expect(result).toContain('> bool');
      expect(result).toContain('metric_a[7d]');
      expect(result).toContain('metric_b[7d]');
    });

    it('produces nested minimum for three SLIs', () => {
      const composite: Composite = { method: 'minimum' };
      const result = buildFinalSLIExpr([sliA, sliB, sliC], composite, undefined, '7d');
      // Should contain references to all three metrics
      expect(result).toContain('metric_a[7d]');
      expect(result).toContain('metric_b[7d]');
      expect(result).toContain('metric_c[7d]');
    });
  });
});

// ---------------------------------------------------------------------------
// buildBurnRateExpr
// ---------------------------------------------------------------------------

describe('buildBurnRateExpr', () => {
  it('produces correct burn rate expression', () => {
    const result = buildBurnRateExpr([sliA], undefined, undefined, '7d', 0.999);
    // (1 - (sli_expr)) / (1 - target)
    expect(result).toBe('(1 - (metric_a[7d])) / (1 - 0.999)');
  });

  it('works with composite SLIs', () => {
    const composite: Composite = { method: 'average' };
    const result = buildBurnRateExpr([sliA, sliB], composite, undefined, '30d', 0.99);
    const avgExpr = '((metric_a[30d]) + (metric_b[30d])) / 2';
    expect(result).toBe(`(1 - (${avgExpr})) / (1 - 0.99)`);
  });
});

// ---------------------------------------------------------------------------
// buildErrorBudgetExpr
// ---------------------------------------------------------------------------

describe('buildErrorBudgetExpr', () => {
  it('produces correct error budget expression', () => {
    const result = buildErrorBudgetExpr([sliA], undefined, undefined, '7d', 0.999);
    // 1 - ((1 - (sli_expr)) / (1 - target))
    expect(result).toBe('1 - ((1 - (metric_a[7d])) / (1 - 0.999))');
  });

  it('works with composite SLIs', () => {
    const composite: Composite = { method: 'average' };
    const result = buildErrorBudgetExpr([sliA, sliB], composite, undefined, '30d', 0.99);
    const avgExpr = '((metric_a[30d]) + (metric_b[30d])) / 2';
    expect(result).toBe(`1 - ((1 - (${avgExpr})) / (1 - 0.99))`);
  });
});
