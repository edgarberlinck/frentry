# Source Maps - Guia Completo

Este documento explica como fazer upload de source maps para o Frentry para obter stack traces resolvidos nos erros capturados.

## O que são Source Maps?

Source maps mapeiam código minificado/transpilado de volta para o código fonte original. Quando você faz upload dos source maps do seu projeto, o Frentry pode mostrar o arquivo, linha e coluna originais nos stack traces.

## Configuração

### 1. Habilitar source maps no build

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

### 2. Build do projeto

```bash
npm run build
```

Isso irá gerar arquivos `.js.map` junto com os arquivos JavaScript.

### 3. Upload dos source maps

#### Opção 1: Via Script CLI (Recomendado)

```bash
# Com argumentos
node scripts/upload-sourcemaps.js \
  --project-id <seu-project-id> \
  --version 1.0.0 \
  --dir ./dist

# Com variáveis de ambiente
export FRENTRY_PROJECT_ID=<seu-project-id>
export FRENTRY_VERSION=1.0.0
export FRENTRY_SOURCEMAP_DIR=./dist
node scripts/upload-sourcemaps.js
```

#### Opção 2: Via cURL

```bash
# Primeiro, converta os source maps para JSON
curl -X POST http://localhost:3000/api/projects/<project-id>/releases \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{
    "version": "1.0.0",
    "sourceMaps": [
      {
        "fileName": "app.js",
        "content": "<conteúdo-do-sourcemap-json>"
      }
    ]
  }'
```

## Integração com CI/CD

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

Adicione ao `package.json`:

```json
{
  "scripts": {
    "build": "vite build",
    "upload-sourcemaps": "node scripts/upload-sourcemaps.js",
    "build:release": "npm run build && npm run upload-sourcemaps"
  }
}
```

Uso:

```bash
FRENTRY_PROJECT_ID=xxx FRENTRY_VERSION=1.0.0 npm run build:release
```

## Variáveis de Ambiente

| Variável | Obrigatório | Descrição | Padrão |
|----------|-------------|-----------|--------|
| `FRENTRY_PROJECT_ID` | ✅ | ID do projeto no Frentry | - |
| `FRENTRY_VERSION` | ✅ | Versão do release (ex: 1.0.0, commit SHA) | - |
| `FRENTRY_SOURCEMAP_DIR` | ❌ | Diretório com os .js.map | `./dist` |
| `FRENTRY_API_URL` | ❌ | URL da API do Frentry | `http://localhost:3000` |
| `FRENTRY_AUTH_TOKEN` | ❌ | Token de autenticação (se necessário) | - |

## Como funciona

1. **Build**: Seu bundler gera arquivos `.js` e `.js.map`
2. **Upload**: O script encontra todos os `.js.map` e envia para o Frentry
3. **Armazenamento**: Source maps são armazenados por projeto e versão
4. **Resolução**: Quando um erro ocorre:
   - O SDK envia o erro com o campo `release: "1.0.0"`
   - Frentry busca os source maps dessa versão
   - Stack trace minificado é transformado em código original

## Exemplo Completo

### 1. Projeto Next.js

```js
// next.config.js
module.exports = {
  productionBrowserSourceMaps: true,
}
```

### 2. Build

```bash
npm run build
# Gera arquivos em .next/static/chunks/*.js.map
```

### 3. Upload

```bash
node scripts/upload-sourcemaps.js \
  --project-id cm5xpto123 \
  --version 1.0.0 \
  --dir .next/static/chunks
```

### 4. Capturar erro com release

```js
// No seu app
window.frentry.init({
  dsn: 'https://...',
  release: '1.0.0' // Mesma versão do upload!
});
```

## Dicas

- ✅ **Use o commit SHA como versão** para rastreabilidade
- ✅ **Faça upload antes do deploy** para garantir que os source maps estejam disponíveis
- ✅ **Não commit source maps no git** - adicione `*.map` ao `.gitignore`
- ⚠️ **Source maps podem ser grandes** - considere limpar releases antigas periodicamente
- 🔒 **Mantenha source maps privados** - eles contêm seu código fonte

## Segurança

Os source maps ficam armazenados no banco de dados e são acessíveis apenas:
- Pelo proprietário do projeto (via dashboard)
- Pelo sistema de resolução de stack traces (interno)

**Não exponha** a URL da API de upload publicamente. Use em CI/CD com secrets.

## Troubleshooting

### Source maps não estão sendo aplicados

1. Verifique se a versão no erro bate com a versão do upload:
   ```bash
   # No banco
   SELECT version FROM Release WHERE projectId = 'xxx';
   
   # No payload do erro
   { "release": "1.0.0" }
   ```

2. Verifique se os nomes dos arquivos batem:
   ```bash
   # Source map
   fileName: "app.js"
   
   # Stack trace
   at handleClick (app.js:42:15)
   ```

3. Verifique o formato do source map:
   ```json
   {
     "version": 3,
     "sources": ["../src/app.ts"],
     "mappings": "AAAA,OAAO..."
   }
   ```

### Upload falha com 401

Você precisa estar autenticado. Opções:
1. Extraia o cookie de sessão do navegador
2. Implemente um endpoint de API com token dedicado
3. Use credenciais em um ambiente seguro

### Arquivos .map não encontrados

Verifique:
```bash
# Listar source maps gerados
find ./dist -name "*.js.map"

# Verificar configuração do bundler
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

## Armazenamento

Atualmente, os source maps são armazenados diretamente no PostgreSQL como TEXT. Isso é adequado para uso pessoal e pequenos times.

Para produção com alto volume, considere migrar para **Vercel Blob Storage** no futuro para:
- Reduzir tamanho do banco de dados
- Melhorar performance de queries
- Escalar armazenamento independentemente

## Próximos Passos

- [x] Plugin Webpack/Vite para upload automático
- [ ] Suporte para multiple artifacts por release
- [ ] Compressão de source maps (gzip)
- [ ] API token dedicado (sem cookie de sessão)
- [ ] Retention policy (auto-delete old releases)
- [ ] Migração opcional para Vercel Blob Storage
