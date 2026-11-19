/**
 * Browser StudyInstanceUID → CRDC series via the CORS slim radiology IDC index
 * (same artifacts as SlicerLive IRA: idc-rad-groups.json + idc-rad-slim.parquet).
 *
 * Range-reads only the 1–2 parquet row groups that span the study (~0.6 MB).
 * Rebuild the artifacts with SlicerLive render/demos/build-idc-slim.ts.
 */

export const IDC_SLIM_INDEX_DEFAULT_BASE =
  'https://js2.jetstream-cloud.org:8001/swift/v1/idc-index/';

const HYPARQUET_ESM = 'https://cdn.jsdelivr.net/npm/hyparquet@1.28.2/+esm';

const SLIM_COLS = [
  'StudyInstanceUID',
  'SeriesInstanceUID',
  'crdc_series_uuid',
  'aws_bucket',
  'Modality',
  'instanceCount',
  'SeriesDescription',
  'PatientID',
  'collection_id',
  'license_short_name',
  'source_DOI',
];

const IMG_MODALITIES = new Set(['CT', 'MR', 'PT', 'PET', 'NM']);

/** @type {{ version: string, rowGroupSize: number, total: number, groups: { min: string, max: string }[] } | null} */
let _dirCache = null;

function resolveIndexUrls(indexBase) {
  const base = String(indexBase || IDC_SLIM_INDEX_DEFAULT_BASE).replace(/\/?$/, '/');
  return {
    base,
    groupsUrl: new URL('idc-rad-groups.json', base).href,
    parquetUrl: new URL('idc-rad-slim.parquet', base).href,
  };
}

/**
 * @param {string} groupsUrl
 * @param {(msg: string) => void} [onStatus]
 */
async function loadGroupDir(groupsUrl, onStatus) {
  if (_dirCache) {
    return _dirCache;
  }
  onStatus?.('fetching the IDC index directory…');
  let resp;
  try {
    const cache = globalThis.caches
      ? await globalThis.caches.open('idc-rad')
      : null;
    if (cache) {
      resp = await cache.match(groupsUrl);
    }
    if (!resp) {
      resp = await fetch(groupsUrl);
      if (resp.ok && cache) {
        await cache.put(groupsUrl, resp.clone());
      }
    }
  } catch {
    resp = await fetch(groupsUrl);
  }
  if (!resp || !resp.ok) {
    throw new Error(
      `index directory not reachable at ${groupsUrl} (HTTP ${resp?.status ?? '?'})`
    );
  }
  _dirCache = await resp.json();
  return _dirCache;
}

/**
 * @param {string} studyUID
 * @param {{ indexBase?: string, onStatus?: (msg: string) => void }} [opts]
 */
async function readStudyRows(studyUID, opts = {}) {
  const { parquetUrl, groupsUrl } = resolveIndexUrls(opts.indexBase);
  const onStatus = opts.onStatus;
  const dir = await loadGroupDir(groupsUrl, onStatus);
  const rgs = dir.rowGroupSize;
  /** @type {[number, number][]} */
  const spans = [];
  for (let i = 0; i < dir.groups.length; i++) {
    const g = dir.groups[i];
    if (studyUID >= g.min && studyUID <= g.max) {
      spans.push([i * rgs, Math.min((i + 1) * rgs, dir.total)]);
    }
  }
  if (!spans.length) {
    throw new Error(
      `StudyInstanceUID not found in the slim IDC index (${dir.version}): ${studyUID}`
    );
  }
  onStatus?.(
    `range-reading the IDC index (${spans.length} group${spans.length > 1 ? 's' : ''})…`
  );
  try {
    const hp = await import(/* @vite-ignore */ HYPARQUET_ESM);
    const file = await hp.asyncBufferFromUrl({ url: parquetUrl });
    const metadata = await hp.parquetMetadataAsync(file);
    const parts = await Promise.all(
      spans.map(([rowStart, rowEnd]) =>
        hp.parquetReadObjects({
          file,
          metadata,
          columns: SLIM_COLS,
          rowStart,
          rowEnd,
        })
      )
    );
    const rows = parts
      .flat()
      .filter((r) => r.StudyInstanceUID === studyUID);
    if (!rows.length) {
      throw new Error(`StudyInstanceUID not found in the IDC index: ${studyUID}`);
    }
    return rows;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('not found')) {
      throw e;
    }
    throw new Error(
      `couldn't range-read the slim IDC index at ${parquetUrl} (${msg})`
    );
  }
}

