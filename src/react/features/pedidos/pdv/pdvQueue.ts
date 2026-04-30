import type { PdvQueuedSale } from './pdvCart';

const STORAGE_KEY = 'sc_pdv_pending_sales_v1';

type QueueMap = Record<string, PdvQueuedSale[]>;

function readQueueMap(): QueueMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as QueueMap) : {};
  } catch {
    return {};
  }
}

function writeQueueMap(queueMap: QueueMap) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queueMap));
}

export function listPdvQueue(filialId: string): PdvQueuedSale[] {
  return readQueueMap()[filialId] ?? [];
}

export function countPdvQueue(filialId: string): number {
  return listPdvQueue(filialId).length;
}

export function enqueuePdvSale(filialId: string, sale: PdvQueuedSale): void {
  const queueMap = readQueueMap();
  const current = queueMap[filialId] ?? [];
  queueMap[filialId] = [...current, sale];
  writeQueueMap(queueMap);
}

export function removePdvSaleFromQueue(filialId: string, queueId: string): void {
  const queueMap = readQueueMap();
  const current = queueMap[filialId] ?? [];
  queueMap[filialId] = current.filter((item) => item.queueId !== queueId);
  writeQueueMap(queueMap);
}

export function clearPdvQueue(filialId: string): void {
  const queueMap = readQueueMap();
  delete queueMap[filialId];
  writeQueueMap(queueMap);
}
