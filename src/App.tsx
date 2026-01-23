import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import MatchApp from "./pages/MatchApp";
import TournamentArchive from "./pages/TournamentArchive";
import Tournaments from "./pages/Tournaments";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, requireAuth = false }: { children: React.ReactNode; requireAuth?: boolean }) {
  const { user, isGuest, isLoading } = useAuth();
  if (isLoading) return <div className="h-screen flex items-center justify-center">Caricamento...</div>;
  if (!user && !isGuest) return <Navigate to="/" replace />;
  if (requireAuth && !user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/match" element={<ProtectedRoute><MatchApp /></ProtectedRoute>} />
      <Route path="/tournaments" element={<ProtectedRoute requireAuth><Tournaments /></ProtectedRoute>} />
      <Route path="/tournament" element={<ProtectedRoute requireAuth><TournamentArchive /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
