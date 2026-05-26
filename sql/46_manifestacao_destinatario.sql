-- 46_manifestacao_destinatario.sql
-- Objetivo: Criar a tabela public.nfe_destinadas para controle de notas emitidas contra o CNPJ da filial e suporte a Manifestação do Destinatário (SEFAZ).
-- Idempotente: pode rodar mais de uma vez.

begin;

create table if not exists public.nfe_destinadas (
    id uuid primary key default gen_random_uuid(),
    filial_id text not null references public.filiais(id) on delete cascade,
    chave_acesso char(44) unique not null,
    cnpj_emitente varchar(14) not null,
    nome_emitente varchar(255) not null,
    valor_total numeric(12,2) not null,
    data_emissao timestamp with time zone not null,
    manifesto_status varchar(30) default 'sem_manifesto' check (manifesto_status in ('sem_manifesto', 'ciencia', 'confirmado', 'desconhecido')),
    nfe_status varchar(20) default 'autorizada',
    xml_armazenado text,
    importado_compra_id varchar(50) references public.pedidos_compra(id) on delete set null,
    criado_em timestamp with time zone default now()
);

-- Criar índices para otimização
create index if not exists idx_nfe_destinadas_filial_id on public.nfe_destinadas(filial_id);
create index if not exists idx_nfe_destinadas_chave on public.nfe_destinadas(chave_acesso);
create index if not exists idx_nfe_destinadas_cnpj on public.nfe_destinadas(cnpj_emitente);

-- Seed de dados idempotente (vincula dinamicamente a primeira filial disponível)
do $$
declare
    v_filial_id text;
    v_count integer;
begin
    select count(*) into v_count from public.nfe_destinadas;
    if v_count = 0 then
        select id into v_filial_id from public.filiais limit 1;
        if v_filial_id is not null then
            -- 1. Nota da DISTRIBUIDORA DE ROUPAS SA (Pronta para dar Ciência e Importar)
            insert into public.nfe_destinadas (
                filial_id, 
                chave_acesso, 
                cnpj_emitente, 
                nome_emitente, 
                valor_total, 
                data_emissao, 
                manifesto_status, 
                xml_armazenado
            ) values (
                v_filial_id,
                '35260512345678000199550010000001231098765432',
                '12345678000199',
                'DISTRIBUIDORA DE ROUPAS SA',
                1399.70,
                now() - interval '2 days',
                'sem_manifesto',
                '<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe><emit><CNPJ>12345678000199</CNPJ><xNome>DISTRIBUIDORA DE ROUPAS SA</xNome></emit><det n="1"><prod><cProd>SKU-100</cProd><xProd>CAMISETA ALGODAO NEXUS</xProd><qCom>15.0000</qCom><vUnCom>45.5000</vUnCom><NCM>61091000</NCM><cEAN>7891234567890</cEAN></prod></det><det n="2"><prod><cProd>SKU-200</cProd><xProd>CALCA JEANS SLIM</xProd><qCom>8.0000</qCom><vUnCom>89.9000</vUnCom><NCM>62034200</NCM><cEAN>SEM GTIN</cEAN></prod></det></infNFe></NFe></nfeProc>'
            );

            -- 2. Nota da TECIDO VIVO IMPORTACAO LTDA (Já 'Confirmada' e pré-armazenada)
            insert into public.nfe_destinadas (
                filial_id, 
                chave_acesso, 
                cnpj_emitente, 
                nome_emitente, 
                valor_total, 
                data_emissao, 
                manifesto_status, 
                xml_armazenado
            ) values (
                v_filial_id,
                '35260598765432000188550010000004561012345678',
                '98765432000188',
                'TECIDO VIVO IMPORTACAO LTDA',
                700.00,
                now() - interval '5 days',
                'confirmado',
                '<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe><emit><CNPJ>98765432000188</CNPJ><xNome>TECIDO VIVO IMPORTACAO LTDA</xNome></emit><det n="1"><prod><cProd>SKU-300</cProd><xProd>BERMUDA CASUAL</xProd><qCom>20.0000</qCom><vUnCom>35.0000</vUnCom><NCM>62034300</NCM><cEAN>SEM GTIN</cEAN></prod></det></infNFe></NFe></nfeProc>'
            );

            -- 3. Nota fria da EMPRESA FANTASMA S/A (Pronta para simular o Desconhecimento/Alerta de Fraude)
            insert into public.nfe_destinadas (
                filial_id, 
                chave_acesso, 
                cnpj_emitente, 
                nome_emitente, 
                valor_total, 
                data_emissao, 
                manifesto_status
            ) values (
                v_filial_id,
                '35260500000000000100550010000009991099999999',
                '00000000000100',
                'EMPRESA FANTASMA S/A',
                98500.00,
                now() - interval '1 day',
                'sem_manifesto'
            );
        end if;
    end if;
end $$;

commit;
