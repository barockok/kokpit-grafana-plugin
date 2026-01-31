import React from 'react';
import { css } from '@emotion/css';
import { useStyles2, Input, Button, IconButton } from '@grafana/ui';
import { GrafanaTheme2 } from '@grafana/data';

interface Props {
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export function KeyValueEditor({ values, onChange, keyPlaceholder = 'Key', valuePlaceholder = 'Value' }: Props) {
  const styles = useStyles2(getStyles);
  const entries = Object.entries(values);

  const updateKey = (oldKey: string, newKey: string) => {
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(values)) {
      next[k === oldKey ? newKey : k] = v;
    }
    onChange(next);
  };

  const updateValue = (key: string, value: string) => {
    onChange({ ...values, [key]: value });
  };

  const addEntry = () => {
    onChange({ ...values, '': '' });
  };

  const removeEntry = (key: string) => {
    const next = { ...values };
    delete next[key];
    onChange(next);
  };

  return (
    <div className={styles.container}>
      {entries.map(([key, value], i) => (
        <div key={i} className={styles.row}>
          <Input
            placeholder={keyPlaceholder}
            value={key}
            onChange={(e) => updateKey(key, e.currentTarget.value)}
          />
          <Input
            placeholder={valuePlaceholder}
            value={value}
            onChange={(e) => updateValue(key, e.currentTarget.value)}
          />
          <IconButton name="trash-alt" tooltip="Remove" onClick={() => removeEntry(key)} />
        </div>
      ))}
      <Button variant="secondary" size="sm" icon="plus" onClick={addEntry}>
        Add
      </Button>
    </div>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(1),
    }),
    row: css({
      display: 'flex',
      gap: theme.spacing(1),
      alignItems: 'center',
    }),
  };
}
