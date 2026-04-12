/**
 * Hidratação compartilhada dos stores React nos pontos de entrada dos bridges.
 *
 * Problema resolvido: clientes-bridge.tsx e dashboard-bridge.tsx tinham cópias
 * idênticas desta lógica. O próximo bridge adicionado também copiaria — e
 * eventualmente alguém esqueceria de hidratar a filial, causando um bug sutil.
 *
 * Uso: chamar hydrateBridgeStores() UMA vez, na raiz de cada bridge entry,
 * antes de qualquer componente React ser renderizado.
 *
 * @example
 * // No topo de clientes-bridge.tsx / dashboard-bridge.tsx / qualquer-bridge.tsx:
 * import { hydrateBridgeStores } from './app/bridgeHydration';
 * hydrateBridgeStores();
 */

import { useAuthStore } from './useAuthStore';
import { useFilialStore } from './useFilialStore';

/**
 * Lê as credenciais e filial ativa dos globais injetados pelo shell legado
 * e popula os stores Zustand correspondentes.
 *
 * O shell legado injeta esses valores em window antes de carregar os bundles
 * React. Se não estiverem presentes, os stores ficam no estado inicial
 * (sem sessão / sem filial) — o que é correto: o componente React saberá
 * que precisa aguardar autenticação.
 */
export function hydrateBridgeStores(): void {
  if (window.__SC_AUTH_SESSION__) {
    useAuthStore.setState({
      session: window.__SC_AUTH_SESSION__,
      status: 'authenticated'
    });
  }

  if (window.__SC_FILIAL_ID__) {
    useFilialStore.setState({ filialId: window.__SC_FILIAL_ID__ });
  }
}
