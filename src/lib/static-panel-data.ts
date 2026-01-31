import { LoadingState, FieldType, toDataFrame, type PanelData, dateTime } from '@grafana/data';

/**
 * Creates synthetic PanelData for the Target stat panel.
 * No query needed - just displays a static percentage value.
 */
export function createStaticStatData(value: number): PanelData {
  const now = dateTime();
  const frame = toDataFrame({
    fields: [
      {
        name: 'Value',
        type: FieldType.number,
        values: [value],
      },
    ],
  });

  return {
    state: LoadingState.Done,
    series: [frame],
    timeRange: {
      from: now,
      to: now,
      raw: { from: 'now', to: 'now' },
    },
  };
}
