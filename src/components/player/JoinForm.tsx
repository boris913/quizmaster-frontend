'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import {
  SESSION_CODE_MAX_LENGTH,
  SESSION_CODE_MIN_LENGTH,
  normalizeSessionCode,
} from '@/lib/sessionCode';

const joinSchema = z.object({
  // Le code est normalisé (majuscules, sans espaces) avant validation. On ne fige pas sa longueur
  // exacte : c'est le backend qui fait foi sur le format.
  password: z.preprocess(
    normalizeSessionCode,
    z
      .string()
      .min(1, 'Entrez le code de la session')
      .min(SESSION_CODE_MIN_LENGTH, 'Code de session trop court')
      .max(SESSION_CODE_MAX_LENGTH, 'Code de session trop long')
      .regex(/^[A-Z0-9]+$/, 'Le code ne contient que des lettres et des chiffres')
  ),
  pseudo: z.string()
    .min(3, 'Minimum 3 caractères')
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Caractères autorisés : lettres, chiffres, - et _'),
});

type JoinFormData = { password: string; pseudo: string };

interface JoinFormProps {
  onSubmit: (data: JoinFormData) => Promise<void>;
  isSubmitting?: boolean;
  error?: string;
}

export function JoinForm({ onSubmit, isSubmitting, error }: JoinFormProps) {
  const { register, handleSubmit, setValue, setFocus, formState: { errors } } = useForm<JoinFormData>({
    resolver: zodResolver(joinSchema),
    defaultValues: { password: '', pseudo: '' },
  });

  // Lien direct / QR code (`/player/join?code=XXXXXX`) : code pré-rempli, focus sur le pseudo.
  // Lecture de window.location après le montage plutôt que useSearchParams() : la page reste
  // prérendue statiquement (useSearchParams sans <Suspense> la ferait basculer en rendu client).
  useEffect(() => {
    const codeFromUrl = normalizeSessionCode(new URLSearchParams(window.location.search).get('code'));
    if (codeFromUrl) {
      setValue('password', codeFromUrl);
      setFocus('pseudo');
    }
  }, [setValue, setFocus]);

  const passwordField = register('password');

  return (
    <Card className="p-6 w-full max-w-md space-y-4">
      <h2 className="text-xl font-bold text-center">Rejoindre un quiz</h2>
      <p className="text-sm text-ink-secondary text-center">
        Entrez le mot de passe de la session et votre pseudo
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Mot de passe de la session"
          placeholder="Ex: ABC123"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="font-mono uppercase tracking-widest"
          {...passwordField}
          onChange={(e) => {
            // Normalisation à la saisie : majuscules, sans espaces.
            e.target.value = normalizeSessionCode(e.target.value);
            return passwordField.onChange(e);
          }}
          error={errors.password?.message}
        />
        <Input
          label="Votre pseudo"
          placeholder="SuperJoueur"
          autoComplete="nickname"
          {...register('pseudo')}
          error={errors.pseudo?.message}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Rejoindre le quiz
        </Button>
      </form>
    </Card>
  );
}
