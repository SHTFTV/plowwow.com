import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { collectRoutes } from "./routes";
const { render } = await import("../.prerender/entry-server.js");
const routes = collectRoutes();
for (const route of routes) {
  const file = resolve("dist", route.path.replace(/^\//, ""), "index.html");
  const html = readFileSync(file, "utf8");
  const marker = '<div id="root">';
  const start = html.indexOf(marker);
  const end = html.lastIndexOf("</div>", html.indexOf("</body>"));
  if (start < 0 || end < start) throw new Error(`Missing app root: ${route.path}`);
  const body = (await render(route.path)).replace("<main", `<main data-prerendered="${route.path}"`);
  if (!/<h1[\s>]/.test(body) || !/<main[\s>]/.test(body)) throw new Error(`Missing public content: ${route.path}`);
  // React and crawlers receive the same public page components; no second copy to maintain.
  writeFileSync(file, html.slice(0, start + marker.length) + body + html.slice(end));
}
console.log(`✓ public-render: complete React page HTML generated for ${routes.length} routes`);

// Quote forms need direct URL support, but should not enter the search sitemap.
const template = readFileSync(resolve('dist/index.html'), 'utf8');
const quoteRoutes = [...new Set(routes.filter(r => r.kind === 'city' || r.path === '/burnaby').map(r => r.path))];
for (const cityPath of quoteRoutes) {
  const path = `${cityPath}/quote`;
  const body = await render(path);
  if (!body.includes('<form') || !/<h1[\s>]/.test(body)) throw new Error(`Missing city quote form: ${path}`);
  const start = template.indexOf('<div id="root">') + '<div id="root">'.length;
  const end = template.lastIndexOf('</div>', template.indexOf('</body>'));
  const city = body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)![1].replace(/<[^>]*>/g, '').replace(/\s*Snow Removal Quote.*/, '');
  let html = template.slice(0,start) + body + template.slice(end);
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${city} Snow Removal Quote | PlowWow</title>`)
    .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="https://www.plowwow.com${path}">`)
    .replace(/<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g, '')
    .replace(/<meta (?:property|name)="(?:og:|twitter:)[^"]*"[^>]*>/g, '')
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="Request a snow removal quote for your property.">`)
    .replace(/<meta name="robots"[^>]*>/g, '')
    .replace('</head>', '<meta name="robots" content="noindex,follow"></head>');
  const dir = resolve('dist', path.slice(1));
  mkdirSync(dir, {recursive:true}); writeFileSync(resolve(dir,'index.html'), html);
}
console.log(`✓ public-render: ${quoteRoutes.length} directly accessible city quote forms (noindex)`);
