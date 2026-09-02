import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { applyPageMeta } from "@/lib/pageMeta";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    const path = location.pathname || "/404";
    applyPageMeta({
      title: "Page Not Found (404) | PlowWow",
      description: "The page you are looking for does not exist. Return to PlowWow for 24/7 snow removal, salting, and de-icing across Greater Vancouver.",
      path,
      noindex: true,
      ogImage: "https://www.plowwow.com/og-default.jpg",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Page Not Found",
        description: "404 — the requested PlowWow page does not exist.",
        url: `https://www.plowwow.com${path}`,
        isPartOf: { "@type": "WebSite", name: "PlowWow", url: "https://www.plowwow.com" },
      },
    });
  }, [location.pathname]);


  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
