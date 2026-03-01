# Integration Examples - Source Maps

This directory contains practical examples of how to integrate source map uploads into your pipeline.

## Structure

```
examples/
├── next-js/          # Next.js with GitHub Actions
├── vite-react/       # Vite + React with manual upload
├── webpack-vanilla/  # Pure Webpack with plugin
└── README.md
```

## Choose Your Example

- **Next.js**: Complete application with CI/CD on GitHub Actions
- **Vite + React**: Modern SPA with upload script
- **Webpack**: Configuration with automatic plugin

## Basic Concepts

All examples follow this flow:

1. **Build** with source maps enabled
2. **Upload** source maps to Frentry
3. **Release tracking** in app code

```js
// In your frontend app
window.frentry.init({
  dsn: 'your-dsn-here',
  release: '1.0.0' // Same version as upload!
});
```

## Quick Start

```bash
# 1. Clone an example
cp -r examples/vite-react my-app
cd my-app

# 2. Configure variables
cp .env.example .env
# Edit .env with your PROJECT_ID

# 3. Build and upload
npm install
npm run build
npm run upload-sourcemaps
```

## Common Variables

All examples use these variables:

```bash
FRENTRY_PROJECT_ID=<your-project-id>
FRENTRY_VERSION=1.0.0
FRENTRY_SOURCEMAP_DIR=./dist
FRENTRY_API_URL=https://your-frentry.com
```

## CI/CD

For production environments, use GitHub Actions / GitLab CI:

```yaml
- name: Upload Source Maps
  env:
    FRENTRY_PROJECT_ID: ${{ secrets.FRENTRY_PROJECT_ID }}
    FRENTRY_VERSION: ${{ github.sha }}
  run: node scripts/upload-sourcemaps.js
```

## Troubleshooting

See [SOURCEMAPS.md](../SOURCEMAPS.md) for common issues resolution.
