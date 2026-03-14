import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { toast } from 'sonner';
import { UserCircle, LogIn, UserPlus } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(6, 'La password deve avere almeno 6 caratteri'),
});

const registerSchema = z.object({
  fullName: z.string().trim().min(1, 'Nome e Cognome obbligatorio').max(100, 'Massimo 100 caratteri'),
  email: z.string().email('Email non valida'),
  password: z.string().min(6, 'La password deve avere almeno 6 caratteri'),
  role: z.string().min(1, 'Seleziona un ruolo'),
  sportsClub: z.string().trim().min(1, 'Nome della Società obbligatorio').max(100, 'Massimo 100 caratteri'),
  category: z.string().min(1, 'Seleziona una categoria'),
  inviteCode: z.string().trim().min(1, 'Codice invito obbligatorio'),
});

const ROLES = [
  'Allenatore',
  'Dirigente / Responsabile Scout',
  'Genitore / Appassionato',
];

const CATEGORIES = [
  'Scuola Calcio (Piccoli Amici, Pulcini, Esordienti)',
  'Settore Giovanile (Giovanissimi, Allievi, Juniores)',
  'Prima Squadra (Dilettanti)',
  'Professionismo',
];

export default function Auth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { signIn, enterAsGuest } = useAuth();

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('');
  const [regSportsClub, setRegSportsClub] = useState('');
  const [regCategory, setRegCategory] = useState('');
  const [regInviteCode, setRegInviteCode] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  const isRegisterDisabled =
    isLoading ||
    !regFullName.trim() ||
    !regEmail.trim() ||
    !regPassword ||
    !regRole ||
    !regSportsClub.trim() ||
    !regCategory ||
    !regInviteCode.trim();

  const handleGuestAccess = async () => {
    setIsLoading(true);
    try {
      await enterAsGuest(queryClient);
      toast.success('Accesso come ospite effettuato');
      setTimeout(() => navigate('/dashboard'), 300);
    } catch {
      toast.error("Errore nell'accesso ospite");
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message === 'Invalid login credentials' ? 'Email o password errati' : error.message);
      } else {
        toast.success('Accesso effettuato!');
        navigate('/dashboard');
      }
    } catch {
      toast.error('Si è verificato un errore');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    const validation = registerSchema.safeParse({
      fullName: regFullName,
      email: regEmail,
      password: regPassword,
      role: regRole,
      sportsClub: regSportsClub,
      category: regCategory,
      inviteCode: regInviteCode,
    });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      // 1. Validate invitation code
      const { data: codeData, error: codeError } = await supabase
        .from('invitation_codes')
        .select('id, current_uses, max_uses, is_active')
        .eq('code', regInviteCode.trim())
        .maybeSingle();

      if (codeError || !codeData || !codeData.is_active || codeData.current_uses >= codeData.max_uses) {
        toast.error('Codice invito non valido o limite utilizzi raggiunto');
        setIsLoading(false);
        return;
      }

      // 2. Create account
      const redirectUrl = `${window.location.origin}/`;
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
        options: { emailRedirectTo: redirectUrl },
      });

      if (signUpError) {
        toast.error(signUpError.message);
        setIsLoading(false);
        return;
      }

      const createdUser = signUpData.user;
      if (!createdUser) {
        toast.error('Utente non creato correttamente. Riprova.');
        setIsLoading(false);
        return;
      }

      const profilePayload = {
        full_name: regFullName.trim(),
        role: regRole,
        sports_club: regSportsClub.trim(),
        category: regCategory,
      };

      // 3. Save profile fields linked to the newly created user
      const { data: updatedProfiles, error: updateProfileError } = await supabase
        .from('profiles')
        .update(profilePayload)
        .eq('user_id', createdUser.id)
        .select('id');

      if (updateProfileError) {
        toast.error('Errore nel salvataggio del profilo. Riprova.');
        setIsLoading(false);
        return;
      }

      if (!updatedProfiles || updatedProfiles.length === 0) {
        const { error: insertProfileError } = await supabase
          .from('profiles')
          .insert({ user_id: createdUser.id, ...profilePayload });

        if (insertProfileError) {
          toast.error('Errore nel salvataggio del profilo. Riprova.');
          setIsLoading(false);
          return;
        }
      }

      // 4. Increment invite code usage via secure function
      const { data: codeUsed, error: useCodeError } = await supabase.rpc('use_invitation_code', { p_code: regInviteCode.trim() });

      if (useCodeError || !codeUsed) {
        toast.error('Codice invito non valido o limite utilizzi raggiunto');
        setIsLoading(false);
        return;
      }

      toast.success('Registrazione completata! Controlla la tua email per confermare l\'account.');
      navigate('/dashboard');
    } catch {
      toast.error('Si è verificato un errore durante la registrazione');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
      <Helmet>
        <title>Match Manager Live - Gestione Partite Calcio</title>
      </Helmet>
      <Header />
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <Card className="border-2 shadow-xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold">Benvenuto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                className="w-full h-14 text-lg gap-3"
                onClick={handleGuestAccess}
                disabled={isLoading}
              >
                <UserCircle className="h-6 w-6 text-primary" />
                {isLoading ? 'Accesso...' : 'Entra come Ospite'}
              </Button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">oppure</span>
                </div>
              </div>

              <Tabs defaultValue="login">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login" className="gap-2"><LogIn className="h-4 w-4" /> Accedi</TabsTrigger>
                  <TabsTrigger value="register" className="gap-2"><UserPlus className="h-4 w-4" /> Registrati</TabsTrigger>
                </TabsList>

                {/* LOGIN TAB */}
                <TabsContent value="login" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" placeholder="la-tua@email.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
                  </div>
                  <Button className="w-full h-11" onClick={handleLogin} disabled={isLoading}>
                    Accedi
                  </Button>
                </TabsContent>

                {/* REGISTER TAB */}
                <TabsContent value="register" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Nome e Cognome *</Label>
                    <Input
                      placeholder="Mario Rossi"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      disabled={isLoading}
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input type="email" placeholder="la-tua@email.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} disabled={isLoading} />
                  </div>
                  <div className="space-y-2">
                    <Label>Password *</Label>
                    <Input type="password" placeholder="Minimo 6 caratteri" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} disabled={isLoading} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ruolo Principale *</Label>
                    <Select value={regRole} onValueChange={setRegRole} disabled={isLoading}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona il tuo ruolo" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nome della Società Sportiva *</Label>
                    <Input
                      placeholder="ASD Example FC"
                      value={regSportsClub}
                      onChange={(e) => setRegSportsClub(e.target.value)}
                      disabled={isLoading}
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria / Livello *</Label>
                    <Select value={regCategory} onValueChange={setRegCategory} disabled={isLoading}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona la categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Codice Invito *</Label>
                    <Input
                      placeholder="Inserisci il codice"
                      value={regInviteCode}
                      onChange={(e) => setRegInviteCode(e.target.value)}
                      disabled={isLoading}
                      maxLength={50}
                    />
                  </div>
                  <Button className="w-full h-11" onClick={handleRegister} disabled={isRegisterDisabled}>
                    Registrati
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
