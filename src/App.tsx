import React, { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useKeyboardAware } from "@/hooks/useKeyboardAware";

import Landing from "./pages/Landing";

const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SingleMatches = lazy(() => import("./pages/SingleMatches"));
const MatchApp = lazy(() => import("./pages/MatchApp"));
const TournamentArchive = lazy(() => import("./pages/TournamentArchive"));
const Tournaments = lazy(() => import("./pages/Tournaments"));
const TournamentDetail = lazy(() => import("./pages/TournamentDetail"));
const TournamentRoster = lazy(() => import("./pages/TournamentRoster"));
const MatchSummary = lazy(() => import("./pages/MatchSummary"));
const MyTeams = lazy(() => import("./pages/MyTeams"));
const TeamMembers = lazy(() => import("./pages/TeamMembers"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const About = lazy(() => import("./pages/About"));
const Overview = lazy(() => import("./pages/Overview"));
const LiveMatch = lazy(() => import("./pages/LiveMatch"));
const LiveTournament = lazy(() => import("./pages/LiveTournament"));

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

const LazyFallback = () => (
  <div className="h-screen flex items-center justify-center font-sans">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto mb-4" />
      <p className="text-sm text-muted-foreground">Caricamento...</p>
    </div>
  </div>
);

const App = () => {
  useKeyboardAware();
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<LazyFallback />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/single-matches" element={<ProtectedRoute><SingleMatches /></ProtectedRoute>} />
              <Route path="/match/:id" element={<ProtectedRoute><MatchApp /></ProtectedRoute>} />
              <Route path="/match-setup/:id" element={<ProtectedRoute><MatchApp /></ProtectedRoute>} />
              <Route path="/match-summary/:id" element={<ProtectedRoute><MatchSummary /></ProtectedRoute>} />
              <Route path="/match" element={<Navigate to="/dashboard" replace />} />
              <Route path="/tournaments" element={<RegisteredRoute><Tournaments /></RegisteredRoute>} />
              <Route path="/tournament/:id" element={<RegisteredRoute><TournamentDetail /></RegisteredRoute>} />
              <Route path="/tournament/:id/roster" element={<RegisteredRoute><TournamentRoster /></RegisteredRoute>} />
              <Route path="/tournament-archive" element={<RegisteredRoute><TournamentArchive /></RegisteredRoute>} />
              <Route path="/my-teams" element={<RegisteredRoute><MyTeams /></RegisteredRoute>} />
              <Route path="/profile" element={<RegisteredRoute><Profile /></RegisteredRoute>} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/about" element={<About />} />
              <Route path="/overview" element={<Overview />} />
              <Route path="/live/match/:id" element={<LiveMatch />} />
              <Route path="/live/tournament/:id" element={<LiveTournament />} />
              <Route path="/public-tournament/:id" element={<LiveTournament />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
