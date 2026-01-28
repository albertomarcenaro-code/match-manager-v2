import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Importazione pagine
import Landing from "./pages/Landing";       // La nuova vetrina "stile Google"
import Auth from "./pages/Auth";             // Il vecchio file rinominato (Login/Ospite)
import Dashboard from "./pages/Dashboard";
import MatchApp from "./pages/MatchApp";
import TournamentArchive from "./pages/TournamentArchive";
import Tournaments from "./pages/Tournaments";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// 1. Protezione Standard (Ospiti + Registrati)
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isGuest, isLoading } = useAuth();
  
  if (isLoading) return <div className="h-screen flex items-center justify-center font-sans">Caricamento...</div>;
  
  // MODIFICA: Se non è loggato, lo mandiamo alla pagina di Auth, non alla vetrina principale
  if (!user && !isGuest) return <Navigate to="/auth" replace />;
  
  return <>{children}</>;
};

// 2. Protezione Solo Registrati (Niente Ospiti)
const TournamentProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isGuest, isLoading } = useAuth();
  
  if (isLoading) return <div className="h-screen flex items-center justify-center font-sans">Caricamento...</div>;
  
  if (isGuest) return <Navigate to="/dashboard" replace />;
  if (!user) return <Navigate to="/auth" replace />; // MODIFICA: redirect a /auth
  
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
            {/* 1. Vetrina Pubblica (NotebookLM Style) */}
            <Route path="/" element={<Landing />} />
            
            {/* 2. Pagina di Accesso (Vecchio login/ospite) */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Private - Accessibili anche agli Ospiti */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/match/:id" element={<ProtectedRoute><MatchApp /></ProtectedRoute>} />
            
            {/* Private - SOLO per Utenti Registrati */}
            <Route 
              path="/tournaments" 
              element={
                <TournamentProtectedRoute>
                  <Tournaments />
                </TournamentProtectedRoute>
              } 
            />
            <Route 
              path="/tournament-archive" 
              element={
                <TournamentProtectedRoute>
                  <TournamentArchive />
                </TournamentProtectedRoute>
              } 
            />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
