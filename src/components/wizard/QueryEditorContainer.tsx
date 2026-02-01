import React, { useEffect, useState, useCallback, useRef } from 'react';
import { css } from '@emotion/css';
import { CodeEditor, Spinner, Alert, useStyles2 } from '@grafana/ui';
import { DataSourceApi, GrafanaTheme2 } from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';

interface Props {
  datasourceName: string;
  query: string;
  onChange: (expr: string) => void;
}

export function QueryEditorContainer({ datasourceName, query, onChange }: Props) {
  const styles = useStyles2(getStyles);
  const [datasource, setDatasource] = useState<DataSourceApi | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevDsName = useRef(datasourceName);

  useEffect(() => {
    if (!datasourceName) {
      setDatasource(null);
      setError(null);
      return;
    }

    // Reset when datasource changes
    if (prevDsName.current !== datasourceName) {
      setDatasource(null);
      prevDsName.current = datasourceName;
    }

    setLoading(true);
    setError(null);

    getDataSourceSrv()
      .get(datasourceName)
      .then((ds) => {
        setDatasource(ds);
        setLoading(false);
      })
      .catch((err) => {
        setError(`Failed to load datasource: ${err.message}`);
        setDatasource(null);
        setLoading(false);
      });
  }, [datasourceName]);

  const handleNativeChange = useCallback(
    (updatedQuery: any) => {
      if (updatedQuery?.expr !== undefined) {
        onChange(updatedQuery.expr);
      }
    },
    [onChange]
  );

  const onRunQuery = useCallback(() => {
    // No-op in wizard context - queries are not executed inline
  }, []);

  if (!datasourceName) {
    return (
      <div className={styles.wrapper}>
        <CodeEditor
          value=""
          language="promql"
          height={120}
          readOnly
          showMiniMap={false}
          showLineNumbers={false}
          monacoOptions={{ wordWrap: 'on', scrollBeyondLastLine: false }}
        />
        <div className={styles.placeholder}>Select a datasource first</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <Spinner size="sm" />
        <span>Loading query editor...</span>
      </div>
    );
  }

  // Try to render native QueryEditor
  const QueryEditor = datasource?.components?.QueryEditor;

  if (QueryEditor) {
    const queryObj = {
      refId: 'A',
      expr: query,
    };

    return (
      <div className={styles.nativeWrapper}>
        <QueryEditor
          datasource={datasource as any}
          query={queryObj as any}
          onChange={handleNativeChange}
          onRunQuery={onRunQuery}
        />
      </div>
    );
  }

  // Fallback: CodeEditor with PromQL syntax highlighting
  return (
    <div className={styles.wrapper}>
      {error && (
        <Alert title="Query editor unavailable" severity="warning">
          {error}. Using basic editor.
        </Alert>
      )}
      <CodeEditor
        value={query}
        language="promql"
        height={120}
        showMiniMap={false}
        showLineNumbers={true}
        monacoOptions={{ wordWrap: 'on', scrollBeyondLastLine: false }}
        onBlur={onChange}
      />
    </div>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    wrapper: css({
      position: 'relative',
    }),
    nativeWrapper: css({
      border: `1px solid ${theme.colors.border.weak}`,
      borderRadius: theme.shape.radius.default,
      padding: theme.spacing(0.5),
    }),
    loadingWrapper: css({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1),
      padding: theme.spacing(1),
      color: theme.colors.text.secondary,
      fontSize: theme.typography.bodySmall.fontSize,
    }),
    placeholder: css({
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      color: theme.colors.text.disabled,
      fontSize: theme.typography.bodySmall.fontSize,
      pointerEvents: 'none',
    }),
  };
}
