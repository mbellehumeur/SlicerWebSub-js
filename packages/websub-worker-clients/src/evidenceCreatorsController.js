/**
 * Headless evidence-creators controller — shared select / probe / eligibility.
 * OHIF (React) and IRA (DOM) bind views to this state.
 */
import {
  HUB_INFERENCE_SERVERS,
  isLocalCapableInferenceServer,
  orderInferenceServerProbeRows,
} from '@slicer-hub/client';
import { modalityEligibilityForServer, normalizeStudyModality } from './modality.js';

/**
 * @typedef {import('@slicer-hub/client').HubInferenceServerDef} HubInferenceServerDef
 * @typedef {import('@slicer-hub/client').CastProductStatusProbe} CastProductStatusProbe
 */

/**
 * @typedef {{
 *   server: HubInferenceServerDef,
 *   probe: CastProductStatusProbe | null,
 *   probing: boolean,
 * }} EvidenceCreatorRow
 */

/**
 * @typedef {{
 *   selectedId: string | null,
 *   rows: EvidenceCreatorRow[],
 *   probing: boolean,
 *   studyModality: string,
 *   wsConnected: boolean,
 *   hasOpenStudy: boolean,
 * }} EvidenceCreatorsState
 */

/**
 * @returns {EvidenceCreatorsState}
 */
export function createEvidenceCreatorsState() {
  return {
    selectedId: HUB_INFERENCE_SERVERS[0]?.id ?? null,
    rows: HUB_INFERENCE_SERVERS.map((server) => ({
      server,
      probe: null,
      probing: false,
    })),
    probing: false,
    studyModality: '',
    wsConnected: false,
    hasOpenStudy: false,
  };
}

/**
 * @param {EvidenceCreatorsState} state
 * @returns {EvidenceCreatorRow[]}
 */
export function orderedEvidenceCreatorRows(state) {
  return orderInferenceServerProbeRows(state.rows);
}

/**
 * @param {EvidenceCreatorsState} state
 * @returns {EvidenceCreatorRow | null}
 */
export function selectedEvidenceCreatorRow(state) {
  const ordered = orderedEvidenceCreatorRows(state);
  return ordered.find((row) => row.server.id === state.selectedId) ?? null;
}

/**
 * @param {EvidenceCreatorsState} state
 * @param {string} serverId
 * @returns {EvidenceCreatorsState}
 */
export function selectEvidenceCreator(state, serverId) {
  return { ...state, selectedId: String(serverId || '') || null };
}

/**
 * @param {EvidenceCreatorsState} state
 * @param {unknown} modality
 * @returns {EvidenceCreatorsState}
 */
export function setEvidenceCreatorsStudyModality(state, modality) {
  return { ...state, studyModality: normalizeStudyModality(modality) };
}

/**
 * @param {EvidenceCreatorsState} state
 * @param {boolean} wsConnected
 * @param {boolean} hasOpenStudy
 * @returns {EvidenceCreatorsState}
 */
export function setEvidenceCreatorsSession(
  state,
  wsConnected,
  hasOpenStudy
) {
  return {
    ...state,
    wsConnected: Boolean(wsConnected),
    hasOpenStudy: Boolean(hasOpenStudy),
  };
}

/**
 * Modality gate for a catalog server (FleXray CR/DX, Dental CT/CBCT, …).
 * @param {string} serverId
 * @param {string} studyModality
 * @returns {{ ok: boolean, reason: string }}
 */
export function evidenceCreatorModalityGate(serverId, studyModality) {
  return modalityEligibilityForServer(serverId, studyModality);
}

/**
 * Auto-select among available (online / local-capable) servers.
 * Prefer a modality-eligible pick; never default to an ineligible server
 * (e.g. FleXray on CT) just because it is always Available.
 *
 * @param {readonly string[]} availableIds ordered available server ids
 * @param {string} [studyModality]
 * @param {string | null} [selectedId]
 * @returns {string | null}
 */
export function preferredEvidenceCreatorId(
  availableIds,
  studyModality = '',
  selectedId = null
) {
  const ids = (Array.isArray(availableIds) ? availableIds : [])
    .map((id) => String(id || '').trim())
    .filter(Boolean);
  if (!ids.length) return null;

  const modality = studyModality || '';
  const eligible = (id) => evidenceCreatorModalityGate(id, modality).ok;

  if (selectedId && ids.includes(selectedId) && eligible(selectedId)) {
    return selectedId;
  }
  const hit = ids.find(eligible);
  return hit ?? null;
}

/**
 * Whether the selected server can run given connection / probe / modality.
 * @param {EvidenceCreatorsState} state
 * @param {{ filesReady?: boolean, extraReason?: string }} [opts]
 * @returns {{ canRun: boolean, reason: string, modalityOk: boolean }}
 */
export function evidenceCreatorRunEligibility(state, opts = {}) {
  const row = selectedEvidenceCreatorRow(state);
  if (!row) {
    return { canRun: false, reason: 'Select an Evidence Creator.', modalityOk: true };
  }
  const modalityGate = evidenceCreatorModalityGate(
    row.server.id,
    state.studyModality
  );
  if (!modalityGate.ok) {
    return {
      canRun: false,
      reason: modalityGate.reason,
      modalityOk: false,
    };
  }
  if (!state.wsConnected && !isLocalCapableInferenceServer(row.server)) {
    return {
      canRun: false,
      reason: 'Connect to the hub to run remote Evidence Creators.',
      modalityOk: true,
    };
  }
  const online =
    isLocalCapableInferenceServer(row.server) || Boolean(row.probe?.online);
  if (!online) {
    return {
      canRun: false,
      reason: 'Server is offline — refresh status or start the worker.',
      modalityOk: true,
    };
  }
  if (!state.hasOpenStudy || opts.filesReady === false) {
    return {
      canRun: false,
      reason: 'Open a study first.',
      modalityOk: true,
    };
  }
  if (opts.extraReason) {
    return { canRun: false, reason: opts.extraReason, modalityOk: true };
  }
  return { canRun: true, reason: '', modalityOk: true };
}

/**
 * Apply probe results from hubService.probeInferenceServers / probeCastInferenceServers.
 * @param {EvidenceCreatorsState} state
 * @param {Array<{ server: HubInferenceServerDef, probe: CastProductStatusProbe }>} probed
 * @returns {EvidenceCreatorsState}
 */
export function applyEvidenceCreatorProbes(state, probed) {
  const byId = new Map(probed.map((p) => [p.server.id, p]));
  return {
    ...state,
    probing: false,
    rows: HUB_INFERENCE_SERVERS.map((server) => {
      const hit = byId.get(server.id);
      if (isLocalCapableInferenceServer(server)) {
        return {
          server,
          probe: { online: true, items: hit?.probe?.items || [] },
          probing: false,
        };
      }
      return {
        server,
        probe: hit?.probe ?? { online: false, items: [] },
        probing: false,
      };
    }),
  };
}
