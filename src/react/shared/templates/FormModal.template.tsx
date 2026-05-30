/**
 * TEMPLATE — Formulário Modal Inline
 * ─────────────────────────────────────────────────────────────────────
 * Como usar:
 *   1. Copie este arquivo para: features/[modulo]/components/[Modulo]Form.tsx
 *   2. Substitua todos os [MODULO] / [Item] / [Tipo] pelo nome do seu módulo
 *   3. Adicione os campos do formulário dentro de cada <FormSection>
 *   4. Implemente o handleSave com a lógica real de persistência
 * ─────────────────────────────────────────────────────────────────────
 * REGRAS CRÍTICAS — não altere os valores de top/left sem motivo:
 *   top: '80px'                       → respeita a topbar (h-20)
 *   left: collapsed ? '80px' : '280px' → respeita o sidebar
 * ─────────────────────────────────────────────────────────────────────
 */

import { useState } from 'react';
import { FormSection, FormField, Input, Select, Button, FormError } from '@/react/shared/ui';
import { useUIStore } from '@/react/app/useUIStore';

// Substitua pelo seu tipo real
type [Item] = {
  id?: string;
  nome: string;
  // ...outros campos
};

type [Modulo]FormProps = {
  initialData?: [Item] | null;
  onSaved: (item: [Item]) => void;
  onCancel: () => void;
};

export function [Modulo]Form({ initialData, onSaved, onCancel }: [Modulo]FormProps) {
  const { sidebarCollapsed: collapsed } = useUIStore();

  // Estado do formulário
  const [nome, setNome] = useState(initialData?.nome ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!initialData?.id;

  async function handleSave() {
    setError(null);

    // Validação básica
    if (!nome.trim()) {
      setError('O campo Nome é obrigatório.');
      return;
    }

    setSaving(true);
    try {
      // Substitua pela sua lógica real de save (insert/update no Supabase)
      const saved: [Item] = { ...initialData, nome };
      onSaved(saved);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    // ──────────────────────────────────────────────────────────────────
    // OVERLAY: ocupa o espaço útil (abaixo da topbar, à direita do sidebar)
    // NÃO altere top/left sem entender o impacto no layout do AppShell
    // ──────────────────────────────────────────────────────────────────
    <div
      className="fixed bottom-0 right-0 z-50 flex items-center justify-center p-4
                 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 transition-all"
      style={{
        left: collapsed ? '80px' : '280px',
        top: '80px',
      }}
    >
      {/* ── CONTAINER DO MODAL ── */}
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-hide
                      bg-slate-900 border border-white/10 rounded-3xl
                      p-6 shadow-2xl relative flex flex-col">

        {/* ── CABEÇALHO ── */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-400 mb-0.5">
              [MODULO]
            </p>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">
              {isEditing ? 'Editar [Item]' : 'Novo [Item]'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white transition-colors p-1"
            aria-label="Fechar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── SEÇÕES DO FORMULÁRIO ── */}
        <div className="flex-1 space-y-4">

          <FormSection title="Dados Essenciais" description="Informações principais do [item].">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Nome" required>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome do [item]"
                />
              </FormField>
              {/* Adicione mais campos aqui */}
            </div>
          </FormSection>

          {/* Adicione mais <FormSection> conforme necessário */}

        </div>

        {/* ── ERRO GLOBAL ── */}
        {error && <FormError message={error} className="mt-4" />}

        {/* ── AÇÕES ── */}
        <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-white/10 flex-shrink-0">
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {isEditing ? 'Salvar alterações' : 'Criar [Item]'}
          </Button>
        </div>
      </div>
    </div>
  );
}
