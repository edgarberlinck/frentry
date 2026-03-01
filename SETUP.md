# Frentry - Setup da Infraestrutura

## Pré-requisitos
- Docker e Docker Compose instalados

## Configuração

### 1. Subir a infraestrutura

```bash
docker compose up -d
```

Isso irá criar:
- PostgreSQL na porta **55003**
  - Usuário: `frentry`
  - Senha: `frentry_password`
  - Database: `frentry`

### 2. Verificar o status

```bash
docker compose ps
docker compose logs postgres
```

### 3. Configurar variáveis de ambiente

O arquivo `.env` já foi criado com as configurações padrão. Para produção, **altere o NEXTAUTH_SECRET**:

```bash
# Gerar um secret seguro
openssl rand -base64 32
```

### 4. Executar as migrations do Prisma

```bash
npm install
npx prisma migrate dev
```

### 5. Iniciar a aplicação

```bash
npm run dev
```

A aplicação estará disponível em: http://localhost:3000

## Comandos úteis

### Parar a infraestrutura
```bash
docker compose down
```

### Parar e remover volumes (limpa o banco de dados)
```bash
docker compose down -v
```

### Ver logs do PostgreSQL
```bash
docker compose logs -f postgres
```

### Conectar ao PostgreSQL via CLI
```bash
docker compose exec postgres psql -U frentry -d frentry
```

## Configurações opcionais

### SMTP (Notificações por e-mail)

Edite o arquivo `.env` e configure as variáveis SMTP:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
SMTP_FROM=noreply@frentry.com
```
