// Sable & Smoke — hand-in program (Node 22, standard library only).
//
// It stages this repository's game/ and screenshots/ into the grader's
// output directory and writes dossier.json there, the summary the judge
// reads, built by the vendored make.fun library. Outside the grader,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function stageFolder(name) {
  const source = join(repoRoot, name);
  if (!existsSync(source)) return;
  cpSync(source, join(outDir, name), { recursive: true });
}

mkdirSync(outDir, { recursive: true });
stageFolder('game');
stageFolder('screenshots');

// The scorer's caps for this bounty (see the kit's RULES.txt): the text
// cap shapes the dossier's bytes; the rest refuse an entry the scorer
// would refuse outright (too many screenshots, one too large, game/
// too big or too many files, a path too long).
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
