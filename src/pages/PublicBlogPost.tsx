import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import TopBar from "@/components/TopBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PublicPostArticle } from "@/components/PublicPostContent";
import { fetchPublicPosts, validPostSlug, type PublicPost } from "@/lib/public-posts";
import NotFound from "./NotFound";

export default function PublicBlogPost() {
  const { slug = "" } = useParams();
  return <PublicBlogPostPage key={slug} slug={slug} />;
}

function PublicBlogPostPage({ slug }: { slug: string }) {
  const [post, setPost] = useState<PublicPost | null | undefined>(() => {
    const seed = typeof document !== "undefined" && document.getElementById("public-post-data")?.textContent;
    return seed ? JSON.parse(seed).post : undefined;
  });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (post?.slug === slug || !validPostSlug(slug)) return;
    const controller = new AbortController();
    fetchPublicPosts(slug, controller.signal)
      .then(([result]) => setPost(result ?? null))
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [slug, post?.slug]);

  if (post === null || !validPostSlug(slug)) return <NotFound />;
  return <div className="min-h-screen">
    <TopBar />
    <Navbar />
    {post?.slug === slug
      ? <PublicPostArticle post={post} />
      : <main id="main-content" className="container py-16">{failed ? "This post is temporarily unavailable." : "Loading post…"}</main>}
    <Footer />
  </div>;
}
