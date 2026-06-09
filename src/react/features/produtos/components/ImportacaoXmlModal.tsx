import React, { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../../../shared/ui';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useProdutosQuery } from '../hooks/useProdutosQuery';
import { getSupabaseConfig } from '../../../app/supabaseConfig';
import { useApiContext } from '../../../shared/hooks/useApiContext';

type ImportacaoXmlModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ImportacaoXmlModal({ isOpen, onClose }: ImportacaoXmlModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{ totais: number; atualizados: number; erros: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { resolve } = useApiContext();
  const context = resolve();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setResults(null);
    }
  };

  const processarXml = async () => {
    if (!file || !context) return;
    
    setIsProcessing(true);
    setResults(null);

    try {
      const text = await file.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');
      
      const dets = xml.getElementsByTagName('det');
      if (!dets || dets.length === 0) {
        throw new Error('Nenhum item <det> encontrado no XML da NF-e.');
      }

      const updates: Array<{ cEAN: string; ncm: string; cest: string; vUnCom: string; xProd: string }> = [];

      for (let i = 0; i < dets.length; i++) {
        const det = dets[i];
        const prod = det.getElementsByTagName('prod')[0];
        if (prod) {
          const cEAN = prod.getElementsByTagName('cEAN')[0]?.textContent || '';
          const ncm = prod.getElementsByTagName('NCM')[0]?.textContent || '';
          const cest = prod.getElementsByTagName('CEST')[0]?.textContent || '';
          const vUnCom = prod.getElementsByTagName('vUnCom')[0]?.textContent || '';
          const xProd = prod.getElementsByTagName('xProd')[0]?.textContent || '';
          
          if (cEAN && cEAN !== 'SEM GTIN') {
            updates.push({ cEAN, ncm, cest, vUnCom, xProd });
          }
        }
      }

      if (updates.length === 0) {
         throw new Error('Nenhum item com código de barras válido encontrado.');
      }

      // Bulk update via Supabase REST (RPC ou match por código de barras)
      const { url, key } = getSupabaseConfig();
      
      let atualizados = 0;
      const erros: string[] = [];

      for (const item of updates) {
        try {
          const res = await fetch(`${url}/rest/v1/produtos?codigo_barras=eq.${encodeURIComponent(item.cEAN)}&filial_id=eq.${context.filialId}`, {
            method: 'PATCH',
            headers: {
              apikey: key,
              Authorization: `Bearer ${context.token}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal'
            },
            body: JSON.stringify({
              ncm: item.ncm || null,
              cest: item.cest || null,
              custo: parseFloat(item.vUnCom) || 0
            })
          });

          if (res.ok) {
            atualizados++;
          } else {
            erros.push(`Falha ao atualizar produto ${item.cEAN}`);
          }
        } catch (err) {
          erros.push(`Erro de rede no produto ${item.cEAN}`);
        }
      }

      setResults({ totais: updates.length, atualizados, erros });
      toast.success('XML processado com sucesso!');

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao processar arquivo XML.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0f172a]/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-[#0f172a] border border-white/10 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <FileText size={16} />
                </div>
                <h2 className="text-sm font-semibold text-white">Importar XML (NF-e)</h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6">
              {!results ? (
                <>
                  <div className="mb-4 text-sm text-slate-400">
                    Selecione um arquivo XML de Nota Fiscal (NF-e) para atualizar automaticamente o NCM, CEST e custo dos produtos cadastrados (busca pelo código de barras).
                  </div>
                  
                  <div 
                    className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input 
                      type="file" 
                      accept=".xml" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleFileChange}
                    />
                    
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all text-slate-400 group-hover:text-emerald-400 mb-3">
                      <Upload size={20} />
                    </div>
                    
                    {file ? (
                      <div className="text-center">
                        <p className="text-sm font-medium text-white mb-1">{file.name}</p>
                        <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-sm font-medium text-white mb-1">Clique para selecionar</p>
                        <p className="text-xs text-slate-500">Somente arquivos .xml</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4">
                    <CheckCircle size={32} />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Importação Concluída</h3>
                  <div className="w-full bg-white/5 rounded-lg p-4 mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Itens no XML:</span>
                      <span className="font-medium text-white">{results.totais}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Produtos Atualizados:</span>
                      <span className="font-medium text-emerald-400">{results.atualizados}</span>
                    </div>
                    {results.erros.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Não localizados/Erros:</span>
                        <span className="font-medium text-rose-400">{results.erros.length}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/5 bg-white/[0.02] px-6 py-4">
              <Button variant="secondary" onClick={onClose} disabled={isProcessing}>
                {results ? 'Fechar' : 'Cancelar'}
              </Button>
              {!results && (
                <Button 
                  variant="primary" 
                  disabled={!file || isProcessing}
                  onClick={processarXml}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={16} className="animate-spin mr-2" />
                      Processando...
                    </>
                  ) : (
                    'Importar XML'
                  )}
                </Button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
