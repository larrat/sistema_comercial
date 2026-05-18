import React, { useState } from 'react';
import { 
  PageHeader, 
  DataTable, 
  Button, 
  Badge, 
  EmptyState,
  Shimmer,
  StatCard
} from '../../../shared/ui';
import { Upload, CheckCircle, XCircle, RefreshCw, FileText, Banknote, AlertCircle } from 'lucide-react';
import { ofxService, type OfxTransaction } from '../services/ofxService';
import { useToastStore } from '../../../app/lib/useToastStore';

type ExtendedOfxTransaction = OfxTransaction & {
  status: 'match' | 'no_match' | 'duplicate';
  vinculo_id?: string;
};

export function ConciliacaoBancaria() {
  const [isUploading, setIsUploading] = useState(false);
  const [transacoes, setTransacoes] = useState<ExtendedOfxTransaction[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = await ofxService.parse(content);
        
        // Match simulation
        const withStatus = parsed.map(t => ({
          ...t,
          status: t.valor > 0 ? 'match' : 'no_match',
          vinculo_id: t.valor > 0 ? `PED-${Math.floor(Math.random() * 500)}` : undefined
        }));

        setTransacoes(withStatus);
        useToastStore.getState().addToast(`${parsed.length} transações processadas com sucesso.`, 'success');
      } catch (err) {
        useToastStore.getState().addToast('Erro ao processar arquivo OFX.', 'error');
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        kicker="Financeiro"
        title="Conciliação Bancária"
        description="Importe arquivos OFX/CNAB para conciliar seu extrato com o fluxo de caixa do sistema."
        actions={
          <div className="flex gap-3">
            <Button variant="secondary" leftIcon={<RefreshCw className="w-4 h-4" />}>
              Sincronizar Banco
            </Button>
            <div className="relative">
              <Button variant="primary" leftIcon={<Upload className="w-4 h-4" />} loading={isUploading}>
                Importar OFX
              </Button>
              <input 
                type="file" 
                accept=".ofx" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={handleFileUpload}
              />
            </div>
          </div>
        }
      />

      {transacoes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="Total Importado" value={transacoes.length} icon={<FileText className="w-5 h-5" />} />
          <StatCard label="Conciliados (Match)" value={transacoes.filter(t => t.status === 'match').length} tone="positive" icon={<CheckCircle className="w-5 h-5" />} />
          <StatCard label="Pendentes" value={transacoes.filter(t => t.status === 'no_match').length} tone="warning" icon={<RefreshCw className="w-5 h-5" />} />
        </div>
      )}

      <div className="rf-card-premium p-6 transition-all duration-300 hover:border-white/10 hover:shadow-cyan-500/5">
        {transacoes.length === 0 ? (
          <EmptyState
            title="Nenhum arquivo importado"
            description="Suba seu extrato bancário (OFX ou CNAB) para começar a conciliação automática."
            action={
              <div className="relative">
                <Button variant="primary">Selecionar Arquivo</Button>
                <input 
                  type="file" 
                  accept=".ofx" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={handleFileUpload}
                />
              </div>
            }
          />
        ) : (
          <DataTable
            data={transacoes}
            columns={[
              {
                header: 'Data',
                cell: (row) => new Date(row.data).toLocaleDateString()
              },
              {
                header: 'Descrição no Extrato',
                cell: (row) => (
                  <div className="flex flex-col">
                    <span className="font-bold text-white uppercase text-xs">{row.descricao}</span>
                    <span className="text-[10px] text-slate-500">ID: {row.id}</span>
                  </div>
                )
              },
              {
                header: 'Valor',
                cell: (row) => (
                  <span className={row.valor > 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.valor)}
                  </span>
                )
              },
              {
                header: 'Status / Vínculo',
                cell: (row) => (
                  <div className="flex items-center gap-2">
                    {row.status === 'match' ? (
                      <Badge variant="green" className="gap-1">
                        <CheckCircle size={10} />
                        MATCH: {row.vinculo_id}
                      </Badge>
                    ) : (
                      <Badge variant="yellow" className="gap-1">
                        <RefreshCw size={10} />
                        PENDENTE
                      </Badge>
                    )}
                  </div>
                )
              },
              {
                header: 'Ações',
                cell: (row) => (
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary">Vincular</Button>
                    {row.status === 'match' && <Button size="sm" variant="primary">Confirmar</Button>}
                  </div>
                )
              }
            ]}
          />
        )}
      </div>

      {isUploading && (
        <div className="space-y-4">
          <Shimmer height={100} rounded="xl" />
          <Shimmer height={300} rounded="xl" />
        </div>
      )}
    </div>
  );
}
