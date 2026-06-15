import { useDashboardStore } from '../../dashboard/store/useDashboardStore';
import { Card, Typography, Input, Button } from '../../../shared/ui';
import { useState } from 'react';

export function AlertsConfig() {
  const { alertThresholds, setAlertThresholds } = useDashboardStore();
  const [metaRisco, setMetaRisco] = useState(alertThresholds.metaRiscoPercent.toString());
  const [contasVencidas, setContasVencidas] = useState(alertThresholds.contasVencidasValor.toString());
  
  const handleSave = () => {
    setAlertThresholds({
      metaRiscoPercent: Number(metaRisco) || 50,
      contasVencidasValor: Number(contasVencidas) || 0
    });
    alert('Regras atualizadas com sucesso!');
  };

  return (
    <Card variant="glass" className="max-w-md">
      <div className="mb-4">
        <Typography variant="h3" weight="bold" className="text-white">Regras de Alertas</Typography>
        <Typography variant="caption" color="muted">Configure os limites para os alertas preditivos e de risco.</Typography>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <label className="text-sm text-slate-400 block mb-1">Avisar se Faturamento Mensal for menor que % da Meta</label>
          <Input 
            type="number"
            value={metaRisco}
            onChange={(e) => setMetaRisco(e.target.value)}
            min={0}
            max={100}
            className="max-w-[150px]"
          />
        </div>

        <div>
          <label className="text-sm text-slate-400 block mb-1">Avisar se Contas Vencidas ultrapassarem (R$)</label>
          <Input 
            type="number"
            value={contasVencidas}
            onChange={(e) => setContasVencidas(e.target.value)}
            min={0}
            className="max-w-[150px]"
          />
        </div>

        <Button onClick={handleSave} className="w-full mt-2">Salvar Regras</Button>
      </div>
    </Card>
  );
}
