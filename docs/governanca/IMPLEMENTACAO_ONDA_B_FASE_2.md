# Implementacao - Onda B da Fase 2

Data base: 2026-04-08  
Status: iniciada no repositório  
Objetivo: colocar em pé a base real da automacao UI para:

- login autenticado
- setup de filial
- carregamento inicial da filial

## O que foi criado

- base minima de Playwright em [package.json](/e:/Programas/sistema_comercial/package.json)
- configuracao em [playwright.config.js](/e:/Programas/sistema_comercial/playwright.config.js)
- base compartilhada em [ui-core.helpers.js](/e:/Programas/sistema_comercial/tests/e2e/support/ui-core.helpers.js)
- specs separados em:
  - [login.spec.js](/e:/Programas/sistema_comercial/tests/e2e/login.spec.js)
  - [setup-filial.spec.js](/e:/Programas/sistema_comercial/tests/e2e/setup-filial.spec.js)
  - [bootstrap-filial.spec.js](/e:/Programas/sistema_comercial/tests/e2e/bootstrap-filial.spec.js)

## Escopo atual dos specs

### `login.spec.js`
1. abrir a aplicacao
2. validar tela de setup/login
3. autenticar com credenciais validas
4. aguardar o gate de autenticacao fechar

### `setup-filial.spec.js`
1. autenticar
2. validar exibicao de filiais
3. validar modo alternativo de criacao inicial quando nao houver filial

### `bootstrap-filial.spec.js`
1. autenticar
2. selecionar a primeira filial disponivel
3. entrar no app
4. validar bootstrap minimo da aplicacao

## Variaveis esperadas

- `E2E_BASE_URL`
- `E2E_LOGIN_EMAIL`
- `E2E_LOGIN_PASSWORD`
- `E2E_SUPABASE_URL`
- `E2E_SUPABASE_KEY`

## Comando previsto

```powershell
npm install
npx playwright install
$env:E2E_BASE_URL="http://127.0.0.1:4173"
$env:E2E_LOGIN_EMAIL="usuario@dominio.com"
$env:E2E_LOGIN_PASSWORD="senha"
$env:E2E_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
$env:E2E_SUPABASE_KEY="SUA_PUBLISHABLE_KEY"
npm run test:e2e:ui-core
```

Para rodar isolado:

```powershell
npm run test:e2e:login
npm run test:e2e:setup-filial
npm run test:e2e:bootstrap-filial
```

## Limitacoes assumidas nesta primeira entrega

- o spec pula a execucao se email/senha nao forem informados
- a criacao da primeira filial continua manual
- o host atual nao possui Node, entao a execucao real nao foi validada aqui

## Proximo passo recomendado

1. executar os specs em uma maquina com Node
2. ajustar o ambiente base (`E2E_BASE_URL`)
3. se passar, decidir se a suite continua separada ou ganha um agregador serial
