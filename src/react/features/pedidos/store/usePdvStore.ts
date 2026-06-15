import { create } from 'zustand';
import type { ClienteLight } from '../../clientes/services/clientesApi';
import type { PdvCartItem, PdvMixedPaymentPart, PdvPaymentMethod } from '../pdv/pdvCart';

type PdvStoreState = {
  items: PdvCartItem[];
  selectedCliente: ClienteLight | null;
  paymentMethod: PdvPaymentMethod | null;
  mixedPayments: PdvMixedPaymentPart[];
  discountValue: number;
  focusedItemKey: string | null;
};

type PdvStoreActions = {
  addItem: (_item: PdvCartItem) => void;
  incrementItem: (_itemKey: string) => void;
  decrementItem: (_itemKey: string) => void;
  setItemQty: (_itemKey: string, _qty: number) => void;
  removeItem: (_itemKey: string) => void;
  clearSale: () => void;
  setSelectedCliente: (_cliente: ClienteLight | null) => void;
  setPaymentMethod: (_method: PdvPaymentMethod | null) => void;
  setMixedPayments: (_parts: PdvMixedPaymentPart[]) => void;
  setDiscountValue: (_value: number) => void;
  setFocusedItemKey: (_itemKey: string | null) => void;
};

function getQtyStep(item: PdvCartItem): number {
  return item.isWeight ? 0.001 : 1;
}

export const usePdvStore = create<PdvStoreState & PdvStoreActions>((set) => ({
  items: [],
  selectedCliente: null,
  paymentMethod: null,
  mixedPayments: [],
  discountValue: 0,
  focusedItemKey: null,

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((current) => current.prodId === item.prodId);
      if (!existing) {
        return {
          items: [...state.items, item],
          focusedItemKey: item.key
        };
      }

      const step = getQtyStep(existing);
      return {
        items: state.items.map((current) =>
          current.key === existing.key ? { ...current, qty: current.qty + step } : current
        ),
        focusedItemKey: existing.key
      };
    }),

  incrementItem: (itemKey) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.key === itemKey ? { ...item, qty: item.qty + getQtyStep(item) } : item
      )
    })),

  decrementItem: (itemKey) =>
    set((state) => ({
      items: state.items
        .map((item) =>
          item.key === itemKey ? { ...item, qty: Math.max(getQtyStep(item), item.qty - getQtyStep(item)) } : item
        )
        .filter((item) => item.qty > 0)
    })),

  setItemQty: (itemKey, qty) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.key === itemKey
          ? {
              ...item,
              qty: Math.max(item.isWeight ? 0.001 : 1, qty)
            }
          : item
      )
    })),

  removeItem: (itemKey) =>
    set((state) => {
      const nextItems = state.items.filter((item) => item.key !== itemKey);
      const nextFocused =
        state.focusedItemKey === itemKey ? (nextItems.at(Math.max(0, nextItems.length - 1))?.key ?? null) : state.focusedItemKey;
      return {
        items: nextItems,
        focusedItemKey: nextFocused
      };
    }),

  clearSale: () =>
    set({
      items: [],
      selectedCliente: null,
      paymentMethod: null,
      mixedPayments: [],
      discountValue: 0,
      focusedItemKey: null
    }),

  setSelectedCliente: (cliente) =>
    set((state) => ({
      selectedCliente: cliente,
      paymentMethod: !cliente && state.paymentMethod === 'fiado' ? null : state.paymentMethod
    })),

  setPaymentMethod: (method) =>
    set((state) => ({
      paymentMethod: method,
      mixedPayments: method === 'misto' ? state.mixedPayments : []
    })),

  setMixedPayments: (parts) => set({ mixedPayments: parts }),
  setDiscountValue: (value) => set({ discountValue: Math.max(0, value) }),
  setFocusedItemKey: (itemKey) => set({ focusedItemKey: itemKey })
}));
