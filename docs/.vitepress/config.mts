import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "RSC Docs",
  description: "Manuais e Guias de Operação da RSC Reformas",
  themeConfig: {
    nav: [
      { text: 'Início', link: '/' },
      { text: 'Manual Operacional', link: '/src/equipe/' },
      { text: 'Guia do Desenvolvedor', link: '/src/devs/' }
    ],

    sidebar: {
      '/src/equipe/': [
        {
          text: 'RSC Reformas',
          items: [
            { text: 'Visão Geral', link: '/src/equipe/' },
            { text: 'Módulo 1: Estruturação', link: '/src/equipe/modulo-1-estruturacao' },
            { text: 'Módulo 2: Orçamento & BDI', link: '/src/equipe/modulo-2-orcamento' },
            { text: 'Módulo 3: Etapas da Obra', link: '/src/equipe/modulo-3-etapas' },
            { text: 'Módulo 4: Experiência do Cliente', link: '/src/equipe/modulo-4-experiencia' },
            { text: 'Módulo 5: Gestão de Equipe', link: '/src/equipe/modulo-5-gestao' },
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
