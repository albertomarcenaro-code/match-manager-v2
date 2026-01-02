import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

const Landing = () => {
  const navigate = useNavigate();
  const { signUp, signIn, enterAsGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGuestAccess = () => {
    enterAsGuest();
    navigate('/app');
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
          if (error.message.includes('already registered')) {
            toast.error('Email già registrata. Prova ad accedere.');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Registrazione completata! Ora puoi accedere.');
          navigate('/app');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login')) {
            toast.error('Email o password non corretti');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Accesso effettuato!');
          navigate('/app');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
      <Helmet>
        <title>Match Manager Live - Gestione Partite Calcio</title>
        <meta name="description" content="Gestisci le tue partite di calcio in tempo reale. Traccia gol, sostituzioni, cartellini e cronaca live." />
      </Helmet>
      <Header />
      
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Benvenuto</h2>
            <p className="text-muted-foreground">
              Gestisci le tue partite di calcio in tempo reale
            </p>
          </div>

          <Card className="border-2">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">Come vuoi continuare?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Guest Access Button */}
              <Button 
                variant="outline" 
                className="w-full h-14 text-lg gap-3"
                onClick={handleGuestAccess}
              >
                <UserCircle className="h-6 w-6" />
                Entra come Ospite
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    oppure
                  </span>
                </div>
              </div>

              {/* Auth Tabs */}
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login" className="gap-2">
                    <LogIn className="h-4 w-4" />
                    Accedi
                  </TabsTrigger>
                  <TabsTrigger value="register" className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Registrati
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="login" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="la-tua@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => handleAuth('login')}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Accesso...' : 'Accedi'}
                  </Button>
                </TabsContent>
                
                <TabsContent value="register" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="la-tua@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => handleAuth('register')}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Registrazione...' : 'Registrati'}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground">
            La modalità ospite non salva i dati in modo persistente
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Landing;
