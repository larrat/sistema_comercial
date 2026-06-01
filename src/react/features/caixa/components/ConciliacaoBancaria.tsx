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
import { Upload, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { ofxService, type MatchedTransaction } from '../services/ofxService';
import { listTitulosPendentes } from '../services/ofxIntegrationApi';
import { useToastStore } from '../../../app/lib/useToastStore';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import { useFilialStore } from '../../../app/useFilialStore';

export function ConciliacaoBancaria() {
  const [isUploading, setIsUploading] = useState(false);
  const [transacoes, setTransacoes] = useState<MatchedTransaction[]>([]);
  const { token } = useApiContext();
  const { filialId } = useFilialStore();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !token || !filialId) return;

    setIsUploading(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsedOfx = await ofxService.parse(content);
        
        useToastStore.getState().addToast('Arquivo OFX lido. Buscando títulos abertos...', 'info');
        
        // 1. Fetch open titles
        const titulos = await listTitulosPendentes(token, filialId);
        
        // 2. Correlate with heuristic engine
        const correlated = ofxService.correlateTransactions(parsedOfx, titulos);

        setTransacoes(correlated);
        useToastStore.getState().addToast(`${parsedOfx.length} transações correlacionadas com sucesso!`, 'success');
      } catch (err) {
        console.error(err);
        useToastStore.getState().addToast('Erro ao processar arquivo OFX e correlacionar.', 'error');
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsText(file);
  };

  const getStatusBadge = (score: number, match?: any) => {
    if (score >= 80) {
      return (
        <Badge variant="green" className="gap-1 px-2.5 py-1">
          <CheckCircle size={12} />
          MATCH: {match?.nome} ({score} pts)
        </Badge>
      );
    }
    if (score >= 50) {
      return (
        <Badge variant="yellow" className="gap-1 px-2.5 py-1">
          <RefreshCw size={12} />
          SUGERIDO: {match?.nome} ({score} pts)
        </Badge>
      );
    }
    return (
      <Badge variant="slate" className="gap-1 px-2.5 py-1">
        <AlertCircle size={12} />
        NÃO IDENTIFICADO
      </Badge>
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        kicker="Financeiro"
        title="Conciliação Bancária"
        description="Importe arquivos OFX/CNAB. O nosso Algoritmo Heurístico encontrará os Contas a Pagar/Receber correspondentes."
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
          <StatCard label="Total Importado" value={transacoes.length} />
          <StatCard label="Match Perfeito (>= 80pts)" value={transacoes.filter(t => t.score >= 80).length} tone="success" />
          <StatCard label="Sugestões / Pendentes" value={transacoes.filter(t => t.score < 80).length} tone="warning" />
        </div>
      )}

      <div className="rf-card-premium p-6 transition-all duration-300 hover:border-white/10 hover:shadow-teal-500/5">
        {transacoes.length === 0 ? (
          <EmptyState
            title="Nenhum arquivo importado"
            description="Suba seu extrato bancário (OFX ou CNAB) para a engine sugerir as liquidações."
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
                key: 'data',
                header: 'Data OFX',
                render: (row) => new Date(row.ofx.data).toLocaleDateString()
              },
              {
                key: 'descricao',
                header: 'Extrato Banco',
                render: (row) => (
                  <div className="flex flex-col">
                    <span className="font-bold text-white uppercase text-xs">{row.ofx.descricao}</span>
                    <span className="text-[10px] text-slate-500">FITID: {row.ofx.id}</span>
                  </div>
                )
              },
              {
                key: 'valor',
                header: 'Valor Extrato',
                render: (row) => (
                  <span className={row.ofx.valor > 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.ofx.valor)}
                  </span>
                )
              },
              {
                key: 'match',
                header: 'Sistema Heurístico',
                render: (row) => getStatusBadge(row.score, row.match)
              },
              {
                key: 'actions',
                header: 'Ações',
                render: (row) => (
                  <div className="flex gap-2">
                    {row.score >= 80 ? (
                      <Button size="sm" variant="primary">Confirmar Baixa</Button>
                    ) : row.score >= 50 ? (
                      <>
                        <Button size="sm" variant="primary">Confirmar</Button>
                        <Button size="sm" variant="secondary">Buscar Outro</Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="secondary">Lançar Direto</Button>
                        <Button size="sm" variant="secondary">Buscar Título</Button>
                      </>
                    )}
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
