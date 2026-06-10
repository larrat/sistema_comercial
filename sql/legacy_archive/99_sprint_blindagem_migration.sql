-- SPRINT DE BLINDAGEM: ADIÇÃO DE FLAGS DE AUDITORIA E NEGÓCIO

-- 1. Clientes: Inadimplência e Soft Delete
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS is_defaulter BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Produtos: Mostruário e Soft Delete
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 3. Pedidos: Soft Delete
ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 4. Índices para Performance de Auditoria
CREATE INDEX IF NOT EXISTS idx_clientes_active ON clientes(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_produtos_active ON produtos(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_pedidos_active ON pedidos(is_active) WHERE is_active = TRUE;

COMMENT ON COLUMN clientes.is_defaulter IS 'Flag para bloqueio de venda a prazo para clientes inadimplentes.';
COMMENT ON COLUMN produtos.is_sample IS 'Flag para peças de mostruário com precificação diferenciada.';
