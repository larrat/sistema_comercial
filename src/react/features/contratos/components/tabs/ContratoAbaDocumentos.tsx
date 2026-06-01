import { Paperclip, Camera, FileText, Download, UploadCloud, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Badge, Card, EmptyState } from '../../../../shared/ui';

type Props = {
  arquivos: any[];
  isUploading: boolean;
  uploadArquivoMutation: any;
};

export function ContratoAbaDocumentos({
  arquivos,
  isUploading,
  uploadArquivoMutation
}: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
      <div className="lg:col-span-2 space-y-6">
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-teal-400" />
              Arquivos da Obra
            </h2>
            <Badge variant="blue">{arquivos.length} arquivos anexados</Badge>
          </div>

          {arquivos.length === 0 ? (
            <EmptyState title="Nenhum arquivo anexado a esta obra." compact />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {arquivos.map((arq) => (
                <div key={arq.id} className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors group">
                  <div className="w-12 h-12 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center flex-shrink-0">
                    {arq.tipo_documento === 'contrato' || arq.nome_arquivo.endsWith('.pdf') ? (
                      <FileText size={20} />
                    ) : (
                      <Camera size={20} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate" title={arq.nome_arquivo}>{arq.nome_arquivo}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
                      Enviado em {format(new Date(arq.criado_em), 'dd/MM/yyyy')}
                    </p>
                  </div>
                  <a 
                    href={arq.url_arquivo} 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors flex-shrink-0"
                  >
                    <Download size={16} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <Card className="p-5 bg-slate-900/40 border-white/10 shadow-lg">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">Adicionar Novo Arquivo</h3>
          
          <div className="relative border-2 border-dashed border-white/10 rounded-2xl p-8 hover:border-teal-500/50 hover:bg-teal-500/5 transition-all text-center flex flex-col items-center justify-center min-h-[200px] overflow-hidden group">
            {isUploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 text-teal-400 animate-spin" />
                <p className="text-xs font-bold text-teal-400 animate-pulse">Enviando arquivo...</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center text-slate-400 mb-4 group-hover:text-teal-400 group-hover:scale-110 transition-all">
                  <UploadCloud size={28} />
                </div>
                <p className="text-xs font-bold text-white mb-1">Clique ou arraste um arquivo</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">PDF, Imagens (Máx 10MB)</p>
                
                <input 
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      uploadArquivoMutation.mutate(file);
                    }
                  }}
                />
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
