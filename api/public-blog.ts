import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PublicPostArticle, PublicPostCards } from "../src/components/PublicPostContent.js";
import { fetchPublicPosts, validPostSlug, type PublicPost } from "../src/lib/public-posts.js";

const shell = () => readFile(resolve(".blog-runtime/index.html"), "utf8");
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]!);

function articleMetadata(html: string, post: PublicPost) {
  const title = escapeHtml(`${post.title} | PlowWow`);
  const description = escapeHtml(post.meta_description || post.excerpt || post.title);
  const canonical = `https://www.plowwow.com/blog/${post.slug}`;
  const image = escapeHtml(post.image_url);
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${title}</title>`)
    .replace(/<link[^>]+rel="canonical"[^>]*>/gi, "")
    .replace(/<meta[^>]+(?:name|property)="(?:description|og:[^"]+|twitter:[^"]+)"[^>]*>/gi, "")
    .replace(/<script[^>]+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace("</head>", () => `
      <link rel="canonical" href="${canonical}">
      <meta name="description" content="${description}">
      <meta property="og:type" content="article">
      <meta property="og:title" content="${title}">
      <meta property="og:description" content="${description}">
      <meta property="og:url" content="${canonical}">
      <meta property="og:image" content="${image}">
      <meta property="og:image:alt" content="${escapeHtml(post.image_alt ?? "")}">
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:title" content="${title}">
      <meta name="twitter:description" content="${description}">
      <meta name="twitter:image" content="${image}">
    </head>`);
}

function seedPage(html: string, data: object) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return html.replace("</head>", () => `<script type="application/json" id="public-post-data">${json}</script></head>`);
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", "https://www.plowwow.com");
  const slug = url.pathname.startsWith("/blog/")
    ? url.pathname.slice("/blog/".length).replace(/\/$/, "")
    : url.pathname === "/blog" ? null : url.searchParams.get("blogPostSlug");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  try {
    const signal = AbortSignal.timeout(8000);
    if (slug === null) {
      const [html, posts] = await Promise.all([shell(), fetchPublicPosts(undefined, signal)]);
      const cards = renderToStaticMarkup(createElement(PublicPostCards, { posts }));
      res.end(seedPage(html.replace('<div id="public-blog-posts"></div>', () => cards), { posts }));
      return;
    }

    const [post] = validPostSlug(slug) ? await fetchPublicPosts(slug, signal) : [];
    if (!post) {
      const legacySlugs: string[] = JSON.parse(await readFile(resolve(".blog-runtime/legacy-slugs.json"), "utf8"));
      if (legacySlugs.includes(slug)) {
        res.statusCode = 308;
        res.setHeader("Location", `/${slug}`);
        res.end();
        return;
      }
      res.statusCode = 404;
      res.end('<!doctype html><html lang="en"><title>Post not found | PlowWow</title><h1>Post not found</h1><a href="/blog">Back to the blog</a></html>');
      return;
    }

    const main = renderToStaticMarkup(createElement(PublicPostArticle, { post }));
    const html = (await shell()).replace(/<main\b[^>]*>[\s\S]*?<\/main>/, () => main);
    res.end(seedPage(articleMetadata(html, post), { post }));
  } catch (error) {
    console.error("Could not render the public blog", error);
    res.statusCode = 503;
    res.setHeader("Retry-After", "60");
    res.end('<!doctype html><html lang="en"><title>Blog temporarily unavailable | PlowWow</title><h1>Blog temporarily unavailable</h1><a href="/blog">Try again</a></html>');
  }
}
