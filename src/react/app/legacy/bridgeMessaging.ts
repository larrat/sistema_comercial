type LegacyMessage = {
  source?: string;
  type?: string;
  [key: string]: unknown;
};

function getOrigin(): string {
  return typeof window !== 'undefined' ? window.location.origin : '*';
}

export function subscribeLegacyBridgeMessages(
  source: string,
  handler: (data: LegacyMessage, event: MessageEvent) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const listener = (event: MessageEvent) => {
    if (event.origin !== getOrigin()) return;
    const data = event.data as LegacyMessage | null;
    if (!data || data.source !== source) return;
    handler(data, event);
  };

  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}

export function postLegacyBridgeMessage(message: LegacyMessage): void {
  if (typeof window === 'undefined') return;
  window.postMessage(message, getOrigin());
}
