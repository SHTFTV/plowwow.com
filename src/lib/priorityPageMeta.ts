import { applyPageMeta } from "./pageMeta";
import { priorityPageSeo } from "../data/priorityPageSeo";
export function applyPriorityPageMeta(page: keyof typeof priorityPageSeo) {
  // Initial route graphs are superseded by the newly mounted route components.
  document.head.querySelectorAll("script[data-prerender-route-schema]").forEach(node => node.remove());
  applyPageMeta(priorityPageSeo[page]);
}
