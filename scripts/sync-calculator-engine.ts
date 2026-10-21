import { copyFileSync } from 'node:fs';
// The React estimator and the standalone calculator use the same rate engine.
copyFileSync('src/lib/snowBudget.mjs','public/snow-removal-calculator/engine.mjs');
