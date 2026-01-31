/**
 * Port of internal/slo/template.go SubstituteAll.
 * Replaces {{.key}} with variable values and {{window}} with the window value.
 */
export function substituteAll(
  query: string,
  vars: Record<string, string> | undefined,
  window: string
): string {
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      query = query.replaceAll(`{{.${k}}}`, v);
    }
  }
  query = query.replaceAll('{{window}}', window);
  return query;
}
