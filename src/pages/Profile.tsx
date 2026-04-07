import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Pencil, Check, X, ArrowLeft, Mail, Shield, Building2, Tag } from "lucide-react";
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

type EditableField = "full_name" | "role" | "sports_club" | "category";

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData>({ full_name: null, role: null, sports_club: null, category: null });
  const [isLoading, setIsLoading] = useState(true);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, role, sports_club, category")
        .eq("user_id", user.id)
        .single();
      if (data) setProfile(data);
      setIsLoading(false);
    };
    fetchProfile();
  }, [user]);

  const startEdit = (field: EditableField) => {
    setEditingField(field);
    setEditValue(profile[field] || "");
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const saveField = async () => {
    if (!user || !editingField) return;
    setIsSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ [editingField]: editValue || null })
      .eq("user_id", user.id);
    
    if (error) {
      toast.error("Errore nel salvataggio");
    } else {
      setProfile(prev => ({ ...prev, [editingField!]: editValue || null }));
      toast.success("Profilo aggiornato");
    }
    setEditingField(null);
    setEditValue("");
    setIsSaving(false);
  };

  const renderField = (label: string, field: EditableField, icon: React.ReactNode, type: "text" | "select" = "text", options?: string[]) => {
    const isEditing = editingField === field;
    const value = profile[field];

    return (
      <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="text-muted-foreground">{icon}</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            {isEditing ? (
              <div className="flex items-center gap-2 mt-1">
                {type === "select" && options ? (
                  <Select value={editValue} onValueChange={setEditValue}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                  />
                )}
                <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={saveField} disabled={isSaving}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={cancelEdit}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-sm font-medium truncate">{value || <span className="text-muted-foreground italic">Non impostato</span>}</p>
            )}
          </div>
        </div>
        {!isEditing && (
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => startEdit(field)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Caricamento...</p>
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
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Il mio Profilo</CardTitle>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-0">
            {/* Email - non editable */}
            <div className="flex items-center justify-between py-3 border-b border-border/50">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="text-muted-foreground"><Mail className="h-4 w-4" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium truncate">{user?.email}</p>
                </div>
              </div>
            </div>

            {renderField("Nome e Cognome", "full_name", <User className="h-4 w-4" />)}
            {renderField("Ruolo", "role", <Shield className="h-4 w-4" />, "select", ROLE_OPTIONS)}
            {renderField("Società Sportiva", "sports_club", <Building2 className="h-4 w-4" />)}
            {renderField("Categoria", "category", <Tag className="h-4 w-4" />, "select", CATEGORY_OPTIONS)}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
