import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import Admin from "./pages/Admin.tsx";
import Burnaby from "./pages/Burnaby.tsx";
import CityPage from "./pages/CityPage.tsx";
import SeoReport from "./pages/SeoReport.tsx";
import LegacyPage, { legacyPageSlugs, legacyBlogSlugs } from "./pages/LegacyPage.tsx";
import BlogIndex from "./pages/BlogIndex.tsx";
import Intelligence from "./pages/Intelligence.tsx";
import AppFeatures from "./pages/AppFeatures.tsx";
import GuestPost from "./pages/GuestPost.tsx";
import AdminGuestPosts from "./pages/AdminGuestPosts.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/guest-posts" element={<AdminGuestPosts />} />
          <Route path="/burnaby" element={<Burnaby />} />
          <Route path="/seo-report" element={<SeoReport />} />
          <Route path="/blog" element={<BlogIndex />} />
          <Route path="/intelligence" element={<Intelligence />} />
          <Route path="/advanced-technology" element={<AppFeatures />} />
          <Route path="/app-features" element={<AppFeatures />} />
          <Route path="/guest-post" element={<GuestPost />} />
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
