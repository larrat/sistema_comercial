import { PDFDownloadLink } from '@react-pdf/renderer';
import { SalesReceipt } from '../../../shared/services/DocumentService';
import { Button } from '../../../shared/ui';
import { Filter } from 'lucide-react';

type Props = {
  transacoes: any[];
  saldo: number;
};

export default function CaixaPdfButton({ transacoes, saldo }: Props) {
  return (
    <PDFDownloadLink 
      document={<SalesReceipt pedido={{ total: saldo, itens: transacoes.map(t => ({ nome: t.descricao, qty: 1, preco: t.valor })), num: 'CX-RESUMO', data: new Date().toISOString() }} filialNome="Nexus Industrial" />} 
      fileName={`caixa_${new Date().toISOString().split('T')[0]}.pdf`}
    >
      {({ loading }) => (
        <Button variant="secondary" leftIcon={<Filter size={16} />} loading={loading}>
          Exportar PDF
        </Button>
      )}
    </PDFDownloadLink>
  );
}
