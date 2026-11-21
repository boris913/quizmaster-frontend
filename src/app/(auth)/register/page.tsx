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

const registerSchema = z.object({
  pseudo: z.string()
    .min(3, 'Minimum 3 caractères')
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Caractères autorisés : lettres, chiffres, - et _'),
  password: z.string().min(6, 'Minimum 6 caractères'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const registerUser = useAuthStore((state) => state.register);
  const router = useRouter();
  const [error, setError] = useState('');
  // Conserve la page de retour (`?next=`) entre connexion et inscription.
  const [returnQuery, setReturnQuery] = useState('');
  useEffect(() => {
    const next = safeRedirectPath(new URLSearchParams(window.location.search).get(REDIRECT_PARAM));
    if (next) setReturnQuery(`?${REDIRECT_PARAM}=${encodeURIComponent(next)}`);
  }, []);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      await registerUser(data.pseudo, data.password);
      // Retour sur la page d'origine (`?next=/…`, chemin interne uniquement).
      router.push(redirectAfterLogin(window.location.search));
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur d'inscription");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-center">Créer un compte</h1>
        <p className="text-ink-secondary text-center mt-1">Devenez créateur de quiz</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          <Input label="Pseudo" placeholder="Votre pseudo unique" {...register('pseudo')} />
          <Input label="Mot de passe" type="password" placeholder="••••••••" {...register('password')} />
          <Input label="Confirmer le mot de passe" type="password" placeholder="••••••••" {...register('confirmPassword')} />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            S&apos;inscrire
          </Button>
        </form>
        <p className="text-sm text-center mt-4">
          Déjà un compte ?{' '}
          <Link href={`/login${returnQuery}`} className="text-primary hover:underline">
            Se connecter
          </Link>
        </p>
      </Card>
    </div>
  );
}