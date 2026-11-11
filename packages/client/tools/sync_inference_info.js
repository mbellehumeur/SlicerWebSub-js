/**
 * Copy <name>/<name>.info.json from SlicerWebSub-workers into src/inferenceInfo/.
 * Non-fatal if workers dir is missing and src/inferenceInfo already has files.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(clientRoot, '../..');
const candidates = [
  path.resolve(repoRoot, '../SlicerWebSub-workers'),
  // Legacy fallbacks
  path.resolve(repoRoot, '../SlicerWebSub/WebSubInterface/service_providers/products'),
  path.resolve(repoRoot, '../slicer-cast-extension/CastInterface/cast_resource_servers/products'),
  path.resolve(repoRoot, '../cast-interface/slicer-cast-extension/CastInterface/cast_resource_servers/products'),
];
const productsDir = candidates.find((p) => fs.existsSync(p));
const outDir = path.join(clientRoot, 'src', 'inferenceInfo');

/** @type {Array<{ name: string, srcRel: string }>} */
const FILES = [
  { name: 'mhub.info.json', srcRel: path.join('mhub', 'mhub.info.json') },
  { name: 'lung_screening.info.json', srcRel: path.join('lung_screening', 'lung_screening.info.json') },
  { name: 'total_segmentator.info.json', srcRel: path.join('total_segmentator', 'total_segmentator.info.json') },
  { name: 'neuro_seg.info.json', srcRel: path.join('neuro_seg', 'neuro_seg.info.json') },
  { name: 'dental_segmentator.info.json', srcRel: path.join('dental_segmentator', 'dental_segmentator.info.json') },
  { name: 'torchxrayvision.info.json', srcRel: path.join('torchxrayvision', 'torchxrayvision.info.json') },
  { name: 'flexray.info.json', srcRel: path.join('flexray', 'flexray.info.json') },
];

function hasExistingOutputs() {
  return FILES.every(({ name }) => fs.existsSync(path.join(outDir, name)));
}

if (!productsDir) {
  if (hasExistingOutputs()) {
    console.warn('Products dir not found; keeping existing src/inferenceInfo/.');
    process.exit(0);
  }
  console.error('No SlicerWebSub-workers (or legacy products) directory found.');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
for (const { name, srcRel } of FILES) {
  const src = path.join(productsDir, srcRel);
  const dest = path.join(outDir, name);
  if (!fs.existsSync(src)) {
    console.warn(`skip missing ${srcRel}`);
    continue;
  }
  fs.copyFileSync(src, dest);
  console.log(`synced ${name}`);
}
