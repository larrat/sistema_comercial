import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader, DataTable, Button, Badge, Modal, Input, Select } from '../../../shared/ui';
import { Plus, Tag, AlertCircle, Calendar } from 'lucide-react';
import { useApiContext } from '../../../shared/hooks/useApiContext';
import { useFilialStore } from '../../../app/useFilialStore';
import { useToastStore } from '../../../app/lib/useToastStore';
import { listRegrasFiscais, saveRegraFiscal, deleteRegraFiscal, type FiscalRegra } from '../services/fiscalApi';

export function FiscalSetupRoutePage() {
  const { token } = useApiContext();
  const { filialId } = useFilialStore();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<FiscalRegra>>({});

  const { data: regras = [], isLoading } = useQuery({
    queryKey: ['regras-fiscais', filialId],
    queryFn: () => listRegrasFiscais(token!, filialId!),
    enabled: !!filialId && !!token,
  });

  const saveMutation = useMutation({
    mutationFn: (r: Partial<FiscalRegra>) => saveRegraFiscal(token!, { ...r, filial_id: filialId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regras-fiscais'] });
      useToastStore.getState().addToast('Regra fiscal salva com sucesso.', 'success');
      setIsModalOpen(false);
    },
    onError: () => {
      useToastStore.getState().addToast('Erro ao salvar regra fiscal.', 'error');
    }
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule.ncm || !editingRule.data_inicio_vigencia) {
      useToastStore.getState().addToast('Preencha os campos obrigatórios (NCM, Início Vigência).', 'error');
      return;
    }
    saveMutation.mutate(editingRule);
  };

  const openNew = () => {
    setEditingRule({
      ncm: '', uf_origem: 'SP', uf_destino: 'SP', 
      cst_icms: '00', aliquota_icms: 18, aliquota_fcp: 0,
      cst_pis_cofins: '01', aliquota_pis: 1.65, aliquota_cofins: 7.6,
      iva_cbs_percent: 0, iva_ibs_percent: 0,
      data_inicio_vigencia: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        kicker="Configurações"
        title="Governança Tributária"
        description="Gerencie as regras de impostos baseadas em NCM e CFOP. Preparado para a Reforma Tributária (IVA Dual)."
        actions={
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={openNew}>
            Nova Regra Fiscal
          </Button>
        }
      />

      <div className="bg-surface-card border border-border-subtle rounded-2xl overflow-hidden shadow-lg">
        {isLoading ? (
          <div className="p-8 text-center text-text-muted">Carregando regras...</div>
        ) : (
          <DataTable
            data={regras}
            columns={[
              {
                key: 'ncm',
                header: 'NCM / Origem / Destino',
                render: (r) => (
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-text-primary uppercase text-sm tracking-widest">{r.ncm}</span>
                    <span className="text-xs text-text-muted">{r.uf_origem} → {r.uf_destino}</span>
                  </div>
                )
              },
              {
                key: 'icms',
                header: 'ICMS (CST / Alíquota)',
                render: (r) => (
                  <div className="flex items-center gap-2">
                    <Badge variant="blue" className="px-2 py-0.5">{r.cst_icms}</Badge>
                    <span className="text-xs font-bold">{r.aliquota_icms}%</span>
                  </div>
                )
              },
              {
                key: 'piscofins',
                header: 'PIS/COFINS',
                render: (r) => (
                  <div className="flex items-center gap-2">
                    <Badge variant="green" className="px-2 py-0.5">{r.cst_pis_cofins}</Badge>
                    <span className="text-[10px] text-text-muted">PIS: {r.aliquota_pis}% / COF: {r.aliquota_cofins}%</span>
                  </div>
                )
              },
              {
                key: 'iva',
                header: 'IVA Dual (Reforma)',
                render: (r) => (
                  <div className="flex flex-col gap-0.5 text-[10px]">
                    {r.iva_cbs_percent !== null ? <span className="text-purple-400">CBS: {r.iva_cbs_percent}%</span> : <span className="text-text-tertiary">CBS: Não Cad.</span>}
                    {r.iva_ibs_percent !== null ? <span className="text-indigo-400">IBS: {r.iva_ibs_percent}%</span> : <span className="text-text-tertiary">IBS: Não Cad.</span>}
                  </div>
                )
              },
              {
                key: 'vigencia',
                header: 'Vigência',
                render: (r) => (
                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <Calendar size={12} />
                    {new Date(r.data_inicio_vigencia).toLocaleDateString()}
                    {r.data_fim_vigencia ? ` - ${new Date(r.data_fim_vigencia).toLocaleDateString()}` : ' em diante'}
                  </div>
                )
              }
            ]}
          />
        )}
      </div>

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingRule.id ? "Editar Regra" : "Nova Regra Fiscal"} size="lg">
        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Input label="NCM *" value={editingRule.ncm || ''} onChange={e => setEditingRule({...editingRule, ncm: e.target.value})} placeholder="Ex: 8471.30.12" />
            <Select label="UF Origem" value={editingRule.uf_origem || 'SP'} onChange={e => setEditingRule({...editingRule, uf_origem: e.target.value})} options={[{value: 'SP', label: 'São Paulo'}, {value: 'MG', label: 'Minas Gerais'}, {value: 'RJ', label: 'Rio de Janeiro'}, {value: 'EX', label: 'Exterior'}]} />
            <Select label="UF Destino" value={editingRule.uf_destino || 'SP'} onChange={e => setEditingRule({...editingRule, uf_destino: e.target.value})} options={[{value: 'SP', label: 'São Paulo'}, {value: 'MG', label: 'Minas Gerais'}, {value: 'RJ', label: 'Rio de Janeiro'}, {value: 'EX', label: 'Exterior'}]} />
          </div>

          <div className="p-4 border border-blue-500/20 bg-blue-500/5 rounded-xl space-y-4">
            <h4 className="text-[10px] uppercase font-bold text-blue-400 tracking-widest">ICMS e FCP</h4>
            <div className="grid grid-cols-3 gap-4">
              <Input label="CST ICMS *" value={editingRule.cst_icms || ''} onChange={e => setEditingRule({...editingRule, cst_icms: e.target.value})} />
              <Input type="number" step="0.01" label="Alíquota ICMS (%)" value={editingRule.aliquota_icms || 0} onChange={e => setEditingRule({...editingRule, aliquota_icms: Number(e.target.value)})} />
              <Input type="number" step="0.01" label="Alíquota FCP (%)" value={editingRule.aliquota_fcp || 0} onChange={e => setEditingRule({...editingRule, aliquota_fcp: Number(e.target.value)})} />
            </div>
          </div>

          <div className="p-4 border border-emerald-500/20 bg-emerald-500/5 rounded-xl space-y-4">
            <h4 className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest">PIS / COFINS</h4>
            <div className="grid grid-cols-3 gap-4">
              <Input label="CST PIS/COFINS *" value={editingRule.cst_pis_cofins || ''} onChange={e => setEditingRule({...editingRule, cst_pis_cofins: e.target.value})} />
              <Input type="number" step="0.01" label="Alíquota PIS (%)" value={editingRule.aliquota_pis || 0} onChange={e => setEditingRule({...editingRule, aliquota_pis: Number(e.target.value)})} />
              <Input type="number" step="0.01" label="Alíquota COFINS (%)" value={editingRule.aliquota_cofins || 0} onChange={e => setEditingRule({...editingRule, aliquota_cofins: Number(e.target.value)})} />
            </div>
          </div>

          <div className="p-4 border border-purple-500/20 bg-purple-500/5 rounded-xl space-y-4">
            <h4 className="text-[10px] uppercase font-bold text-purple-400 tracking-widest flex items-center gap-2">
               IVA DUAL (CBS/IBS) <Badge variant="slate" className="text-[8px]">Novo</Badge>
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <Input type="number" step="0.01" label="Alíquota CBS (%)" value={editingRule.iva_cbs_percent || 0} onChange={e => setEditingRule({...editingRule, iva_cbs_percent: Number(e.target.value)})} />
              <Input type="number" step="0.01" label="Alíquota IBS (%)" value={editingRule.iva_ibs_percent || 0} onChange={e => setEditingRule({...editingRule, iva_ibs_percent: Number(e.target.value)})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input type="date" label="Início da Vigência *" value={editingRule.data_inicio_vigencia || ''} onChange={e => setEditingRule({...editingRule, data_inicio_vigencia: e.target.value})} />
            <Input type="date" label="Fim da Vigência" value={editingRule.data_fim_vigencia || ''} onChange={e => setEditingRule({...editingRule, data_fim_vigencia: e.target.value})} />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border-subtle">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" loading={saveMutation.isPending}>Salvar Regra</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
