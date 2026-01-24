import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Importazione pagine
import Landing from "./pages/Landing";
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
  if (!user && !isGuest) return <Navigate to="/" replace />;
  
  return <>{children}</>;
};

// 2. Protezione Solo Registrati (Niente Ospiti)
const TournamentProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isGuest, isLoading } = useAuth();
  
  if (isLoading) return <div className="h-screen flex items-center justify-center font-sans">Caricamento...</div>;
  
  // Se l'utente è un ospite, lo rimandiamo alla dashboard con un avviso
  if (isGuest) {
    // Usiamo un piccolo trucco per mostrare il toast solo una volta al redirect
    return <Navigate to="/dashboard" replace />;
  }
  
  // Se non è loggato affatto, alla landing
  if (!user) return <Navigate to="/" replace />;
  
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
            {/* Pubblica */}
            <Route path="/" element={<Landing />} />
            
            {/* Private - Accessibili anche agli Ospiti */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/match" element={<ProtectedRoute><MatchApp /></ProtectedRoute>} />
            
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
