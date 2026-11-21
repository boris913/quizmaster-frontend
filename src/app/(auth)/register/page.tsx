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

type RegisterForm = { pseudo: string; password: string; confirmPassword: string };

export default function RegisterPage() {
  const t = useTranslations('auth');
  const registerUser = useAuthStore((state) => state.register);
  const router = useRouter();
  const [error, setError] = useState('');
  // Conserve la page de retour (`?next=`) entre connexion et inscription.
  const [returnQuery, setReturnQuery] = useState('');
  useEffect(() => {
    const next = safeRedirectPath(new URLSearchParams(window.location.search).get(REDIRECT_PARAM));
    if (next) setReturnQuery(`?${REDIRECT_PARAM}=${encodeURIComponent(next)}`);
  }, []);

  const registerSchema = useMemo(
    () =>
      z
        .object({
          pseudo: z
            .string()
            .min(3, t('errors.minChars', { count: 3 }))
            .max(50, t('errors.maxChars', { count: 50 }))
            .regex(/^[a-zA-Z0-9_-]+$/, t('errors.pseudoPattern')),
          password: z.string().min(6, t('errors.minChars', { count: 6 })),
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: t('errors.passwordMismatch'),
          path: ['confirmPassword'],
        }),
    [t]
  );

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      await registerUser(data.pseudo, data.password);
      // Retour sur la page d'origine (`?next=/…`, chemin interne uniquement).
      router.push(redirectAfterLogin(window.location.search));
    } catch (err: any) {
      setError(err.response?.data?.message || t('errors.register'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-h2 text-center">{t('register.title')}</h1>
        <p className="text-ink-secondary text-center mt-1">{t('register.subtitle')}</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          <Input
            label={t('fields.pseudo')}
            placeholder={t('fields.uniquePseudoPlaceholder')}
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
          <Input
            label={t('fields.confirmPassword')}
            type="password"
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          {error && <p className="text-small text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {t('register.submit')}
          </Button>
        </form>
        <p className="text-small text-center mt-4">
          {t('register.hasAccount')}{' '}
          <Link href={`/login${returnQuery}`} className="text-primary hover:underline">
            {t('register.toLogin')}
          </Link>
        </p>
      </Card>
    </div>
  );
}
