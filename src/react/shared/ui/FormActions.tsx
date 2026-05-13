import type { ReactNode } from 'react';
import { Button } from './Button';

export type FormActionsProps = {
  /** Callback de cancelamento. Se omitido, o botão Cancelar não é renderizado. */
  onCancel?: () => void;
  cancelLabel?: string;
  submitLabel?: string;
  /** true enquanto o form está enviando — desabilita botões e troca o label do submit. */
  loading?: boolean;
  disabled?: boolean;
  /** Alinhamento dos botões. Default: 'end' (direita). */
  align?: 'end' | 'start';
  /** Slot para layouts customizados. Quando fornecido, substitui os botões automáticos. */
  children?: ReactNode;
};

export function FormActions({
  onCancel,
  cancelLabel = 'Cancelar',
  submitLabel = 'Salvar',
  loading = false,
  disabled = false,
  align = 'end',
  children
}: FormActionsProps) {
  const className = [
    'rf-ui-form-actions',
    align === 'start' ? 'rf-ui-form-actions--start' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      {children ?? (
        <>
          {onCancel ? (
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={loading || disabled}
            >
              {cancelLabel}
            </Button>
          ) : null}
          <Button 
            type="submit" 
            variant="primary" 
            loading={loading}
            disabled={disabled}
          >
            {submitLabel}
          </Button>
        </>
      )}
    </div>
  );
}
