# Status do Sistema: Arquitetura ERP e Governança
**Atualizado em: 02 de Junho de 2026**

Este documento sumariza os avanços e a consolidação do sistema na fase de transição de um PDV/Gestão Simples para um **ERP Completo e Modular**. 

---

## 1. O que foi construído nesta etapa?

O roteiro de implementação focou em três grandes pilares para garantir segurança contábil, operacional e transacional.

### 1.1 Arquitetura Fiscal Modular (Motor Tributário)
- **Tabelas Essenciais**: Foram criadas as matrizes fiscais base `fiscal_ncms`, `fiscal_aliquotas_icms`, `fiscal_pis_cofins`, `fiscal_regras_tributacao` e `fiscal_cfop_mapeamento`.
- **Motor RPC**: Implementação da função `calcular_tributos_item` no banco de dados. Este motor isola as regras fiscais do front-end, cruzando a UF da filial, UF do cliente e o NCM do produto para entregar cálculos exatos e o valor aproximado dos tributos (IBPT).
- **Adequação ao IVA Dual**: As estruturas de banco de dados e as interfaces do usuário (Kardex e Pedidos) foram ajustadas para armazenar de forma granular os tributos do novo cenário fiscal brasileiro (CBS, IBS e IS), garantindo conformidade para a transição que inicia em 2026.

### 1.2 RPA Fiscal Híbrido (Processamento de NFe)
- **Importação de XML Mapeada**: Implementação de um módulo RPA para ler arquivos XML de notas fiscais de compra (NFe) e importar os itens.
- **Kardex (Estoque) Automático**: Os itens processados do XML dão entrada automaticamente no estoque da filial correspondente. O sistema mapeia os produtos baseados no `cProd` ou Código de Barras utilizando a tabela `fornecedor_produto_vinculo`.
- **Contas a Pagar Integrado**: O XML gera automaticamente os lançamentos financeiros no módulo de Contas a Pagar, mantendo amarração transacional com a entrada no estoque.

### 1.3 Integridade Transacional (Cancelamentos e Estornos)
- **Segurança de Fluxo (`pedido_cancelar_seguro`)**: Criamos rotinas atômicas em PL/pgSQL para garantir que o cancelamento de um pedido faça o "rollback" perfeito do estoque e cancele as Contas a Receber associadas.
- **Trava de Segurança Financeira**: Inserção de triggers (`trg_block_cancel_contas_receber`) que bloqueiam cancelamentos manuais incorretos do Contas a Receber que pertençam a pedidos de venda, forçando os usuários a cancelarem o Pedido raiz (revertendo o estoque de forma alinhada).
- **Tratamento de Dados Legados**: Rotinas para ler itens não estruturados no banco (armazenados como JSONB) e garantir a correta devolução ao Kardex em caso de cancelamento.

---

## 2. Status Geral do Frontend (React)

- **Nova Tela de Governança Tributária (`FiscalSetupRoutePage`)**: Interface construída com o padrão visual Nexus Premium para gerenciar regras de CFOP, NCM e simulações do Motor Tributário.
- **Telas Reescritas**: O PageHeader das telas de Compras, Estoque, Contas a Receber, Caixa e Pedidos foi totalmente padronizado seguindo a estética dark-theme e glassmorphism da arquitetura atual.
- **Estabilidade de Rotas**: Menu lateral dinâmico reestruturado, agrupando os módulos em áreas estratégicas: _Vendas & CRM_, _Logística_, _Financeiro_ e _Governança Fiscal_.

---

## 3. Próximos Passos (Backlog ERP)
Com as bases contábeis prontas, o caminho natural do produto evolve para:
1. Emissão Ativa de NFe de Venda utilizando parceiros homologados (Ex: FocusNFe / Oobj / NuvemFiscal).
2. SPED Fiscal & Contribuições Automático a partir das consolidações do Banco de Dados.
3. Controle avançado de lotes e validade no Kardex.
