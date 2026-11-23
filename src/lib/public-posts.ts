export interface PublicPost {
  title: string;
  slug: string;
  excerpt: string | null;
  body_md: string;
  faq: { q: string; a: string }[] | null;
  sources: { title: string; url: string }[] | null;
  image_url: string;
  image_alt: string | null;
  meta_description: string | null;
  published_at: string;
}

const endpoint = "https://ppdnkogmsfwhhknayolb.supabase.co/rest/v1/posts";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwZG5rb2dtc2Z3aGhrbmF5b2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2MjQ5NTMsImV4cCI6MjEwMzIwMDk1M30.ms-jCItS0WZ25Zts53KyAa5X9a5MdQONHytTtILIJJQ";
const summaryFields = "title,slug,excerpt,image_url,image_alt,published_at";

export type PostSummary = Pick<PublicPost, "title" | "slug" | "excerpt" | "image_url" | "image_alt" | "published_at">;
export const validPostSlug = (slug: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);

export function fetchPublicPosts(slug: string, signal?: AbortSignal): Promise<PublicPost[]>;
export function fetchPublicPosts(slug?: undefined, signal?: AbortSignal): Promise<PostSummary[]>;
export async function fetchPublicPosts(slug?: string, signal?: AbortSignal) {
  const url = new URL(endpoint);
  url.searchParams.set("site", "eq.plowwow.com");
  url.searchParams.set("select", slug ? summaryFields + ",body_md,faq,sources,meta_description" : summaryFields);
  url.searchParams.set("order", "published_at.desc,slug.asc");
  if (slug) url.searchParams.set("slug", `eq.${slug}`);

  const posts: PostSummary[] = [];
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("limit", String(pageSize));
    const response = await fetch(url, { headers: { apikey: anonKey }, signal });
    if (!response.ok) throw new Error(`Public posts API returned ${response.status}`);
    const page = await response.json() as PostSummary[];
    posts.push(...page.filter((post) => validPostSlug(post.slug)));
    if (slug || page.length < pageSize) return posts;
  }
}
