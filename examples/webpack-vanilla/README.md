# Exemplo: Webpack + Plugin

Configuração com plugin automático que faz upload após cada build.

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
  
  devtool: 'source-map', // Gera source maps
  
  plugins: [
    new FrentrySourceMapPlugin({
      projectId: process.env.FRENTRY_PROJECT_ID,
      version: process.env.FRENTRY_VERSION || 'dev',
      apiUrl: process.env.FRENTRY_API_URL || 'http://localhost:3000',
      enabled: process.env.NODE_ENV === 'production',
      deleteAfterUpload: true, // Remove .map files do output
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
// Inicializa error tracking
const FRENTRY_DSN = 'https://xxx@seu-frentry.com/xxx';
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

// Seu código aqui
console.log('App initialized');

// Exemplo: trigger error
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

# Carrega variáveis de ambiente
export $(cat .env | xargs)

# Build com upload automático via plugin
npm run build:prod

echo "✅ Build complete and source maps uploaded!"
```

## Como Funciona

1. **Build inicia**: `npm run build:prod`
2. **Webpack compila** código e gera source maps
3. **Plugin detecta** `.js.map` files no output
4. **Upload automático** via API do Frentry
5. **Cleanup** (opcional): remove `.map` do dist/

## Vantagens do Plugin

- ✅ Upload automático a cada build
- ✅ Não precisa de script separado
- ✅ Pode remover source maps do output público
- ✅ Integrado no pipeline do Webpack

## Opções do Plugin

```js
new FrentrySourceMapPlugin({
  projectId: 'xxx',           // Obrigatório
  version: '1.0.0',           // Obrigatório
  apiUrl: 'http://...',       // Opcional
  authToken: 'token',         // Opcional
  enabled: true,              // Opcional (default: true)
  deleteAfterUpload: false,   // Opcional (default: false)
})
```

## Fluxo de Produção

```bash
# 1. Configurar variáveis
export FRENTRY_PROJECT_ID=xxx
export FRENTRY_VERSION=$(git rev-parse --short HEAD)
export NODE_ENV=production

# 2. Build (plugin faz upload automaticamente)
npm run build:prod

# 3. Deploy
# rsync, scp, aws s3 sync, etc.
```

## Teste Local

```bash
# Build de desenvolvimento (não faz upload)
npm run build

# Build de produção (com upload)
NODE_ENV=production \
FRENTRY_PROJECT_ID=xxx \
FRENTRY_VERSION=test \
npm run build:prod
```

## Debugging

Para ver logs do plugin:

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

## Alternativa: Hook Manual

Se não quiser usar o plugin:

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
