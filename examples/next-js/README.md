# Example: Next.js + GitHub Actions

Complete configuration for Next.js with automatic upload via CI/CD.

## Structure

```
next-js/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── next.config.js
├── package.json
└── .env.example
```

## 1. Next.js Configuration

**next.config.js**
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable source maps in production
  productionBrowserSourceMaps: true,
}

module.exports = nextConfig
```

## 2. Package.json

```json
{
  "name": "my-nextjs-app",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "upload-sourcemaps": "node ../../scripts/upload-sourcemaps.js"
  }
}
```

## 3. GitHub Actions

**.github/workflows/deploy.yml**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Upload Source Maps
        env:
          FRENTRY_PROJECT_ID: ${{ secrets.FRENTRY_PROJECT_ID }}
          FRENTRY_VERSION: ${{ github.sha }}
          FRENTRY_SOURCEMAP_DIR: ./.next/static/chunks
          FRENTRY_API_URL: ${{ secrets.FRENTRY_API_URL }}
        run: npm run upload-sourcemaps
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## 4. GitHub Secrets

Configure in: `Settings > Secrets and variables > Actions`

- `FRENTRY_PROJECT_ID`: Frentry project ID
- `FRENTRY_API_URL`: API URL (e.g. https://frentry.com)
- `VERCEL_TOKEN`: Vercel deploy token
- `VERCEL_ORG_ID`: Organization ID
- `VERCEL_PROJECT_ID`: Project ID

## 5. App Code

**pages/_app.js**
```js
import { useEffect } from 'react'

// Simple error capture
function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Initialize Frentry (when SDK is ready)
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        fetch('https://your-frentry.com/api/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dsn: process.env.NEXT_PUBLIC_FRENTRY_DSN,
            type: event.error?.name || 'Error',
            message: event.error?.message || event.message,
            stacktrace: event.error?.stack,
            release: process.env.NEXT_PUBLIC_APP_VERSION,
          })
        })
      })
    }
  }, [])

  return <Component {...pageProps} />
}

export default MyApp
```

**.env.local**
```bash
NEXT_PUBLIC_FRENTRY_DSN=https://xxx@your-frentry.com/xxx
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## Complete Flow

1. ✅ Developer pushes to `main`
2. ✅ GitHub Actions:
   - Install dependencies
   - Build with source maps
   - Upload source maps (with commit SHA)
   - Deploy to Vercel
3. ✅ Production app:
   - Errors are captured
   - Sent with `release: "<commit-sha>"`
   - Frentry resolves stack traces automatically

## Local Testing

```bash
# Build
npm run build

# Upload (manual)
FRENTRY_PROJECT_ID=xxx \
FRENTRY_VERSION=local-test \
FRENTRY_SOURCEMAP_DIR=./.next/static/chunks \
npm run upload-sourcemaps
```

## Tips

- Use `${{ github.sha }}` as version to track commits
- Next.js source maps are in `.next/static/chunks/`
- Consider uploading only in production (`if: github.ref == 'refs/heads/main'`)
