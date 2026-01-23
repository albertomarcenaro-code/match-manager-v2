import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function Landing() {
  const navigate = useNavigate();
  const { loginAsGuest } = useAuth();

  const handleGuest = async () => {
    await loginAsGuest();
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4">
      <h1 className="text-4xl font-bold mb-8 text-center">Match Manager Live</h1>
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Button onClick={() => navigate("/dashboard")} size="lg" className="bg-secondary hover:bg-secondary/90">
          Accedi / Registrati
        </Button>
        <Button onClick={handleGuest} variant="outline" size="lg" className="text-white border-white hover:bg-white/10">
          Entra come Ospite
        </Button>
      </div>
    </div>
  );
}
