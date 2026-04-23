import { useEffect } from 'react';

import { subscribeLegacyEvent } from '../../../app/legacy/events';
import { useEstoqueStore } from '../store/useEstoqueStore';
import { EstoquePage } from '../components/EstoquePage';
import { useEstoqueData } from '../hooks/useEstoqueData';

export function EstoqueRoutePage() {
  useEstoqueData();

  const openMovementModal = useEstoqueStore((s) => s.openMovementModal);

  useEffect(() => {
    return subscribeLegacyEvent('sc:abrir-mov-produto', (detail) => {
      openMovementModal(detail?.id || '');
    });
  }, [openMovementModal]);

  return <EstoquePage />;
}
