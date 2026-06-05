import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Pencil, ArrowLeft, Mail, Shield, Building2, Tag, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface ProfileData {
  full_name: string | null;
  role: string | null;
  sports_club: string | null;
  category: string | null;
}

const ROLE_OPTIONS = ["Allenatore", "Dirigente / Responsabile Scout", "Genitore / Appassionato"];
const CATEGORY_OPTIONS = [
  "Piccoli Amici (U6-U7)", "Primi Calci (U8-U9)", "Pulcini (U10-U11)",
  "Esordienti (U12-U13)", "Giovanissimi (U14-U15)", "Allievi (U16-U17)",
  "Juniores (U18-U19)", "Prima Squadra"
];

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData>({ full_name: null, role: null, sports_club: null, category: null });
  const [draft, setDraft] = useState<ProfileData>({ full_name: null, role: null, sports_club: null, category: null });
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, role, sports_club, category")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setProfile(data);
        setDraft(data);
      }
      setIsLoading(false);
    };
    fetchProfile();
  }, [user]);

  const startEdit = () => {
    setDraft({ ...profile });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraft({ ...profile });
    setIsEditing(false);
  };

  const saveAll = async () => {
    if (!user) return;
    setIsSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: draft.full_name || null,
        role: draft.role || null,
        sports_club: draft.sports_club || null,
        category: draft.category || null,
      })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Errore nel salvataggio");
    } else {
      setProfile({ ...draft });
      toast.success("Profilo aggiornato");
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  const renderField = (label: string, field: keyof ProfileData, icon: React.ReactNode, type: "text" | "select" = "text", options?: string[]) => (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
      <div className="text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {isEditing ? (
          type === "select" && options ? (
            <Select value={draft[field] || ""} onValueChange={v => setDraft(prev => ({ ...prev, [field]: v }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
              <SelectContent>
                {options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={draft[field] || ""}
              onChange={e => setDraft(prev => ({ ...prev, [field]: e.target.value }))}
              className="h-9 text-sm"
            />
          )
        ) : (
          <p className="text-sm font-medium truncate">
            {profile[field] || <span className="text-muted-foreground italic">Non impostato</span>}
          </p>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 p-4 sm:p-6 max-w-xl mx-auto w-full">
        <Button variant="ghost" size="sm" className="mb-4 gap-1" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Indietro
        </Button>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Il mio Profilo</CardTitle>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              {!isEditing && (
                <Button size="icon" variant="ghost" onClick={startEdit} className="text-muted-foreground hover:text-primary">
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-0">
            {/* Email - always read-only */}
            <div className="flex items-center gap-3 py-3 border-b border-border/50">
              <div className="text-muted-foreground"><Mail className="h-4 w-4" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Email</p>
                {isEditing ? (
                  <Input value={user?.email || ""} disabled className="h-9 text-sm opacity-60" />
                ) : (
                  <p className="text-sm font-medium truncate">{user?.email}</p>
                )}
              </div>
            </div>

            {renderField("Nome e Cognome", "full_name", <User className="h-4 w-4" />)}
            {renderField("Ruolo", "role", <Shield className="h-4 w-4" />, "select", ROLE_OPTIONS)}
            {renderField("Società Sportiva", "sports_club", <Building2 className="h-4 w-4" />)}
            {renderField("Categoria", "category", <Tag className="h-4 w-4" />, "select", CATEGORY_OPTIONS)}

            {isEditing && (
              <div className="flex gap-3 pt-5">
                <Button onClick={saveAll} disabled={isSaving} className="flex-1 gap-2">
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salva Modifiche
                </Button>
                <Button variant="outline" onClick={cancelEdit} disabled={isSaving} className="flex-1">
                  Annulla
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
