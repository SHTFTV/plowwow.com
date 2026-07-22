import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import { legacyPageSlugs, legacyBlogSlugs } from "./legacy-slug-list";
import RoutePreloader from "./components/RoutePreloader";
const LegacyPage = lazy(() => import("./pages/LegacyPage.tsx"));

// Route-level code splitting: keep the homepage + NotFound + LegacyPage
// (used by ~150 prerendered legacy routes and therefore the LCP path for
// most crawler entries) eagerly bundled, and lazy-load everything else.
// This keeps the main chunk small while preserving fast first paint on the
// prerendered routes crawlers hit.
const Auth = lazy(() => import("./pages/Auth.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const Burnaby = lazy(() => import("./pages/Burnaby.tsx"));
const CityPage = lazy(() => import("./pages/CityPage.tsx"));
const SeoReport = lazy(() => import("./pages/SeoReport.tsx"));
const BlogIndex = lazy(() => import("./pages/BlogIndex.tsx"));
const BlogNeighborhoods = lazy(() => import("./pages/BlogNeighborhoods.tsx"));
const Intelligence = lazy(() => import("./pages/Intelligence.tsx"));
const AppFeatures = lazy(() => import("./pages/AppFeatures.tsx"));
const GuestPost = lazy(() => import("./pages/GuestPost.tsx"));
const AdminGuestPosts = lazy(() => import("./pages/AdminGuestPosts.tsx"));
const PublishHelper = lazy(() => import("./pages/PublishHelper.tsx"));
const Takeoff = lazy(() => import("./pages/Takeoff.tsx"));
const Quote = lazy(() => import("./pages/Quote.tsx"));
const Locations = lazy(() => import("./pages/Locations.tsx"));
const AdminLinkAudit = lazy(() => import("./pages/AdminLinkAudit.tsx"));
const AdminGscCoverage = lazy(() => import("./pages/AdminGscCoverage.tsx"));
const AdminJsonLdValidator = lazy(() => import("./pages/AdminJsonLdValidator.tsx"));
const AdminSeoSettings = lazy(() => import("./pages/AdminSeoSettings.tsx"));
const AdminNeighborhoods = lazy(() => import("./pages/AdminNeighborhoods.tsx"));
const AdminQuoteMetrics = lazy(() => import("./pages/AdminQuoteMetrics.tsx"));
const AdminQuoteDenylist = lazy(() => import("./pages/AdminQuoteDenylist.tsx"));
const AdminQuoteAlerts = lazy(() => import("./pages/AdminQuoteAlerts.tsx"));
const AdminQuoteAuditLog = lazy(() => import("./pages/AdminQuoteAuditLog.tsx"));
const AuthorPage = lazy(() => import("./pages/AuthorPage.tsx"));
const NewsletterConfirm = lazy(() => import("./pages/NewsletterConfirm.tsx"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center" aria-busy="true" aria-live="polite">
    <span className="sr-only">Loading…</span>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RoutePreloader />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/guest-posts" element={<AdminGuestPosts />} />
            <Route path="/admin/link-audit" element={<AdminLinkAudit />} />
            <Route path="/admin/gsc-coverage" element={<AdminGscCoverage />} />
            <Route path="/admin/jsonld-validator" element={<AdminJsonLdValidator />} />
            <Route path="/admin/seo-settings" element={<AdminSeoSettings />} />
            <Route path="/admin/neighborhoods" element={<AdminNeighborhoods />} />
            <Route path="/admin/quote-metrics" element={<AdminQuoteMetrics />} />
            <Route path="/admin/quote-denylist" element={<AdminQuoteDenylist />} />
            <Route path="/admin/quote-alerts" element={<AdminQuoteAlerts />} />
            <Route path="/admin/quote-audit-log" element={<AdminQuoteAuditLog />} />
            <Route path="/burnaby" element={<Burnaby />} />
            <Route path="/seo-report" element={<SeoReport />} />
            <Route path="/blog" element={<BlogIndex />} />
            <Route path="/blog/neighborhoods" element={<BlogNeighborhoods />} />
            <Route path="/blog/neighborhoods/" element={<BlogNeighborhoods />} />
            <Route path="/blog/tag/:tagSlug" element={<BlogIndex />} />
            <Route path="/blog/tag/:tagSlug/" element={<BlogIndex />} />

            <Route path="/intelligence" element={<Intelligence />} />
            <Route path="/advanced-technology" element={<AppFeatures />} />
            <Route path="/guest-post" element={<GuestPost />} />
            <Route path="/publish-helper" element={<PublishHelper />} />
            <Route path="/takeoff" element={<Takeoff />} />
            <Route path="/quote" element={<Quote />} />
            <Route path="/locations" element={<Locations />} />
            <Route path="/author/:slug" element={<AuthorPage />} />
            <Route path="/author/:slug/" element={<AuthorPage />} />
            <Route path="/newsletter/confirm" element={<NewsletterConfirm />} />
            <Route path="/newsletter/confirm/" element={<NewsletterConfirm />} />

            {legacyPageSlugs.map((slug) => (
              <Route
                key={`page-${slug}`}
                path={`/${slug}`}
                element={<LegacyPage kind="page" />}
              />
            ))}
            {legacyBlogSlugs.map((slug) => (
              <Route
                key={`blog-${slug}`}
                path={`/${slug}`}
                element={<LegacyPage kind="blog" />}
              />
            ))}
            <Route path="/:citySlug/*" element={<CityPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
