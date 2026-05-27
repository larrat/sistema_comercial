import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "NEXUS Docs",
  description: "Manuais e Guias da Plataforma NEXUS",
  themeConfig: {
    nav: [
      { text: 'Início', link: '/' },
      { text: 'Manual da Equipe', link: '/src/equipe/' },
      { text: 'Guia do Desenvolvedor', link: '/src/devs/' }
    ],

    sidebar: {
      '/src/equipe/': [
        {
          text: 'RSC Reformas',
          items: [
            { text: 'Visão Geral', link: '/src/equipe/' },
            { text: '1. Orçamentos & BDI', link: '/src/equipe/orcamentos' },
            { text: '2. Gestão de Compras', link: '/src/equipe/compras' },
            { text: '3. Diário de Obra (RDO)', link: '/src/equipe/rdo' },
          ]
        }
      ],
      '/src/devs/': [
        {
          text: 'Desenvolvimento',
          items: [
            { text: 'Arquitetura do Sistema', link: '/src/devs/' },
            { text: 'Estrutura do Banco (SQL)', link: '/src/devs/sql' },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/rsc' }
    ]
  }
})
