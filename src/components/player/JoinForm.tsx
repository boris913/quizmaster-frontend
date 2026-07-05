'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

const joinSchema = z.object({
  password: z.string().length(6, 'Le mot de passe fait 6 caractères'),
  pseudo: z.string()
    .min(3, 'Minimum 3 caractères')
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Caractères autorisés : lettres, chiffres, - et _'),
});

type JoinFormData = z.infer<typeof joinSchema>;

interface JoinFormProps {
  onSubmit: (data: JoinFormData) => Promise<void>;
  isSubmitting?: boolean;
  error?: string;
}

export function JoinForm({ onSubmit, isSubmitting, error }: JoinFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<JoinFormData>({
    resolver: zodResolver(joinSchema),
  });

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
          {...register('password')}
          error={errors.password?.message}
        />
        <Input
          label="Votre pseudo"
          placeholder="SuperJoueur"
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