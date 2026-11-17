import type { CastMessage } from '@slicer-hub/client';
import { messageSubscriberName } from '@slicer-hub/client';

/** OHIF hanging protocol id: axial + volume3d + coronal + sagittal. */
export const SLICER_FOUR_UP_HANGING_PROTOCOL_ID = 'fourUp';

/** OHIF hanging protocol id: large 3D + three orthogonal MPR slices. */
export const PRIMARY_3D_HANGING_PROTOCOL_ID = 'primary3D';

/** True when Hub publisher subscriber.name is a 3D Slicer Image Display client. */
export function isSlicerIdSubscriberName(subscriberName: unknown): boolean {
  return String(subscriberName || '')
    .trim()
    .toUpperCase()
    .startsWith('3DSLICER');
}

/** Resolve fourUp HP id from an inbound Hub message, or undefined. */
export function hangingProtocolIdFromSlicerPublisher(
  message: CastMessage | undefined | null
): string | undefined {
  if (!message) {
    return undefined;
  }
  const subscriber =
    messageSubscriberName(message) ||
    String(message['subscriber.name'] || '').trim();
  if (!isSlicerIdSubscriberName(subscriber)) {
    return undefined;
  }
  return SLICER_FOUR_UP_HANGING_PROTOCOL_ID;
}

function normalizeModalityCode(value: unknown): string {
  let m = String(value || '')
    .trim()
    .toUpperCase();
  if (m === 'MRI') m = 'MR';
  if (m === 'PET') m = 'PT';
  return m;
}

/** Collect modality codes from ImagingStudy context study.resource.modality. */
export function modalitiesFromImagingStudyContext(
  context: unknown
): string[] {
  if (!Array.isArray(context)) return [];
  const codes: string[] = [];
  for (const item of context) {
    if (!item || typeof item !== 'object') continue;
    const row = item as { key?: unknown; resource?: Record<string, unknown> };
    if (String(row.key || '') !== 'study' || !row.resource) continue;
    const modality = row.resource.modality;
    if (!Array.isArray(modality)) continue;
    for (const entry of modality) {
      if (!entry || typeof entry !== 'object') continue;
      const coding = (entry as { coding?: unknown }).coding;
      if (!Array.isArray(coding)) continue;
      for (const c of coding) {
        if (!c || typeof c !== 'object') continue;
        const code = normalizeModalityCode((c as { code?: unknown }).code);
        if (code) codes.push(code);
      }
    }
  }
  return codes;
}

/** CT / MR / PT → primary3D hanging protocol. */
export function hangingProtocolIdForVolumeModalities(
  context: unknown
): string | undefined {
  const codes = modalitiesFromImagingStudyContext(context);
  if (codes.some(m => m === 'CT' || m === 'MR' || m === 'PT')) {
    return PRIMARY_3D_HANGING_PROTOCOL_ID;
  }
  return undefined;
}

/**
 * Slicer Image Display publisher → fourUp; else CT/MR/PT context → primary3D.
 */
export function resolveImagingStudyHangingProtocolId(
  message: CastMessage | undefined | null,
  context: unknown
): string | undefined {
  return (
    hangingProtocolIdFromSlicerPublisher(message) ||
    hangingProtocolIdForVolumeModalities(context)
  );
}
