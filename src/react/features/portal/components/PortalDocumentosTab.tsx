import { motion } from 'framer-motion';
import { FileText, Download, ShieldCheck, Image as ImageIcon, ExternalLink, HardDrive } from 'lucide-react';
import { format } from 'date-fns';

type ContratoArquivo = {
  id: string;
  nome_arquivo: string;
  url_arquivo: string;
  tipo_documento: 'contrato' | 'nf_fornecedor' | 'garantia' | 'termo_aceite' | 'foto_diario' | 'outro';
  criado_em?: string;
};

type Props = {
  arquivos?: ContratoArquivo[];
};

const DOC_LABEL: Record<string, string> = {
  contrato: 'Contrato Principal',
  nf_fornecedor: 'Nota Fiscal / Comprovante',
  garantia: 'Termo de Garantia',
  termo_aceite: 'Termo de Aceite / Entrega',
  foto_diario: 'Registro Fotográfico',
  outro: 'Documento Técnico'
};

function getDocIcon(tipo: string) {
  switch (tipo) {
    case 'contrato':
    case 'garantia':
    case 'termo_aceite':
      return <ShieldCheck size={20} className="text-teal-400" />;
    case 'foto_diario':
      return <ImageIcon size={20} className="text-indigo-400" />;
    default:
      return <FileText size={20} className="text-slate-400" />;
  }
}

export function PortalDocumentosTab({ arquivos = [] }: Props) {
  if (arquivos.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="text-center py-16 border border-dashed border-white/10 rounded-3xl p-8"
      >
        <HardDrive size={36} className="mx-auto text-slate-600 mb-3" />
        <h3 className="text-base font-bold text-white mb-1">Nenhum documento anexado ainda</h3>
        <p className="text-slate-400 text-xs max-w-md mx-auto">
          Plantas baixas, contratos e arquivos técnicos serão disponibilizados aqui pela equipe de engenharia.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <div className="bg-slate-900/30 border border-white/5 rounded-3xl p-6 mb-2">
        <h3 className="text-sm font-bold text-white mb-1">Central de Arquivos da Obra</h3>
        <p className="text-xs text-slate-400">
          Acesse plantas técnicas, documentos assinados e notas de insumos disponibilizados para o seu projeto.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {arquivos.map((doc) => (
          <div
            key={doc.id}
            className="bg-slate-900/50 border border-white/5 hover:border-white/15 rounded-2xl p-4 flex items-center justify-between group transition-colors"
          >
            <div className="flex items-center gap-3.5 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                {getDocIcon(doc.tipo_documento)}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate group-hover:text-teal-400 transition-colors">
                  {doc.nome_arquivo}
                </h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400/90 bg-teal-500/10 px-2 py-0.5 rounded">
                    {DOC_LABEL[doc.tipo_documento] || 'Documento'}
                  </span>
                  {doc.criado_em && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      {format(new Date(doc.criado_em), 'dd/MM/yy')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <a
              href={doc.url_arquivo}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-teal-500 hover:text-black text-slate-300 flex items-center justify-center transition-all shrink-0 ml-3"
              title="Baixar / Abrir Arquivo"
            >
              <ExternalLink size={16} />
            </a>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
