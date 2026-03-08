import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import SingleMatches from "./pages/SingleMatches";
import MatchApp from "./pages/MatchApp";
import TournamentArchive from "./pages/TournamentArchive";
import Tournaments from "./pages/Tournaments";
import MyTeams from "./pages/MyTeams";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Standard protection (guests + registered)
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isGuest, isLoading } = useAuth();
  if (isLoading) return <div className="h-screen flex items-center justify-center font-sans">Caricamento...</div>;
  if (!user && !isGuest) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

// Registered-only protection (no guests)
const RegisteredRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isGuest, isLoading } = useAuth();
  if (isLoading) return <div className="h-screen flex items-center justify-center font-sans">Caricamento...</div>;
  if (isGuest) return <Navigate to="/dashboard" replace />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/single-matches" element={<ProtectedRoute><SingleMatches /></ProtectedRoute>} />
            <Route path="/match/:id" element={<ProtectedRoute><MatchApp /></ProtectedRoute>} />
            <Route path="/match-setup/:id" element={<ProtectedRoute><MatchApp /></ProtectedRoute>} />
            <Route path="/match" element={<Navigate to="/dashboard" replace />} />
            <Route path="/tournaments" element={<RegisteredRoute><Tournaments /></RegisteredRoute>} />
            <Route path="/tournaments/:tournamentId" element={<RegisteredRoute><Tournaments /></RegisteredRoute>} />
            <Route path="/tournament-archive" element={<RegisteredRoute><TournamentArchive /></RegisteredRoute>} />
            <Route path="/my-teams" element={<RegisteredRoute><MyTeams /></RegisteredRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
