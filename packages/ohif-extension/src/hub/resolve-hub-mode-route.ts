import { DicomMetadataStore } from '@ohif/core';

export const HUB_US_ANNOTATION_MODE_ROUTE = 'usAnnotation';
export const HUB_SEGMENTATION_MODE_ROUTE = 'segmentation';

function normalizeSeriesModality(modality: unknown): string {
  let m = String(modality ?? '')
    .trim()
    .toUpperCase();
  if (m === 'MRI') m = 'MR';
  return m;
}

function studyHasModality(
  studyInstanceUID: string,
  want: string
): boolean {
  const uid = studyInstanceUID.trim();
  if (!uid) {
    return false;
  }
  const study = DicomMetadataStore.getStudy(uid);
  if (!study?.series?.length) {
    return false;
  }
  return study.series.some(series => {
    if (normalizeSeriesModality(series.Modality) === want) {
      return true;
    }
    const instance = series.instances?.[0];
    return (
      instance != null && normalizeSeriesModality(instance.Modality) === want
    );
  });
}

/** True when any series (or its first instance) in the study is Modality US. */
export function studyHasUltrasoundModality(studyInstanceUID: string): boolean {
  return studyHasModality(studyInstanceUID, 'US');
}

/** True when any series (or its first instance) in the study is Modality MR. */
export function studyHasMrModality(studyInstanceUID: string): boolean {
  return studyHasModality(studyInstanceUID, 'MR');
}

/**
 * Pick OHIF mode route segment: explicit Hub `ohifMode` wins; else US →
 * usAnnotation, MR → segmentation, otherwise basic viewer.
 */
export function resolveHubModeRoute(
  studyUIDs: string[],
  explicitModeRoute?: string
): string {
  const explicit = String(explicitModeRoute ?? '')
    .trim()
    .replace(/^\/+|\/+$/g, '');
  if (explicit) {
    return explicit;
  }
  if (studyUIDs.some(studyHasUltrasoundModality)) {
    return HUB_US_ANNOTATION_MODE_ROUTE;
  }
  if (studyUIDs.some(studyHasMrModality)) {
    return HUB_SEGMENTATION_MODE_ROUTE;
  }
  return 'viewer';
}

export function isAlreadyOnHubStudyViewer(
  studyUID: string,
  modeRoute: string,
  dataSource?: string
): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const normalizedMode =
    String(modeRoute ?? '')
      .trim()
      .replace(/^\/+|\/+$/g, '') || 'viewer';
  const { pathname, search } = window.location;
  if (!search.includes(studyUID)) {
    return false;
  }
  const onMode =
    pathname.includes(`/${normalizedMode}/`) || pathname.endsWith(`/${normalizedMode}`);
  if (!onMode) {
    return false;
  }
  if (dataSource && !pathname.includes(`/${dataSource}`)) {
    return false;
  }
  return true;
}
