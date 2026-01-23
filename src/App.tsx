import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import React from "react";

// Importazione delle pagine
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import MatchApp from "./pages/MatchApp";
import TournamentArchive from "./pages/TournamentArchive";
import Tournaments from "./pages/Tournaments";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Componente per proteggere le pagine private
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isGuest, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Se non è loggato e non è un ospite, torna alla Landing
  if (!user && !isGuest) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Pagina pubblica */}
            <Route path="/" element={<Landing />} />
            
            {/* Pagine protette */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/tournaments" 
              element={
                <ProtectedRoute>
                  <Tournaments />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/match" 
              element={
                <ProtectedRoute>
                  <MatchApp />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/tournament-archive" 
              element={
                <ProtectedRoute>
                  <TournamentArchive />
                </ProtectedRoute>
              } 
            />

            {/* Gestione errore 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
