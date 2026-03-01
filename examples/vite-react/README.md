# Example: Vite + React

Configuration for Vite with manual source map upload.

## 1. Vite Config

**vite.config.js**
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  build: {
    // Generate source maps
    sourcemap: true,
    
    rollupOptions: {
      output: {
        // Consistent names for easier mapping
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  }
})
```

## 2. Package.json

```json
{
  "name": "vite-react-app",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "upload-sourcemaps": "node ../../scripts/upload-sourcemaps.js",
    "build:release": "npm run build && npm run upload-sourcemaps"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0"
  }
}
```

## 3. Environment Variables

**.env.production**
```bash
VITE_FRENTRY_DSN=https://xxx@seu-frentry.com/xxx
VITE_APP_VERSION=1.0.0
```

## 4. Error Tracking

**src/main.jsx**
```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Simple error handler
window.addEventListener('error', (event) => {
  fetch(import.meta.env.VITE_FRENTRY_API + '/api/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dsn: import.meta.env.VITE_FRENTRY_DSN,
      type: event.error?.name || 'Error',
      message: error?.message || event.message,
      stacktrace: event.error?.stack,
      release: import.meta.env.VITE_APP_VERSION,
      metadata: {
        url: window.location.href,
        userAgent: navigator.userAgent,
      }
    })
  }).catch(console.error)
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

## 5. Build & Upload

### Local Development

```bash
npm run build
```

### With Upload

```bash
# Via npm script
FRENTRY_PROJECT_ID=xxx \
FRENTRY_VERSION=1.0.0 \
npm run build:release

# Or manually
npm run build
FRENTRY_PROJECT_ID=xxx \
FRENTRY_VERSION=1.0.0 \
FRENTRY_SOURCEMAP_DIR=./dist \
npm run upload-sourcemaps
```

## 6. Deploy Script

**deploy.sh**
```bash
#!/bin/bash
set -e

VERSION=$(git rev-parse --short HEAD)

echo "Building version: $VERSION"
npm run build

echo "Uploading source maps..."
FRENTRY_PROJECT_ID=$FRENTRY_PROJECT_ID \
FRENTRY_VERSION=$VERSION \
FRENTRY_SOURCEMAP_DIR=./dist \
node ../../scripts/upload-sourcemaps.js

echo "Deploying to production..."
# Your deploy command here
# rsync, scp, aws s3 sync, etc.

echo "✅ Deploy complete!"
```

Usage:
```bash
chmod +x deploy.sh
export FRENTRY_PROJECT_ID=xxx
./deploy.sh
```

## Testing

**src/App.jsx**
```jsx
function App() {
  const triggerError = () => {
    // Example error for testing
    throw new Error('Test error from Vite app!')
  }

  return (
    <div>
      <h1>Vite + React</h1>
      <button onClick={triggerError}>
        Trigger Test Error
      </button>
    </div>
  )
}

export default App
```

## Final Structure

```
dist/
├── index.html
├── index.js         # Main bundle
├── index.js.map     # Source map
├── vendor.js
└── vendor.js.map
```

## Verification

```bash
# 1. Build
npm run build

# 2. Check source maps
ls -lh dist/*.map

# 3. Upload
FRENTRY_PROJECT_ID=xxx \
FRENTRY_VERSION=1.0.0 \
npm run upload-sourcemaps

# 4. Test app
npm run preview
# Open http://localhost:4173 and click the error button
```
