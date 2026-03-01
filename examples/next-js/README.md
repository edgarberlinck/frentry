# Exemplo: Next.js + GitHub Actions

Configuração completa para Next.js com upload automático via CI/CD.

## Estrutura

```
next-js/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── next.config.js
├── package.json
└── .env.example
```

## 1. Configuração do Next.js

**next.config.js**
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Habilita source maps em produção
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

## 4. Secrets do GitHub

Configure em: `Settings > Secrets and variables > Actions`

- `FRENTRY_PROJECT_ID`: ID do projeto no Frentry
- `FRENTRY_API_URL`: URL da API (ex: https://frentry.com)
- `VERCEL_TOKEN`: Token de deploy do Vercel
- `VERCEL_ORG_ID`: ID da organização
- `VERCEL_PROJECT_ID`: ID do projeto

## 5. Código do App

**pages/_app.js**
```js
import { useEffect } from 'react'

// Simples captura de erros
function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Inicializa Frentry (quando tiver o SDK)
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        fetch('https://seu-frentry.com/api/ingest', {
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
NEXT_PUBLIC_FRENTRY_DSN=https://xxx@seu-frentry.com/xxx
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## Fluxo Completo

1. ✅ Developer faz push para `main`
2. ✅ GitHub Actions:
   - Instala dependências
   - Build com source maps
   - Upload source maps (com SHA do commit)
   - Deploy para Vercel
3. ✅ App em produção:
   - Erros são capturados
   - Enviados com `release: "<commit-sha>"`
   - Frentry resolve stack traces automaticamente

## Teste Local

```bash
# Build
npm run build

# Upload (manual)
FRENTRY_PROJECT_ID=xxx \
FRENTRY_VERSION=local-test \
FRENTRY_SOURCEMAP_DIR=./.next/static/chunks \
npm run upload-sourcemaps
```

## Dicas

- Use `${{ github.sha }}` como versão para rastrear commits
- Source maps do Next.js ficam em `.next/static/chunks/`
- Considere fazer upload apenas em produção (`if: github.ref == 'refs/heads/main'`)
