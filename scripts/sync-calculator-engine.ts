import { copyFileSync, writeFileSync } from 'node:fs';
// The React estimator and standalone tools share exactly one rate engine.
copyFileSync('src/lib/snowBudget.mjs','public/snow-removal-calculator/engine.mjs');
// Maps browser keys are intentionally public but must be website/API restricted in Google Cloud.
// Never substitute a server-side or unrestricted key here.
const key=process.env.VITE_GOOGLE_MAPS_BROWSER_KEY||'';
if(key&&!/^AIza[A-Za-z0-9_-]{20,}$/.test(key))throw new Error('Invalid Maps browser key format');
writeFileSync('public/property-map-preview/config.mjs',`export const mapsBrowserKey=${JSON.stringify(key)};\n`);
