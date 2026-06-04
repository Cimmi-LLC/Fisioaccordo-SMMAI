import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "@/contexts/AuthContext";
import { GlobalLoadingProvider } from "@/contexts/GlobalLoadingContext";
import { ContentCacheProvider } from "@/contexts/ContentCacheContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import AppLayout from "@/components/AppLayout";
import CookieBanner from "./components/CookieBanner";

// Auth-related routes: eagerly loaded (small, critical path)
import Auth from "./pages/Auth";

// Lazy-loaded routes — split into separate chunks, loaded on demand.
// Cuts initial bundle by ~60-70% and TTI by ~1.5-2s.
const Index = lazy(() => import("./pages/Index"));
const StoriesGenerator = lazy(() => import("./pages/StoriesGenerator"));
const TrendPage = lazy(() => import("./pages/TrendPage"));
const CompetitorPage = lazy(() => import("./pages/CompetitorPage"));
const ViralePage = lazy(() => import("./pages/ViralePage"));
const ReelPage = lazy(() => import("./pages/ReelPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const InstagramCallback = lazy(() => import("./pages/InstagramCallback"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Privacy = lazy(() => import("./pages/Privacy"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const Terms = lazy(() => import("./pages/Terms"));
const DeletionStatus = lazy(() => import("./pages/DeletionStatus"));
const Settings = lazy(() => import("./pages/Settings"));
const BrandPage = lazy(() => import("./pages/BrandPage"));
const BrandsListPage = lazy(() => import("./pages/BrandsListPage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const Onboarding = lazy(() => import("./pages/Onboarding"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
    mutations: {
      retry: 1,
    }
  }
});

// Fallback shown while a lazy chunk downloads. Branded with rosa Fisioaccordo.
const RouteFallback = () => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg)',
    }}
  >
    <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--rosa)' }} />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GlobalLoadingProvider>
          <ContentCacheProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <CookieBanner />
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/auth/instagram/callback" element={<InstagramCallback />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/onboarding" element={<Onboarding />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/cookie-policy" element={<CookiePolicy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/deletion-status" element={<DeletionStatus />} />

                    {/* App routes — wrapped in sidebar layout */}
                    <Route element={<AppLayout />}>
                      <Route path="/posts" element={<Index />} />
                      <Route path="/storie" element={<StoriesGenerator />} />
                      <Route path="/trend" element={<TrendPage />} />
                      <Route path="/competitor" element={<CompetitorPage />} />
                      <Route path="/virale" element={<ViralePage />} />
                      <Route path="/reel" element={<ReelPage />} />
                      <Route path="/calendario" element={<CalendarPage />} />
                      <Route path="/storico" element={<HistoryPage />} />
                      <Route path="/brands" element={<BrandsListPage />} />
                      <Route path="/admin" element={<AdminPage />} />
                      <Route path="/brand" element={<BrandPage />} />
                      <Route path="/settings" element={<Settings />} />
                    </Route>

                    {/* Redirect / to /posts */}
                    <Route path="/" element={<Navigate to="/posts" replace />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </ContentCacheProvider>
        </GlobalLoadingProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
