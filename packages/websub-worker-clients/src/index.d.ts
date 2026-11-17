import type {
  CastProductStatusProbe,
  HubInferenceServerDef,
} from '@slicer-hub/client';

export function codingModality(value: unknown): string;
export function normalizeStudyModality(raw: unknown): string;
export function isFlexrayEligibleModality(modality: unknown): boolean;
export function isDentalEligibleModality(modality: unknown): boolean;
export function isVox2seglamEligibleModality(modality: unknown): boolean;
export function modalityFromImagingStudyContext(context: unknown): string;
export function modalityEligibilityForServer(
  serverId: string,
  modality: unknown
): { ok: boolean; reason: string };

export type EvidenceCreatorRow = {
  server: HubInferenceServerDef;
  probe: CastProductStatusProbe | null;
  probing: boolean;
};

export type EvidenceCreatorsState = {
  selectedId: string | null;
  rows: EvidenceCreatorRow[];
  probing: boolean;
  studyModality: string;
  wsConnected: boolean;
  hasOpenStudy: boolean;
};

export function createEvidenceCreatorsState(): EvidenceCreatorsState;
export function orderedEvidenceCreatorRows(
  state: EvidenceCreatorsState
): EvidenceCreatorRow[];
export function selectedEvidenceCreatorRow(
  state: EvidenceCreatorsState
): EvidenceCreatorRow | null;
export function selectEvidenceCreator(
  state: EvidenceCreatorsState,
  serverId: string
): EvidenceCreatorsState;
export function setEvidenceCreatorsStudyModality(
  state: EvidenceCreatorsState,
  modality: unknown
): EvidenceCreatorsState;
export function setEvidenceCreatorsSession(
  state: EvidenceCreatorsState,
  wsConnected: boolean,
  hasOpenStudy: boolean
): EvidenceCreatorsState;
export function evidenceCreatorModalityGate(
  serverId: string,
  studyModality: string
): { ok: boolean; reason: string };
export function preferredEvidenceCreatorId(
  availableIds: readonly string[],
  studyModality?: string,
  selectedId?: string | null
): string | null;
export function evidenceCreatorRunEligibility(
  state: EvidenceCreatorsState,
  opts?: { filesReady?: boolean; extraReason?: string }
): { canRun: boolean; reason: string; modalityOk: boolean };
export function applyEvidenceCreatorProbes(
  state: EvidenceCreatorsState,
  probed: Array<{ server: HubInferenceServerDef; probe: CastProductStatusProbe }>
): EvidenceCreatorsState;

export type MhubModelDef = {
  name: string;
  label: string;
  description: string;
  modalities: string[];
  category: string;
  bodyParts: string[];
  segments: string[];
  githubUrl?: string;
  websiteUrl?: string;
  cite?: string;
  citeUrl?: string;
};

export const MHUB_MODELS: readonly MhubModelDef[];
export function listMhubModelsForModality(
  modality: string | null | undefined
): MhubModelDef[];
export function listMhubBodyPartsForModels(models: MhubModelDef[]): string[];
export function listMhubModelsForBodyPart(
  models: MhubModelDef[],
  bodyPart: string
): MhubModelDef[];
export function normalizeMhubAnatomyTerms(query: string): string[];
export function findMhubModelsForAnatomy(
  query: string,
  models?: MhubModelDef[]
): MhubModelDef[];
export function inferMhubBodyPartFromText(text: string): string;
export function mhubContextHintsFromImagingStudy(context: unknown): {
  modality: string;
  bodyPart: string;
};

export type EucaimModelDef = MhubModelDef;
export const EUCAIM_MODELS: readonly EucaimModelDef[];
export function listEucaimModelsForModality(
  modality: string | null | undefined
): EucaimModelDef[];
export function listEucaimBodyPartsForModels(
  models: EucaimModelDef[]
): string[];
export function listEucaimModelsForBodyPart(
  models: EucaimModelDef[],
  bodyPart: string
): EucaimModelDef[];
export function normalizeEucaimAnatomyTerms(query: string): string[];
export function findEucaimModelsForAnatomy(
  query: string,
  models?: EucaimModelDef[]
): EucaimModelDef[];
export function inferEucaimBodyPartFromText(text: string): string;
export function eucaimContextHintsFromImagingStudy(context: unknown): {
  modality: string;
  description: string;
  bodyPart: string;
};

export type TotalSegmentatorQuality = 'normal' | 'fast' | 'faster';
export interface TotalSegmentatorTaskInfo {
  title: string;
  modalities?: ('CT' | 'MR')[];
  qualityModes?: TotalSegmentatorQuality[];
  description?: string;
  supportsMultiLabel?: boolean;
  requiresLicense?: boolean;
}
export const TOTAL_SEGMENTATOR_TASKS: Record<string, TotalSegmentatorTaskInfo>;
export function getSupportedQualityModesForTask(
  taskId: string
): TotalSegmentatorQuality[];
export interface TotalSegmentatorTaskSelectItem {
  value: string;
  title: string;
  description?: string;
}
export function taskSelectItems(): TotalSegmentatorTaskSelectItem[];

export interface TotalSegmentatorOptions {
  task: string;
  quality: TotalSegmentatorQuality;
  outputSegmentGroupId: string | null;
  useStandardSegmentNames: boolean;
  cpu: boolean;
  robustCrop: boolean;
  removeSmallBlobs: boolean;
  higherOrderResampling: boolean;
}
export const DEFAULT_TOTAL_SEGMENTATOR_OPTIONS: TotalSegmentatorOptions;
export function normalizeTotalSegmentatorOptions(
  partial?: Partial<TotalSegmentatorOptions>
): TotalSegmentatorOptions;

export type TotalSegModality = 'CT' | 'MR';
export type TotalSegTask = {
  id: string;
  modality: TotalSegModality;
  group: string;
  title: string;
  licenseRequired?: boolean;
  supportsFast?: boolean;
  classes: readonly string[];
};
export type TotalSegClassHit = { className: string; task: TotalSegTask };
export const TOTAL_SEG_GROUP_LABELS: Readonly<Record<string, string>>;
export function getTotalSegTask(id: string): TotalSegTask | undefined;
export function groupsForModality(modality: TotalSegModality): string[];
export function searchClasses(
  query: string,
  modality: TotalSegModality
): TotalSegClassHit[];
export function taskOptionLabel(task: TotalSegTask): string;
export function taskSupportsFast(taskId: string): boolean;
export function tasksInGroup(
  modality: TotalSegModality,
  group: string
): TotalSegTask[];
export function defaultTaskId(modality: TotalSegModality): string;
