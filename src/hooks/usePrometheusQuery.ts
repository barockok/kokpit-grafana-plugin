import { useEffect, useRef, useState } from 'react';
import { createQueryRunner, getDataSourceSrv } from '@grafana/runtime';
import {
  LoadingState,
  dateTime,
  type PanelData,
  type DataSourceRef,
  type TimeRange,
} from '@grafana/data';

type QueryType = 'instant' | 'range';

interface UsePrometheusQueryOptions {
  expr: string;
  datasource: string;
  queryType?: QueryType;
  window?: string;
}

const DEBOUNCE_MS = 500;

function makeTimeRange(window: string): TimeRange {
  const now = dateTime();
  const from = dateTime().subtract(parseDuration(window), 'milliseconds');
  return {
    from,
    to: now,
    raw: { from: `now-${window}`, to: 'now' },
  };
}

function parseDuration(w: string): number {
  const match = w.match(/^(\d+)(m|h|d)$/);
  if (!match) {
    return 5 * 60 * 1000;
  }
  const val = parseInt(match[1], 10);
  switch (match[2]) {
    case 'm':
      return val * 60 * 1000;
    case 'h':
      return val * 60 * 60 * 1000;
    case 'd':
      return val * 24 * 60 * 60 * 1000;
    default:
      return 5 * 60 * 1000;
  }
}

export function usePrometheusQuery({
  expr,
  datasource,
  queryType = 'instant',
  window = '5m',
}: UsePrometheusQueryOptions): PanelData | undefined {
  const [data, setData] = useState<PanelData | undefined>(undefined);
  const runnerRef = useRef<ReturnType<typeof createQueryRunner> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (!expr) {
      setData(undefined);
      return;
    }

    timerRef.current = setTimeout(() => {
      const dsSettings = getDataSourceSrv().getInstanceSettings(datasource);
      if (!dsSettings) {
        setData({
          state: LoadingState.Error,
          series: [],
          timeRange: makeTimeRange(window),
          errors: [{ message: `Datasource "${datasource}" not found` }],
        } as PanelData);
        return;
      }

      const dsRef: DataSourceRef = { uid: dsSettings.uid, type: dsSettings.type };

      // Clean up previous runner
      if (runnerRef.current) {
        runnerRef.current.cancel();
        runnerRef.current.destroy();
      }

      const runner = createQueryRunner();
      runnerRef.current = runner;

      const subscription = runner.get().subscribe((panelData) => {
        setData(panelData);
      });

      runner.run({
        datasource: dsRef,
        queries: [
          {
            refId: 'A',
            expr,
            instant: queryType === 'instant',
            range: queryType === 'range',
          },
        ],
        timezone: 'browser',
        timeRange: makeTimeRange(window),
        maxDataPoints: queryType === 'range' ? 500 : 1,
        minInterval: null,
      });

      // Store subscription for cleanup
      (runner as any).__sub = subscription;
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [expr, datasource, queryType, window]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (runnerRef.current) {
        runnerRef.current.cancel();
        runnerRef.current.destroy();
        if ((runnerRef.current as any).__sub) {
          (runnerRef.current as any).__sub.unsubscribe();
        }
      }
    };
  }, []);

  return data;
}

interface MultiQueryTarget {
  expr: string;
  refId: string;
  legendFormat?: string;
}

export function usePrometheusQueries({
  targets,
  datasource,
  window = '5m',
}: {
  targets: MultiQueryTarget[];
  datasource: string;
  window?: string;
}): PanelData | undefined {
  const [data, setData] = useState<PanelData | undefined>(undefined);
  const runnerRef = useRef<ReturnType<typeof createQueryRunner> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetsKey = JSON.stringify(targets);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (targets.length === 0 || targets.every((t) => !t.expr)) {
      setData(undefined);
      return;
    }

    timerRef.current = setTimeout(() => {
      const dsSettings = getDataSourceSrv().getInstanceSettings(datasource);
      if (!dsSettings) {
        setData({
          state: LoadingState.Error,
          series: [],
          timeRange: makeTimeRange(window),
          errors: [{ message: `Datasource "${datasource}" not found` }],
        } as PanelData);
        return;
      }

      const dsRef: DataSourceRef = { uid: dsSettings.uid, type: dsSettings.type };

      if (runnerRef.current) {
        runnerRef.current.cancel();
        runnerRef.current.destroy();
      }

      const runner = createQueryRunner();
      runnerRef.current = runner;

      const subscription = runner.get().subscribe((panelData) => {
        setData(panelData);
      });

      runner.run({
        datasource: dsRef,
        queries: targets.map((t) => ({
          refId: t.refId,
          expr: t.expr,
          range: true,
          instant: false,
          legendFormat: t.legendFormat ?? t.refId,
        })),
        timezone: 'browser',
        timeRange: makeTimeRange(window),
        maxDataPoints: 500,
        minInterval: null,
      });

      (runner as any).__sub = subscription;
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [targetsKey, datasource, window]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (runnerRef.current) {
        runnerRef.current.cancel();
        runnerRef.current.destroy();
        if ((runnerRef.current as any).__sub) {
          (runnerRef.current as any).__sub.unsubscribe();
        }
      }
    };
  }, []);

  return data;
}
