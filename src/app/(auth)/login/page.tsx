'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/authStore';
import { redirectAfterLogin, REDIRECT_PARAM, safeRedirectPath } from '@/lib/quizSharing';

type LoginForm = { pseudo: string; password: string };

export default function LoginPage() {
  const t = useTranslations('auth');
  const login = useAuthStore((state) => state.login);
  const router = useRouter();
  const [error, setError] = useState('');
  // Conserve la page de retour (`?next=`) entre connexion et inscription.
  const [returnQuery, setReturnQuery] = useState('');
  useEffect(() => {
    const next = safeRedirectPath(new URLSearchParams(window.location.search).get(REDIRECT_PARAM));
    if (next) setReturnQuery(`?${REDIRECT_PARAM}=${encodeURIComponent(next)}`);
  }, []);

  const loginSchema = useMemo(
    () =>
      z.object({
        pseudo: z.string().min(1, t('errors.pseudoRequired')),
        password: z.string().min(1, t('errors.passwordRequired')),
      }),
    [t]
  );

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.pseudo, data.password);
      // Retour sur la page d'origine (`?next=/…`, chemin interne uniquement).
      router.push(redirectAfterLogin(window.location.search));
    } catch (err: any) {
      setError(err.response?.data?.message || t('errors.login'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-h2 text-center">{t('login.title')}</h1>
        <p className="text-ink-secondary text-center mt-1">{t('login.subtitle')}</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          <Input
            label={t('fields.pseudo')}
            placeholder={t('fields.pseudoPlaceholder')}
            error={errors.pseudo?.message}
            {...register('pseudo')}
          />
          <Input
            label={t('fields.password')}
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />
          {error && <p className="text-small text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {t('login.submit')}
          </Button>
        </form>
        <p className="text-small text-center mt-4">
          {t('login.noAccount')}{' '}
          <Link href={`/register${returnQuery}`} className="text-primary hover:underline">
            {t('login.toRegister')}
          </Link>
        </p>
      </Card>
    </div>
  );
}
