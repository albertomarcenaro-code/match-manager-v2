import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { toast } from 'sonner';
import { UserCircle, LogIn, UserPlus } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(6, 'La password deve avere almeno 6 caratteri'),
});

export default function Landing() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { signUp, signIn, enterAsGuest } = useAuth(); 
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGuestAccess = async () => {
    setIsLoading(true);
    try {
      // 1. Eseguiamo l'accesso ospite
      await enterAsGuest(queryClient); 
      
      // 2. Messaggio di conferma
      toast.success('Entrando come ospite...');
      
      // 3. Aspettiamo un istante per permettere al Context di aggiornarsi
      // Questo evita il rimbalzo verso la home (404/Redirect)
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
      
    } catch (error) {
      toast.error("Errore nell'accesso ospite");
      setIsLoading(false);
    }
  };

  const handleAuth = async (mode: 'login' | 'register') => {
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'register') {
        const { error } = await signUp(email, password);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Registrazione completata!');
          navigate('/dashboard'); 
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message === 'Invalid login credentials' ? 'Email o password errati' : error.message);
        } else {
          toast.success('Accesso effettuato!');
          navigate('/dashboard'); 
        }
      }
    } catch (err: any) {
      toast.error("Si è verificato un errore");
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
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Benvenuto</h2>
            <p className="text-muted-foreground">Gestisci le tue partite in tempo reale</p>
          </div>

          <Card className="border-2 shadow-xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">Scegli come entrare</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                variant="outline" 
                className="w-full h-14 text-lg gap-3 border-primary/20 hover:bg-primary/5"
                onClick={handleGuestAccess}
                disabled={isLoading}
              >
                <UserCircle className="h-6 w-6 text-primary" />
                {isLoading ? 'Caricamento...' : 'Entra come Ospite'}
              </Button>
              
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">oppure</span>
                </div>
              </div>

              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login" className="gap-2">Accedi</TabsTrigger>
                  <TabsTrigger value="register" className="gap-2">Registrati</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" type="email" placeholder="email@esempio.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
                  </div>
                  <Button className="w-full" onClick={() => handleAuth('login')} disabled={isLoading}>
                    {isLoading ? 'Accesso...' : 'Accedi'}
                  </Button>
                </TabsContent>
                
                <TabsContent value="register" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input id="register-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input id="register-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
                  </div>
                  <Button className="w-full" onClick={() => handleAuth('register')} disabled={isLoading}>
                    {isLoading ? 'Registrazione...' : 'Registrati'}
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
