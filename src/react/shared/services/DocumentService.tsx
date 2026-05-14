import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  PDFViewer,
  Font
} from '@react-pdf/renderer';

// Registrar fonte (opcional, mas melhora a estética)
// Font.register({ family: 'Inter', src: '...' });

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica'
  },
  header: {
    marginBottom: 20,
    borderBottom: 1,
    borderBottomColor: '#eeeeee',
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a'
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  section: {
    marginVertical: 15
  },
  label: {
    fontSize: 9,
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 4
  },
  value: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: 'bold'
  },
  table: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 8,
    overflow: 'hidden'
  },
  tableHeader: {
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc'
  },
  col1: { flex: 3, fontSize: 10, color: '#334155' },
  col2: { flex: 1, fontSize: 10, textAlign: 'center', color: '#334155' },
  col3: { flex: 1, fontSize: 10, textAlign: 'right', color: '#334155' },
  col4: { flex: 1, fontSize: 10, textAlign: 'right', fontWeight: 'bold', color: '#0f172a' },
  totalSection: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  totalBox: {
    width: 200,
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 12
  },
  totalLabel: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 5
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a'
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#cbd5e1',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10
  }
});

type ReceiptProps = {
  pedido: any;
  filialNome: string;
};

export const SalesReceipt = ({ pedido, filialNome }: ReceiptProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>NEXUS INDUSTRIAL</Text>
          <Text style={styles.subtitle}>Comprovante de Operação</Text>
        </View>
        <View style={{ textAlign: 'right' }}>
          <Text style={styles.value}>#{pedido.num || pedido.id.slice(0, 8)}</Text>
          <Text style={styles.label}>{new Date(pedido.data || pedido.criado_em).toLocaleDateString()}</Text>
        </View>
      </View>

      {/* Info Grid */}
      <View style={{ flexDirection: 'row', gap: 40 }}>
        <View style={styles.section}>
          <Text style={styles.label}>Filial de Origem</Text>
          <Text style={styles.value}>{filialNome}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Cliente</Text>
          <Text style={styles.value}>{pedido.cli || pedido.fornecedor_nome || 'Consumidor Final'}</Text>
        </View>
      </View>

      {/* Items Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.col1}>Produto / Descrição</Text>
          <Text style={styles.col2}>Qtd</Text>
          <Text style={styles.col3}>V. Unit</Text>
          <Text style={styles.col4}>Total</Text>
        </View>
        {(pedido.itens || []).map((item: any, i: number) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.col1}>{item.nome}</Text>
            <Text style={styles.col2}>{item.qty}</Text>
            <Text style={styles.col3}>{(item.preco || item.custo_unitario).toFixed(2)}</Text>
            <Text style={styles.col4}>{(item.qty * (item.preco || item.custo_unitario)).toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Totals */}
      <View style={styles.totalSection}>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Valor Total Final</Text>
          <Text style={styles.totalValue}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pedido.total)}
          </Text>
          <Text style={[styles.label, { marginTop: 8 }]}>PAGAMENTO: {pedido.pgto || pedido.forma_pagamento || 'N/A'}</Text>
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Documento gerado eletronicamente via Nexus Industrial Governance v4.0
        {"\n"}Rastreabilidade: {pedido.id}
      </Text>
    </Page>
  </Document>
);
