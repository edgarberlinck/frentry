# Example: Webpack + Plugin

Configuration with automatic plugin that uploads after each build.

## 1. Webpack Config

**webpack.config.js**
```js
const path = require('path');
const FrentrySourceMapPlugin = require('../../scripts/frentry-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  
  entry: './src/index.js',
  
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
  },
  
  devtool: 'source-map', // Generate source maps
  
  plugins: [
    new FrentrySourceMapPlugin({
      projectId: process.env.FRENTRY_PROJECT_ID,
      version: process.env.FRENTRY_VERSION || 'dev',
      apiUrl: process.env.FRENTRY_API_URL || 'http://localhost:3000',
      enabled: process.env.NODE_ENV === 'production',
      deleteAfterUpload: true, // Remove .map files from output
    })
  ],
  
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  }
};
```

## 2. Package.json

```json
{
  "name": "webpack-app",
  "scripts": {
    "build": "webpack",
    "build:prod": "NODE_ENV=production webpack",
    "dev": "webpack --watch"
  },
  "devDependencies": {
    "@babel/core": "^7.23.0",
    "@babel/preset-env": "^7.23.0",
    "babel-loader": "^9.1.3",
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.4"
  }
}
```

## 3. Environment Variables

**.env**
```bash
FRENTRY_PROJECT_ID=xxx
FRENTRY_VERSION=1.0.0
FRENTRY_API_URL=http://localhost:3000
NODE_ENV=production
```

## 4. Código do App

**src/index.js**
```js
// Initialize error tracking
const FRENTRY_DSN = 'https://xxx@your-frentry.com/xxx';
const APP_VERSION = '1.0.0';

function sendError(error) {
  fetch('http://localhost:3000/api/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dsn: FRENTRY_DSN,
      type: error.name || 'Error',
      message: error.message,
      stacktrace: error.stack,
      release: APP_VERSION,
    })
  }).catch(console.error);
}

window.addEventListener('error', (event) => {
  sendError(event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  sendError(new Error(event.reason));
});

// Your code here
console.log('App initialized');

// Example: trigger error
document.getElementById('error-btn')?.addEventListener('click', () => {
  throw new Error('Test error from Webpack app!');
});
```

**public/index.html**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Webpack App</title>
</head>
<body>
  <h1>Webpack App</h1>
  <button id="error-btn">Trigger Test Error</button>
  
  <script src="main.js"></script>
</body>
</html>
```

## 5. Build Script

**build.sh**
```bash
#!/bin/bash
set -e

# Load environment variables
export $(cat .env | xargs)

# Build with automatic upload via plugin
npm run build:prod

echo "✅ Build complete and source maps uploaded!"
```

## How it Works

1. **Build starts**: `npm run build:prod`
2. **Webpack compiles** code and generates source maps
3. **Plugin detects** `.js.map` files in output
4. **Automatic upload** via Frentry API
5. **Cleanup** (optional): removes `.map` from dist/

## Plugin Advantages

- ✅ Automatic upload on every build
- ✅ No separate script needed
- ✅ Can remove source maps from public output
- ✅ Integrated in Webpack pipeline

## Plugin Options

```js
new FrentrySourceMapPlugin({
  projectId: 'xxx',           // Required
  version: '1.0.0',           // Required
  apiUrl: 'http://...',       // Optional
  authToken: 'token',         // Optional
  enabled: true,              // Optional (default: true)
  deleteAfterUpload: false,   // Optional (default: false)
})
```

## Production Flow

```bash
# 1. Configure variables
export FRENTRY_PROJECT_ID=xxx
export FRENTRY_VERSION=$(git rev-parse --short HEAD)
export NODE_ENV=production

# 2. Build (plugin uploads automatically)
npm run build:prod

# 3. Deploy
# rsync, scp, aws s3 sync, etc.
```

## Local Testing

```bash
# Development build (no upload)
npm run build

# Production build (with upload)
NODE_ENV=production \
FRENTRY_PROJECT_ID=xxx \
FRENTRY_VERSION=test \
npm run build:prod
```

## Debugging

To see plugin logs:

```js
// webpack.config.js
new FrentrySourceMapPlugin({
  // ...
  onUploadComplete: (result) => {
    console.log('Upload result:', result);
  },
  onUploadError: (error) => {
    console.error('Upload error:', error);
  }
})
```

## Alternative: Manual Hook

If you don't want to use the plugin:

```js
// webpack.config.js
const { exec } = require('child_process');

module.exports = {
  // ...
  plugins: [
    {
      apply: (compiler) => {
        compiler.hooks.done.tap('UploadSourceMaps', () => {
          if (process.env.NODE_ENV === 'production') {
            exec('node ../../scripts/upload-sourcemaps.js --dir ./dist');
          }
        });
      }
    }
  ]
};
```
