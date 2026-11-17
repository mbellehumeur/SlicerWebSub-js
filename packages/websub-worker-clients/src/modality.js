/**
 * Shared open-study modality helpers for evidence creators.
 */

/**
 * @param {unknown} value
 * @returns {string}
 */
export function codingModality(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim().toUpperCase();
  if (Array.isArray(value)) {
    for (const entry of value) {
      const m = codingModality(entry);
      if (m) return m;
    }
    return '';
  }
  if (typeof value === 'object') {
    const obj = /** @type {{ code?: unknown, coding?: unknown, text?: unknown }} */ (
      value
    );
    if (obj.coding != null) return codingModality(obj.coding);
    if (obj.code != null) return String(obj.code).trim().toUpperCase();
    if (obj.text != null) return String(obj.text).trim().toUpperCase();
  }
  return '';
}

/**
 * Normalize DICOM / study modality tokens for evidence-creator gates.
 * @param {unknown} raw
 * @returns {string} Uppercase token or '' (CTAC→CT, MRI→MR, PET/NM→PT, CBCT kept).
 */
export function normalizeStudyModality(raw) {
  const m = String(raw || '')
    .trim()
    .toUpperCase();
  if (!m) return '';
  if (m === 'CT' || m === 'CTAC') return 'CT';
  if (m === 'CBCT') return 'CBCT';
  if (m === 'MR' || m === 'MRI') return 'MR';
  if (m === 'PT' || m === 'PET' || m === 'NM') return 'PT';
  if (m === 'CR' || m === 'DX') return m;
  return m;
}

/**
 * @param {unknown} modality
 * @returns {boolean}
 */
export function isFlexrayEligibleModality(modality) {
  const m = normalizeStudyModality(modality);
  return m === 'CR' || m === 'DX';
}

/**
 * Dental Segmentator: CT / CBCT (CTAC normalized to CT).
 * @param {unknown} modality
 * @returns {boolean}
 */
export function isDentalEligibleModality(modality) {
  const m = normalizeStudyModality(modality);
  return m === 'CT' || m === 'CBCT';
}

/**
 * Vox2SegLAM: T1-weighted brain MRI.
 * @param {unknown} modality
 * @returns {boolean}
 */
export function isVox2seglamEligibleModality(modality) {
  return normalizeStudyModality(modality) === 'MR';
}

/**
 * Extract a modality code from ImagingStudy-open style context arrays.
 * Prefer study/series coding; fall back to volume file labels (worklist IDC).
 * @param {unknown} context
 * @returns {string}
 */
export function modalityFromImagingStudyContext(context) {
  if (!Array.isArray(context)) return '';
  let fromFiles = '';
  for (const item of context) {
    if (!item || typeof item !== 'object') continue;
    const key = String(/** @type {{ key?: unknown }} */ (item).key || '');
    const resource = /** @type {{ resource?: unknown }} */ (item).resource;
    if (!resource || typeof resource !== 'object') continue;
    const res = /** @type {{ modality?: unknown, series?: unknown, files?: unknown }} */ (
      resource
    );
    const fromStudy = codingModality(res.modality);
    if (fromStudy) return normalizeStudyModality(fromStudy);
    if (Array.isArray(res.series)) {
      for (const series of res.series) {
        if (!series || typeof series !== 'object') continue;
        const fromSeries = codingModality(
          /** @type {{ modality?: unknown }} */ (series).modality
        );
        if (fromSeries) return normalizeStudyModality(fromSeries);
      }
    }
    // IDC / worklist often put modality on volume file labels.
    if (!fromFiles && (key === 'files' || Array.isArray(res.files))) {
      const files = Array.isArray(res.files) ? res.files : [];
      for (const file of files) {
        if (!file || typeof file !== 'object') continue;
        const row = /** @type {{ role?: unknown, label?: unknown }} */ (file);
        const role = String(row.role || '')
          .trim()
          .toLowerCase();
        if (role && role !== 'volume') continue;
        const hit = normalizeStudyModality(row.label);
        if (
          hit === 'CT' ||
          hit === 'MR' ||
          hit === 'PT' ||
          hit === 'CR' ||
          hit === 'DX' ||
          hit === 'CBCT'
        ) {
          fromFiles = hit;
          break;
        }
      }
    }
  }
  return fromFiles;
}

/**
 * @param {string} serverId
 * @param {unknown} modality
 * @returns {{ ok: boolean, reason: string }}
 */
export function modalityEligibilityForServer(serverId, modality) {
  const id = String(serverId || '');
  const m = normalizeStudyModality(modality);
  if (id === 'flexray') {
    if (isFlexrayEligibleModality(m)) return { ok: true, reason: '' };
    return {
      ok: false,
      reason: m
        ? `FleXray requires CR or DX (open study modality: ${m}).`
        : 'FleXray requires a CR or DX study.',
    };
  }
  if (id === 'dental') {
    if (isDentalEligibleModality(m)) return { ok: true, reason: '' };
    return {
      ok: false,
      reason: m
        ? `Dental Segmentator requires CT or CBCT (open study modality: ${m}).`
        : 'Dental Segmentator requires a CT or CBCT study.',
    };
  }
  if (id === 'vox2seglam') {
    if (isVox2seglamEligibleModality(m)) return { ok: true, reason: '' };
    return {
      ok: false,
      reason: m
        ? `Vox2SegLAM requires MR (open study modality: ${m}).`
        : 'Vox2SegLAM requires an MR study.',
    };
  }
  return { ok: true, reason: '' };
}
