
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { GlobalLoadingProvider } from "@/contexts/GlobalLoadingContext";
import { ContentCacheProvider } from "@/contexts/ContentCacheContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import AppLayout from "@/components/AppLayout";
import Index from "./pages/Index";
import StoriesGenerator from "./pages/StoriesGenerator";
import TrendPage from "./pages/TrendPage";
import CompetitorPage from "./pages/CompetitorPage";
import ViralePage from "./pages/ViralePage";
import ReelPage from "./pages/ReelPage";
import AdminPage from "./pages/AdminPage";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import InstagramCallback from "./pages/InstagramCallback";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import DeletionStatus from "./pages/DeletionStatus";
import Settings from "./pages/Settings";
import BrandPage from "./pages/BrandPage";
import BrandsListPage from "./pages/BrandsListPage";
import CalendarPage from "./pages/CalendarPage";
import HistoryPage from "./pages/HistoryPage";
import Onboarding from "./pages/Onboarding";

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
                <Routes>
                  {/* Public routes */}
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/auth/instagram/callback" element={<InstagramCallback />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/privacy" element={<Privacy />} />
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
              </BrowserRouter>
            </TooltipProvider>
          </ContentCacheProvider>
        </GlobalLoadingProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
