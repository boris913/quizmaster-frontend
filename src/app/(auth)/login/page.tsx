'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/authStore'; // ✅ utiliser le store
import { redirectAfterLogin, REDIRECT_PARAM, safeRedirectPath } from '@/lib/quizSharing';

const loginSchema = z.object({
  pseudo: z.string().min(1, 'Pseudo requis'),
  password: z.string().min(1, 'Mot de passe requis'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const login = useAuthStore((state) => state.login);
  const router = useRouter();
  const [error, setError] = useState('');
  // Conserve la page de retour (`?next=`) entre connexion et inscription.
  const [returnQuery, setReturnQuery] = useState('');
  useEffect(() => {
    const next = safeRedirectPath(new URLSearchParams(window.location.search).get(REDIRECT_PARAM));
    if (next) setReturnQuery(`?${REDIRECT_PARAM}=${encodeURIComponent(next)}`);
  }, []);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.pseudo, data.password);
      // Retour sur la page d'origine (`?next=/…`, chemin interne uniquement).
      router.push(redirectAfterLogin(window.location.search));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur de connexion');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-center">Connexion</h1>
        <p className="text-ink-secondary text-center mt-1">Connectez-vous pour gérer vos quiz</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          <Input label="Pseudo" placeholder="Votre pseudo" {...register('pseudo')} />
          <Input label="Mot de passe" type="password" placeholder="••••••••" {...register('password')} />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            Se connecter
          </Button>
        </form>
        <p className="text-sm text-center mt-4">
          Pas encore de compte ?{' '}
          <Link href={`/register${returnQuery}`} className="text-primary hover:underline">
            S&apos;inscrire
          </Link>
        </p>
      </Card>
    </div>
  );
}