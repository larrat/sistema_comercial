import { useState } from 'react';
import { CrmKanban } from './CrmKanban';
import { OportunidadeModal } from './OportunidadeModal';
import { LucidePlus, LucideBuilding2 } from 'lucide-react';
import { motion } from 'framer-motion';

export function CrmPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col bg-slate-950 p-6">
      {/* Header */}
      <header className="mb-6 flex shrink-0 items-center justify-between rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/20">
            <LucideBuilding2 className="h-6 w-6 text-teal-400" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white">
              CRM de Reformas
            </h1>
            <p className="text-sm text-slate-400">
              Gerencie seus projetos, vistorias e orçamentos.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="rf-btn-premium rf-btn-premium--primary"
        >
          <LucidePlus className="h-4 w-4" />
          Nova Oportunidade
        </button>
      </header>

      {/* Kanban Workspace */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <CrmKanban />
      </main>

      {/* Creation Modal */}
      {isModalOpen && (
        <OportunidadeModal onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}
