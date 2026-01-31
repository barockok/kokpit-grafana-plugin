# Kokpit SLO

SLO configuration wizard for Grafana with live dashboard preview.

## Features

- 3-step wizard: SLO Basics, SLI Queries, Review & Export
- Live Grafana panel preview as you configure
- Generates production-ready YAML config for the Kokpit CLI
- Supports ratio and custom SLI types
- Composite SLO with weighted, minimum, or average methods
- Error budget burn rate alert configuration
- Template variable substitution in PromQL queries

## Installation

### From Grafana Plugin Catalog

1. In Grafana, go to **Administration > Plugins**
2. Search for "Kokpit SLO"
3. Click **Install**

### Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/barockok/kokpit/releases)
2. Extract the archive to your Grafana plugins directory (default: `/var/lib/grafana/plugins/`)
3. Restart Grafana

## Usage

1. Navigate to **Kokpit SLO** in the Grafana sidebar
2. **Step 1 - SLO Basics**: Enter the SLO name, target (e.g., 99.9%), and optionally add tags and variables
3. **Step 2 - SLI Queries**: Select a datasource, choose an SLI type (ratio or custom), and enter your PromQL query. Add multiple SLIs and configure composite calculation if needed
4. **Step 3 - Review**: Preview live dashboard panels (SLI Trend, Error Budget, Burn Rate). Export the generated YAML configuration

The exported YAML is used with the [Kokpit CLI](https://github.com/barockok/kokpit) to provision Grafana dashboards, alert rules, and Prometheus recording rules.

## Configuration

The plugin has no required configuration. Once installed and enabled, navigate to it from the Grafana sidebar.

### Supported Datasources

Any Prometheus-compatible datasource can be selected in the SLI query step.

### Template Variables

Use `{{window}}` in PromQL queries for automatic window substitution. Custom variables can be defined in Step 1 and referenced as `{{.variableName}}`.

## Development

### Prerequisites

- Node.js >= 22
- Docker and Docker Compose

### Setup

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# In another terminal, start Grafana with the plugin
npm run server

# Open http://localhost:3000
```

### Testing

```bash
# Unit tests
npm run test:ci

# E2E tests (requires running server)
npm run e2e

# Linting and type checking
npm run lint
npm run typecheck
```

### Building

```bash
npm run build
```

## License

Apache 2.0 - See [LICENSE](LICENSE) for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.
