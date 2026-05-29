import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import type { OrcamentoObra } from '../services/orcamentosApi';
import { fmtBRL } from '../../../shared/lib/formatters';

// Opcional: Registrar uma fonte customizada (ex: Roboto ou Inter)
// Font.register({ family: 'Inter', src: '...' });

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#1e293b',
    paddingBottom: 20,
    marginBottom: 30,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'black',
    color: '#0f172a',
    letterSpacing: 2,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  titleSection: {
    marginBottom: 30,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  clientInfo: {
    fontSize: 12,
    color: '#475569',
  },
  ambienteSection: {
    marginBottom: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    padding: 12,
  },
  ambienteTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 6,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  itemDesc: {
    fontSize: 10,
    color: '#334155',
    flex: 1,
    paddingRight: 20,
  },
  itemPrice: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  ambienteTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  ambienteTotalText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  summarySection: {
    marginTop: 40,
    padding: 20,
    backgroundColor: '#0f172a',
    borderRadius: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  summaryTotal: {
    fontSize: 20,
    fontWeight: 'heavy',
    color: '#34d399',
  },
  clausulaSection: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  clausulaTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  clausulaText: {
    fontSize: 9,
    color: '#64748b',
    lineHeight: 1.5,
    textAlign: 'justify',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  }
});

type Props = {
  orcamento: OrcamentoObra;
};

export const PropostaComercialPDF = ({ orcamento }: Props) => {
  const isAdmin = orcamento.modalidade === 'administracao';
  const itens = orcamento.itens || [];
  
  // Agrupar itens por ambiente
  const ambientesMap = new Map<string, typeof itens>();
  itens.forEach(i => {
    const key = i.ambiente || 'Geral';
    if (!ambientesMap.has(key)) ambientesMap.set(key, []);
    ambientesMap.get(key)!.push(i);
  });
  const ambientes = Array.from(ambientesMap.entries());

  // Helper para calcular o preço final de um item ou ambiente com BDI embutido
  const calcularPrecoVenda = (custoDiretoTotal: number) => {
    if (isAdmin) {
      // Na administração, o valor mostrado ao cliente muitas vezes é só o Custo (pois a taxa é por fora),
      // Mas para a proposta 'Chave na Mão' vamos somar tudo para mostrar o "Investimento Estimado".
      return custoDiretoTotal * (1 + ((orcamento.taxa_administracao_percentual || 0) / 100));
    }
    return custoDiretoTotal * (1 + ((orcamento.bdi_percentual || 0) / 100));
  };

  const valorTotal = orcamento.calculos?.preco_venda_final || 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.logo}>RSC REFORMAS</Text>
            <Text style={styles.subtitle}>Gestão & Execução de Obras</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>DATA: {new Date().toLocaleDateString('pt-BR')}</Text>
            <Text style={{ fontSize: 10, color: '#64748b' }}>PROPOSTA #{orcamento.id.split('-')[0].toUpperCase()}</Text>
          </View>
        </View>

        {/* TITLE & CLIENT */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{orcamento.titulo}</Text>
          <Text style={styles.clientInfo}>Cliente: {orcamento.cliente_nome || orcamento.cliente?.nome}</Text>
        </View>

        {/* ESCOPO POR AMBIENTES (Sem mostrar custo unitário de prego) */}
        {ambientes.map(([amb, ambItens]) => {
          const custoDiretoAmbiente = ambItens.reduce((acc, i) => acc + ((i.custo_material_unitario + i.custo_mao_obra_unitario) * i.quantidade), 0);
          const precoVendaAmbiente = calcularPrecoVenda(custoDiretoAmbiente);

          return (
            <View key={amb} style={styles.ambienteSection}>
              <Text style={styles.ambienteTitle}>{amb}</Text>
              
              {ambItens.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <Text style={styles.itemDesc}>• {item.descricao_servico}</Text>
                  {/* Se quiser esconder o preço de cada item e mostrar só o total do ambiente, basta comentar a linha abaixo */}
                  <Text style={styles.itemPrice}>{fmtBRL(calcularPrecoVenda((item.custo_material_unitario + item.custo_mao_obra_unitario) * item.quantidade))}</Text>
                </View>
              ))}

              <View style={styles.ambienteTotal}>
                <Text style={styles.ambienteTotalText}>Subtotal do Ambiente:</Text>
                <Text style={styles.ambienteTotalText}>{fmtBRL(precoVendaAmbiente)}</Text>
              </View>
            </View>
          );
        })}

        {/* SUMMARY / FECHAMENTO */}
        <View style={styles.summarySection} wrap={false}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Modalidade de Contratação</Text>
            <Text style={styles.summaryValue}>{isAdmin ? 'Obra por Administração (Preço de Custo)' : 'Empreitada de Mão de Obra (Preço Fechado)'}</Text>
          </View>
          <View style={[styles.summaryRow, { marginTop: 10, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 15 }]}>
            <Text style={styles.summaryLabel}>Investimento Total {isAdmin ? 'Estimado' : ''}</Text>
            <Text style={styles.summaryTotal}>{fmtBRL(valorTotal)}</Text>
          </View>
        </View>

        {/* CLÁUSULAS (Dinâmicas) */}
        <View style={styles.clausulaSection} wrap={false}>
          <Text style={styles.clausulaTitle}>Termos e Condições Comerciais</Text>
          {isAdmin ? (
            <Text style={styles.clausulaText}>
              Esta proposta foi elaborada na modalidade "Taxa de Administração". Os valores apresentados acima referentes a materiais e mão de obra terceirizada são ESTIMATIVAS baseadas no projeto fornecido. O cliente pagará o preço de custo real diretamente aos fornecedores. A RSC Reformas atuará como gestora da obra, recebendo uma taxa de administração de {orcamento.taxa_administracao_percentual}% sobre o custo direto total executado, faturada quinzenalmente mediante prestação de contas.
            </Text>
          ) : (
            <Text style={styles.clausulaText}>
              Esta proposta foi elaborada na modalidade "Empreitada Global". Os valores apresentados constituem preço fechado e irreajustável para o escopo estritamente descrito acima. Quaisquer alterações de layout não previstas na modelagem 3D aprovada, ou adequações em estruturas não aparentes (vícios ocultos na alvenaria ou tubulações), serão orçadas separadamente como aditivos contratuais.
            </Text>
          )}
          <Text style={[styles.clausulaText, { marginTop: 8 }]}>
            Validade desta proposta comercial: 15 dias corridos a partir da data de emissão.
          </Text>
        </View>

        {/* FOOTER */}
        <Text style={styles.footer} fixed>
          RSC Reformas | CNPJ: 00.000.000/0001-00 | Contato: contato@rscreformas.com.br
        </Text>

      </Page>
    </Document>
  );
};
