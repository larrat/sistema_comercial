import { Modal } from './Modal';
import { Button } from './Button';
import type { Blocker } from 'react-router-dom';

export function UnsavedChangesModal({ blocker }: { blocker: Blocker }) {
  if (blocker.state !== 'blocked') return null;
  
  return (
    <Modal
      title="Descartar alterações?"
      open={true}
      onClose={() => blocker.reset?.()}
      size="sm"
    >
      <div className="p-6">
        <p className="text-sm text-slate-300 mb-6 font-medium leading-relaxed">
          Você tem alterações que não foram salvas neste formulário. Se você sair agora, perderá todo o seu progresso.
        </p>
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
          <Button variant="secondary" onClick={() => blocker.reset?.()}>
            Continuar Editando
          </Button>
          <Button 
            variant="primary" 
            className="bg-rose-500 hover:bg-rose-600 border-rose-500/20 text-white shadow-[0_0_15px_rgba(244,63,94,0.2)]" 
            onClick={() => blocker.proceed?.()}
          >
            Sair e Descartar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
