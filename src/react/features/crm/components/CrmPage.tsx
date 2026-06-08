import { useState } from 'react';
import { CrmKanban } from './CrmKanban';
import { OportunidadeModal } from './OportunidadeModal';
import { LucidePlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, PageHeader } from '../../../shared/ui';

export function CrmPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col bg-slate-950 p-6">
      <PageHeader
        title="CRM de Reformas"
        description="Gerencie seus projetos, vistorias e orçamentos."
        actions={
          <Button
            onClick={() => setIsModalOpen(true)}
            variant="primary"
            leftIcon={<LucidePlus className="h-4 w-4" />}
          >
            Nova Oportunidade
          </Button>
        }
      />

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
