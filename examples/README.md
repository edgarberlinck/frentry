# Exemplos de Integração - Source Maps

Este diretório contém exemplos práticos de como integrar o upload de source maps no seu pipeline.

## Estrutura

```
examples/
├── next-js/          # Next.js com GitHub Actions
├── vite-react/       # Vite + React com upload manual
├── webpack-vanilla/  # Webpack puro com plugin
└── README.md
```

## Escolha seu exemplo

- **Next.js**: Aplicação completa com CI/CD no GitHub Actions
- **Vite + React**: SPA moderna com script de upload
- **Webpack**: Configuração com plugin automático

## Conceitos Básicos

Todos os exemplos seguem este fluxo:

1. **Build** com source maps habilitados
2. **Upload** dos source maps para o Frentry
3. **Release tracking** no código do app

```js
// No seu app frontend
window.frentry.init({
  dsn: 'sua-dsn-aqui',
  release: '1.0.0' // Mesma versão do upload!
});
```

## Quick Start

```bash
# 1. Clone um exemplo
cp -r examples/vite-react my-app
cd my-app

# 2. Configure as variáveis
cp .env.example .env
# Edite .env com seu PROJECT_ID

# 3. Build e upload
npm install
npm run build
npm run upload-sourcemaps
```

## Variáveis Comuns

Todos os exemplos usam estas variáveis:

```bash
FRENTRY_PROJECT_ID=<seu-project-id>
FRENTRY_VERSION=1.0.0
FRENTRY_SOURCEMAP_DIR=./dist
FRENTRY_API_URL=https://seu-frentry.com
```

## CI/CD

Para ambientes de produção, use GitHub Actions / GitLab CI:

```yaml
- name: Upload Source Maps
  env:
    FRENTRY_PROJECT_ID: ${{ secrets.FRENTRY_PROJECT_ID }}
    FRENTRY_VERSION: ${{ github.sha }}
  run: node scripts/upload-sourcemaps.js
```

## Troubleshooting

Veja [SOURCEMAPS.md](../SOURCEMAPS.md) para resolução de problemas comuns.
