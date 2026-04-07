# Anti-padrões de Componentes (Documentados)

Data: 2026-04-07

## Anti-padrões críticos

## 1) Criar estilo local quando já existe componente global
- Errado: botão com estilo inline por tela.
- Certo: usar `.btn` + variante.

## 2) Mesma severidade com cores diferentes por módulo
- Errado: vermelho significar sucesso em um módulo e erro em outro.
- Certo: semântica única (erro=vermelho, atenção=âmbar, oportunidade=azul, sucesso=verde).

## 3) Toast genérico sem próximo passo
- Errado: `Erro ao salvar`.
- Certo: `Erro: ... Impacto: ... Ação: ...`.

## 4) Formulário sem foco no primeiro erro
- Errado: mostrar erro sem indicar onde corrigir.
- Certo: marcar campo com `is-error` e focar automaticamente.

## 5) Tabela desktop sem equivalente legível no mobile
- Errado: mesma tabela comprimida em 360px.
- Certo: `mobile-card` com campos-chave e ações.

## 6) Múltiplos CTAs primários no mesmo bloco
- Errado: duas ações principais com mesmo peso visual.
- Certo: um CTA principal e ações secundárias discretas.

## 7) Modal com excesso de campos sem progressão
- Errado: tudo em uma tela sem prioridade.
- Certo: fluxo por etapas/blocos com contexto.

## 8) Misturar lógica de status com ação
- Errado: badge clicável que age como botão sem indicação.
- Certo: badge só status; ação em botão explícito.

## 9) Duplicar seletor base no CSS sem controle
- Errado: redefinir `.btn`, `.app-topbar`, `.modal-box` em blocos concorrentes.
- Certo: alterar na camada base e validar impacto global.

## 10) Publicar release sem gate UX/UI
- Errado: publicar só com validação manual informal.
- Certo: checklist bloqueante + aprovador UX/UI nomeado.

## Checklist rápido anti-padrão (PR)
- [ ] Inclui inline style de componente base?
- [ ] Introduz nova variação sem token semântico?
- [ ] Cria feedback genérico sem ação?
- [ ] Quebra fluxo mobile de ação crítica?
- [ ] Duplica seletor global existente?

Se alguma resposta for "sim", PR deve voltar para ajuste.