/**
 * Resolve StudyInstanceUID (+ optional SeriesInstanceUID) to CRDC series metadata.
 *
 * @param {{
 *   studyInstanceUID: string,
 *   seriesInstanceUID?: string,
 *   indexBase?: string,
 *   onStatus?: (msg: string) => void,
 *   useMemo?: boolean,
 * }} args
 * @returns {Promise<{
 *   crdcSeriesUuid: string,
 *   awsBucket: string,
 *   studyInstanceUID: string,
 *   seriesInstanceUID: string,
 *   modality: string,
 *   seriesDescription: string,
 *   patientId: string,
 *   collectionId: string,
 *   license: string,
 *   segCrdcSeriesUuid?: string,
 *   segAwsBucket?: string,
 * }>}
 */
export async function resolveIdcSeriesFromSlimIndex({
  studyInstanceUID,
  seriesInstanceUID,
  indexBase,
  onStatus,
  useMemo = true,
}) {
  const studyUID = String(studyInstanceUID || '').trim();
  if (!studyUID) {
    throw new Error('studyInstanceUID is required');
  }
  const wantSeries = String(seriesInstanceUID || '').trim();
  const want = wantSeries ? [wantSeries] : [];
  const memoKey = `idc-rad:${studyUID}:${want.join(',')}`;

  if (useMemo) {
    try {
      const hit = globalThis.localStorage?.getItem(memoKey);
      if (hit) {
        return JSON.parse(hit);
      }
    } catch {
      /* private mode / no storage */
    }
  }

  const inStudy = await readStudyRows(studyUID, { indexBase, onStatus });
  const wantSet = new Set(want);
  const imgs = inStudy.filter((r) =>
    IMG_MODALITIES.has(String(r.Modality).toUpperCase())
  );
  const segs = inStudy.filter(
    (r) => String(r.Modality).toUpperCase() === 'SEG'
  );

  let chosen =
    imgs.find((r) => wantSet.has(String(r.SeriesInstanceUID))) ||
    imgs
      .slice()
      .sort((a, b) => Number(b.instanceCount) - Number(a.instanceCount))[0];

  // Explicit SeriesInstanceUID that is not an image (e.g. SEG-only request).
  if (!chosen && wantSeries) {
    chosen = inStudy.find((r) => String(r.SeriesInstanceUID) === wantSeries);
  }
  if (!chosen) {
    throw new Error('no CT/MR/PET/NM image series found in this study');
  }

  const seg =
    segs.find((r) => wantSet.has(String(r.SeriesInstanceUID))) || segs[0];
  const modRaw = String(chosen.Modality).toUpperCase();
  const modality = modRaw === 'PET' ? 'PT' : modRaw;
  const result = {
    crdcSeriesUuid: String(chosen.crdc_series_uuid),
    awsBucket: String(chosen.aws_bucket || 'idc-open-data'),
    studyInstanceUID: studyUID,
    seriesInstanceUID: String(chosen.SeriesInstanceUID || ''),
    modality,
    seriesDescription: String(chosen.SeriesDescription || modality),
    patientId: String(chosen.PatientID || ''),
    collectionId: String(chosen.collection_id || ''),
    license: `${chosen.license_short_name || 'IDC'} · ${chosen.collection_id || ''}${
      chosen.source_DOI ? ` · doi:${chosen.source_DOI}` : ''
    }`,
    segCrdcSeriesUuid: seg ? String(seg.crdc_series_uuid) : undefined,
    segAwsBucket: seg ? String(seg.aws_bucket) : undefined,
  };

  if (useMemo) {
    try {
      globalThis.localStorage?.setItem(memoKey, JSON.stringify(result));
    } catch {
      /* ignore */
    }
  }

  return result;
}

/** Clear in-memory group-directory cache (tests). */
export function clearIdcSlimIndexCache() {
  _dirCache = null;
}

/**
 * Build CRDC-prefix file entries for ImagingStudy-open / worklist samples.
 *
 * @param {{ crdcSeriesUuid: string, awsBucket?: string }} resolved
 * @returns {{ url: string, fileName: string }[]}
 */
export function idcCrdcPrefixFiles(resolved) {
  const crdc = String(resolved.crdcSeriesUuid || '').trim();
  const bucket =
    String(resolved.awsBucket || 'idc-open-data').trim() || 'idc-open-data';
  if (!crdc) {
    return [];
  }
  return [
    {
      url: `https://${bucket}.s3.amazonaws.com/${crdc}/`,
      fileName: `${crdc}/`,
    },
  ];
}
