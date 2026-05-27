# Arquitetura do Sistema

O **NEXUS** é construído como uma *Single Page Application (SPA)* robusta, voltada para operações complexas de Varejo B2B e, agora, Engenharia Civil.

## Tech Stack Base
- **Frontend:** React + Vite
- **Roteamento:** React Router DOM v6
- **Estilização:** TailwindCSS (Design System Customizado / Glassmorphism / Dark Theme Premium)
- **Gerenciamento de Estado Global:** Zustand (Stores locais de Auth, Filial, Role e UI)
- **Data Fetching:** React Query (@tanstack/react-query)
- **Backend / BaaS:** Supabase (PostgreSQL, Auth, Storage)

## Estrutura de Pastas (Features-first)
O projeto é organizado seguindo o conceito de *Feature Slices*:
`/src/react/features/*`

Exemplo do módulo de contratos:
```text
/contratos
  /components     (Componentes visuais, modais, cards)
  /hooks          (Custom hooks para lógica complexa)
  /pages          (As rotas principais acessadas via React Router)
  /services       (Comunicação com a API do Supabase)
  /types          (Definições TypeScript da feature)
```

## Por que SPA?
Manteremos a abordagem **SPA** em vez de Server-Side Rendering (SSR) pelo seguinte motivo estratégico:
- O sistema é focado no uso "Logado" (Dashboard).
- Não temos forte necessidade de SEO dinâmico nas tabelas internas.
- O Frontend pode ser hospedado de forma barata e rápida (Vercel, Cloudflare Pages ou Netlify), conversando diretamente com o Supabase sem precisar de um Node.js intermediário custoso (Next.js).
