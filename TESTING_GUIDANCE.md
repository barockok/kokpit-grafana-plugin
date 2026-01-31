# Testing Guidance

## Quick Start

1. Clone the repository and navigate to the plugin directory:
   ```bash
   git clone https://github.com/barockok/kokpit.git
   cd kokpit/grafana-plugin
   ```

2. Install dependencies and build:
   ```bash
   npm ci
   npm run build
   ```

3. Start the test environment:
   ```bash
   npm run server
   ```

4. Open Grafana at http://localhost:3000 (anonymous access enabled)

5. Navigate to the plugin: Sidebar > Kokpit SLO > SLO Wizard

## Testing the SLO Wizard

### Step 1: SLO Basics
- Enter an SLO name (e.g., "API Availability")
- Set a target (e.g., 99.9%)
- Optionally add tags and variables
- Click "Next"

### Step 2: SLI Queries
- Select "Prometheus" as the datasource
- Choose SLI type: "ratio" or "custom"
- Enter a PromQL query (e.g., `sum(rate(http_requests_total{code=~"2.."}[{{window}}])) / sum(rate(http_requests_total[{{window}}]))`)
- Add additional SLIs if needed
- Configure composite method (weighted/minimum/average)
- Click "Next"

### Step 3: Review
- Verify the live dashboard preview panels render correctly
- The preview shows SLI Trend, Error Budget, and Burn Rate panels
- Click "Export YAML" to download the generated configuration
- Verify the YAML output matches the configured values

## Running Tests

```bash
# Unit tests
npm run test:ci

# E2E tests (requires running server)
npm run server
npm run e2e

# Linting and type checking
npm run lint
npm run typecheck
```

## Prometheus Test Datasource

The docker-compose environment includes a Prometheus instance with
self-scrape metrics. The "Prometheus" datasource is pre-configured
and available in the SLI query step.

The TestData datasource is also available for basic testing without
real metrics.
