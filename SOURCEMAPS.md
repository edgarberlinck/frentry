# Source Maps - Complete Guide

This document explains how to upload source maps to Frentry to get resolved stack traces for captured errors.

## What are Source Maps?

Source maps map minified/transpiled code back to the original source code. When you upload your project's source maps, Frentry can show the original file, line, and column in stack traces.

## Configuration

### 1. Enable source maps in build

#### Next.js / React

```js
// next.config.js
module.exports = {
  productionBrowserSourceMaps: true,
  // ...
}
```

#### Vite

```js
// vite.config.js
export default {
  build: {
    sourcemap: true,
  }
}
```

#### Webpack

```js
// webpack.config.js
module.exports = {
  devtool: 'source-map',
  // ...
}
```

### 2. Build your project

```bash
npm run build
```

This will generate `.js.map` files alongside your JavaScript files.

### 3. Upload source maps

#### Option 1: Via CLI Script (Recommended)

```bash
# With arguments
node scripts/upload-sourcemaps.js \
  --project-id <your-project-id> \
  --version 1.0.0 \
  --dir ./dist

# With environment variables
export FRENTRY_PROJECT_ID=<your-project-id>
export FRENTRY_VERSION=1.0.0
export FRENTRY_SOURCEMAP_DIR=./dist
node scripts/upload-sourcemaps.js
```

#### Option 2: Via cURL

```bash
# First, convert source maps to JSON
curl -X POST http://localhost:3000/api/projects/<project-id>/releases \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{
    "version": "1.0.0",
    "sourceMaps": [
      {
        "fileName": "app.js",
        "content": "<sourcemap-json-content>"
      }
    ]
  }'
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run build
      
      - name: Upload Source Maps
        env:
          FRENTRY_PROJECT_ID: ${{ secrets.FRENTRY_PROJECT_ID }}
          FRENTRY_VERSION: ${{ github.sha }}
          FRENTRY_SOURCEMAP_DIR: ./dist
          FRENTRY_API_URL: https://seu-frentry.com
        run: node scripts/upload-sourcemaps.js
```

### NPM Script

Add to `package.json`:

```json
{
  "scripts": {
    "build": "vite build",
    "upload-sourcemaps": "node scripts/upload-sourcemaps.js",
    "build:release": "npm run build && npm run upload-sourcemaps"
  }
}
```

Usage:

```bash
FRENTRY_PROJECT_ID=xxx FRENTRY_VERSION=1.0.0 npm run build:release
```

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `FRENTRY_PROJECT_ID` | ✅ | Project ID in Frentry | - |
| `FRENTRY_VERSION` | ✅ | Release version (e.g. 1.0.0, commit SHA) | - |
| `FRENTRY_SOURCEMAP_DIR` | ❌ | Directory containing .js.map files | `./dist` |
| `FRENTRY_API_URL` | ❌ | Frentry API URL | `http://localhost:3000` |
| `FRENTRY_AUTH_TOKEN` | ❌ | Authentication token (if needed) | - |

## How it Works

1. **Build**: Your bundler generates `.js` and `.js.map` files
2. **Upload**: Script finds all `.js.map` files and sends to Frentry
3. **Storage**: Source maps are stored by project and version
4. **Resolution**: When an error occurs:
   - SDK sends error with `release: "1.0.0"` field
   - Frentry fetches source maps for that version
   - Minified stack trace is transformed to original code

## Complete Example

### 1. Next.js Project

```js
// next.config.js
module.exports = {
  productionBrowserSourceMaps: true,
}
```

### 2. Build

```bash
npm run build
# Generates files in .next/static/chunks/*.js.map
```

### 3. Upload

```bash
node scripts/upload-sourcemaps.js \
  --project-id cm5xpto123 \
  --version 1.0.0 \
  --dir .next/static/chunks
```

### 4. Capture errors with release

```js
// In your app
window.frentry.init({
  dsn: 'https://...',
  release: '1.0.0' // Same version as upload!
});
```

## Tips

- ✅ **Use commit SHA as version** for traceability
- ✅ **Upload before deploy** to ensure source maps are available
- ✅ **Don't commit source maps to git** - add `*.map` to `.gitignore`
- ⚠️ **Source maps can be large** - consider cleaning old releases periodically
- 🔒 **Keep source maps private** - they contain your source code

## Security

Source maps are stored in the database and are only accessible by:
- Project owner (via dashboard)
- Stack trace resolution system (internal)

**Don't expose** the upload API URL publicly. Use in CI/CD with secrets.

## Troubleshooting

### Source maps are not being applied

1. Check if the version in the error matches the upload version:
   ```bash
   # In database
   SELECT version FROM Release WHERE projectId = 'xxx';
   
   # In error payload
   { "release": "1.0.0" }
   ```

2. Check if file names match:
   ```bash
   # Source map
   fileName: "app.js"
   
   # Stack trace
   at handleClick (app.js:42:15)
   ```

3. Check source map format:
   ```json
   {
     "version": 3,
     "sources": ["../src/app.ts"],
     "mappings": "AAAA,OAAO..."
   }
   ```

### Upload fails with 401

You need to be authenticated. Options:
1. Extract session cookie from browser
2. Implement a dedicated API token endpoint
3. Use credentials in a secure environment

### .map files not found

Check:
```bash
# List generated source maps
find ./dist -name "*.js.map"

# Check bundler configuration
# Next.js: productionBrowserSourceMaps: true
# Vite: build.sourcemap: true
```

## API Reference

### POST `/api/projects/:projectId/releases`

Upload source maps para um projeto.

**Headers:**
- `Content-Type: application/json`
- `Cookie: next-auth.session-token=...` (autenticação)

**Body:**
```json
{
  "version": "1.0.0",
  "sourceMaps": [
    {
      "fileName": "app.js",
      "content": "{\"version\":3,\"sources\":[...],\"mappings\":\"...\"}"
    }
  ]
}
```

**Response (201):**
```json
{
  "releaseId": "cm5xyz...",
  "version": "1.0.0"
}
```

## Storage

Currently, source maps are stored directly in PostgreSQL as TEXT. This is suitable for personal use and small teams.

For high-volume production, consider migrating to **Vercel Blob Storage** in the future to:
- Reduce database size
- Improve query performance
- Scale storage independently

## Next Steps

- [x] Webpack/Vite plugin for automatic upload
- [ ] Support for multiple artifacts per release
- [ ] Source map compression (gzip)
- [ ] Dedicated API token (without session cookie)
- [ ] Retention policy (auto-delete old releases)
- [ ] Optional migration to Vercel Blob Storage
