// @ts-check

import { measureRender } from '../shared/render-metrics.js';
import { buildSkeletonLines } from './runtime-loading.js';
import { getClientes } from './clientes/repository.js';
import { getContatoInfo, parseTimes, PRAZO_LABELS, ST_B, TAB_LABELS } from './clientes/domain.js';
import {
  filterClientesFromLegacy,
  getClienteSegmentosFromLegacy
} from '../shared/clientes-pilot-bridge.js';
import {
  avc,
  cliDom,
  esc,
  getBadgeAniversario,
  ini,
  isClientesRuntimeBootstrapping
} from './clientes-legacy-shared.js';
import { createClientesLegacyList } from './clientes-legacy-list.js';

const clientesLegacyList = createClientesLegacyList({
  cliDom,
  esc,
  avc,
  ini,
  getBadgeAniversario,
  getClientes,
  getContatoInfo,
  parseTimes,
  TAB_LABELS,
  PRAZO_LABELS,
  ST_B,
  filterClientesFromLegacy,
  getClienteSegmentosFromLegacy,
  measureRender,
  buildSkeletonLines,
  isRuntimeBootstrapping: isClientesRuntimeBootstrapping
});

export function renderCliMet() {
  return clientesLegacyList.renderCliMet();
}

export function renderClientes() {
  return clientesLegacyList.renderClientes();
}

export function renderCliSegs() {
  return clientesLegacyList.renderCliSegs();
}

export function refreshCliDL() {
  return clientesLegacyList.refreshCliDL();
}
