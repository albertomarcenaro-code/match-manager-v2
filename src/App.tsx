import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import React from "react";

// Definiamo dei componenti semplici direttamente qui per testare
const TestLanding = () => <div style={{padding: "50px", textAlign: "center"}}><h1>Sito Online</h1><a href="/dashboard">Vai alla Dashboard</a></div>;
const TestDashboard = () => <div style={{padding: "50px", textAlign: "center"}}><h1>Dashboard Funzionante</h1><a href="/tournaments">Vai ai Tornei</a></div>;
const TestTournaments = () => <div style={{padding: "50px", textAlign: "center"}}><h1>Pagina Tornei Funzionante</h1></div>;

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route path="/" element={<TestLanding />} />
        <Route path="/dashboard" element={<TestDashboard />} />
        <Route path="/tournaments" element={<TestTournaments />} />
        <Route path="*" element={<div>Pagina non trovata - Errore 404</div>} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
