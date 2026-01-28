import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Importazione pagine
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
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
  
  if (!user && !isGuest) return <Navigate to="/auth" replace />;
  
  return <>{children}</>;
};

// 2. Protezione Solo Registrati (Niente Ospiti)
const TournamentProtectedRoute = ({ children }: { children: React.ReactNode }) => {
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
            
            {/* --- SEZIONE MODIFICATA --- */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            
            {/* Rotta specifica per un match esistente */}
            <Route path="/match/:id" element={<ProtectedRoute><MatchApp /></ProtectedRoute>} />
            
            {/* Rotta di sicurezza: se vai su /match senza ID, ti riporta in Dashboard invece di crashare */}
            <Route path="/match" element={<Navigate to="/dashboard" replace />} />
            {/* --------------------------- */}
            
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
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
