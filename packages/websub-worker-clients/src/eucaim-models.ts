/**
 * Slim EUCAIM nnU-Net task catalog for IRA / worklist Medical Inference.
 * Source: https://github.com/MIC-DKFZ/nnunet-eucaim-docker (Harbor task images).
 */

import {
  findMhubModelsForAnatomy,
  inferMhubBodyPartFromText,
  listMhubBodyPartsForModels,
  listMhubModelsForBodyPart,
  mhubContextHintsFromImagingStudy,
  normalizeMhubAnatomyTerms,
  type MhubModelDef,
} from './mhub-models.ts';

export type EucaimModelDef = MhubModelDef;

const REPO_URL = 'https://github.com/MIC-DKFZ/nnunet-eucaim-docker';

/** @type {readonly EucaimModelDef[]} */
/** Ids match ``SlicerWebSub-workers/eucaim/models.json`` (underscores). */
export const EUCAIM_MODELS: readonly EucaimModelDef[] = Object.freeze([
  {
    name: 'abdominal_organ_segmentation',
    label: 'Abdominal organ seg',
    description:
      'nnU-Net abdominal organ segmentation (EUCAIM Harbor task image).',
    modalities: ['CT'],
    category: 'Segmentation',
    bodyParts: ['Abdomen'],
    segments: ['ABDOMEN'],
    githubUrl: REPO_URL,
    websiteUrl: REPO_URL,
  },
  {
    name: 'brain_tumour_pet',
    label: 'Brain tumour PET',
    description: 'nnU-Net brain tumour segmentation from PET (EUCAIM).',
    modalities: ['PT'],
    category: 'Segmentation',
    bodyParts: ['Brain'],
    segments: ['BRAIN', 'BRAIN+NEOPLASM_MALIGNANT_PRIMARY'],
    githubUrl: REPO_URL,
    websiteUrl: REPO_URL,
  },
  {
    name: 'colon_cancer',
    label: 'Colon cancer',
    description: 'nnU-Net colon cancer segmentation (EUCAIM).',
    modalities: ['CT'],
    category: 'Segmentation',
    bodyParts: ['Colon'],
    segments: ['COLON', 'COLON+NEOPLASM_MALIGNANT_PRIMARY'],
    githubUrl: REPO_URL,
    websiteUrl: REPO_URL,
  },
  {
    name: 'hippocampus_segmentation',
    label: 'Hippocampus seg',
    description: 'nnU-Net hippocampus segmentation (EUCAIM).',
    modalities: ['MR'],
    category: 'Segmentation',
    bodyParts: ['Brain'],
    segments: ['HIPPOCAMPUS'],
    githubUrl: REPO_URL,
    websiteUrl: REPO_URL,
  },
  {
    name: 'kidney_tumour',
    label: 'Kidney tumour',
    description: 'nnU-Net kidney tumour segmentation (EUCAIM).',
    modalities: ['CT'],
    category: 'Segmentation',
    bodyParts: ['Kidney'],
    segments: ['KIDNEY', 'KIDNEY+NEOPLASM_MALIGNANT_PRIMARY'],
    githubUrl: REPO_URL,
    websiteUrl: REPO_URL,
  },
  {
    name: 'liver_tumour',
    label: 'Liver tumour',
    description: 'nnU-Net liver tumour segmentation (EUCAIM).',
    modalities: ['CT'],
    category: 'Segmentation',
    bodyParts: ['Liver'],
    segments: ['LIVER', 'LIVER+NEOPLASM_MALIGNANT_PRIMARY'],
    githubUrl: REPO_URL,
    websiteUrl: REPO_URL,
  },
  {
    name: 'pancreas_tumour',
    label: 'Pancreas tumour',
    description: 'nnU-Net pancreas tumour segmentation (EUCAIM).',
    modalities: ['CT'],
    category: 'Segmentation',
    bodyParts: ['Pancreas'],
    segments: ['PANCREAS', 'PANCREAS+NEOPLASM_MALIGNANT_PRIMARY'],
    githubUrl: REPO_URL,
    websiteUrl: REPO_URL,
  },
]);

function modalityTokens(entry: string): string[] {
  return String(entry || '')
    .split('|')
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean)
    .map((t) => (t === 'MRI' ? 'MR' : t === 'PET' ? 'PT' : t));
}

function modelMatchesModality(model: EucaimModelDef, modality: string): boolean {
  const want = modality.trim().toUpperCase();
  if (!want) return true;
  const normalizedWant = want === 'MRI' ? 'MR' : want === 'PET' ? 'PT' : want;
  return model.modalities.some((m) => modalityTokens(m).includes(normalizedWant));
}

/** Filter EUCAIM models by open-study modality. Null/empty → all models. */
export function listEucaimModelsForModality(
  modality: string | null | undefined,
): EucaimModelDef[] {
  const raw = String(modality || '').trim();
  if (!raw) return [...EUCAIM_MODELS];
  return EUCAIM_MODELS.filter((m) => modelMatchesModality(m, raw));
}

export function listEucaimBodyPartsForModels(
  models: readonly EucaimModelDef[],
): string[] {
  return listMhubBodyPartsForModels(models);
}

export function listEucaimModelsForBodyPart(
  models: readonly EucaimModelDef[],
  bodyPart: string | null | undefined,
): EucaimModelDef[] {
  return listMhubModelsForBodyPart(models, bodyPart);
}

export function normalizeEucaimAnatomyTerms(
  query: string | null | undefined,
): string[] {
  return normalizeMhubAnatomyTerms(query);
}

export function findEucaimModelsForAnatomy(
  query: string | null | undefined,
  models: readonly EucaimModelDef[] = EUCAIM_MODELS,
): EucaimModelDef[] {
  return findMhubModelsForAnatomy(query, models);
}

export function inferEucaimBodyPartFromText(
  text: string | null | undefined,
): string {
  return inferMhubBodyPartFromText(text);
}

export function eucaimContextHintsFromImagingStudy(
  context: unknown[] | null | undefined,
): { modality: string; description: string; bodyPart: string } {
  return mhubContextHintsFromImagingStudy(context);
}
