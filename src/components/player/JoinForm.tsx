'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { NicknameRoulette } from './NicknameRoulette';
import {
  SESSION_CODE_MAX_LENGTH,
  SESSION_CODE_MIN_LENGTH,
  normalizeSessionCode,
} from '@/lib/sessionCode';
import {
  JOIN_ERROR_MESSAGES,
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
  NICKNAME_PATTERN,
  NICKNAME_PATTERN_MESSAGE,
  NicknameMode,
  fetchNicknameSuggestions,
} from '@/lib/nickname';

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
  // Même règle que le backend (JoinSessionDto) : accents et espaces simples autorisés.
  pseudo: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z
      .string()
      .min(NICKNAME_MIN_LENGTH, `Minimum ${NICKNAME_MIN_LENGTH} caractères`)
      .max(NICKNAME_MAX_LENGTH, `Maximum ${NICKNAME_MAX_LENGTH} caractères`)
      .regex(NICKNAME_PATTERN, NICKNAME_PATTERN_MESSAGE)
  ),
});

type JoinFormData = { password: string; pseudo: string };

interface JoinFormProps {
  onSubmit: (data: JoinFormData) => Promise<void>;
  isSubmitting?: boolean;
  error?: string;
}

/** Délai avant d'interroger le serveur sur le mode de pseudo, pendant la saisie du code. */
const SUGGESTIONS_DEBOUNCE_MS = 300;

type SessionLookup =
  | { status: 'idle' }
  | { status: 'ready'; mode: NicknameMode; suggestions: string[]; requestId: number }
  | { status: 'not-found' };

export function JoinForm({ onSubmit, isSubmitting, error }: JoinFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    watch,
    formState: { errors, isSubmitted },
  } = useForm<JoinFormData>({
    resolver: zodResolver(joinSchema),
    defaultValues: { password: '', pseudo: '' },
  });

  const [lookup, setLookup] = useState<SessionLookup>({ status: 'idle' });
  const [isLookingUp, setIsLookingUp] = useState(false);
  // Incrémenté pour redemander des propositions (nouvelle roulette) après un refus du serveur.
  const [reloadToken, setReloadToken] = useState(0);
  const requestIdRef = useRef(0);

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

  const code = normalizeSessionCode(watch('password'));
  const pseudo = watch('pseudo') ?? '';
  const isGenerated = lookup.status === 'ready' && lookup.mode === 'generated';

  // Mode de pseudo de la session (libre / généré) et propositions, d'après le code saisi.
  const lookedUpCodeRef = useRef('');
  useEffect(() => {
    const requestId = ++requestIdRef.current;
    // Nouveau code : on oublie la session précédente. Simple rechargement (même code) : on garde
    // la roulette affichée pendant la requête pour éviter un clignotement.
    if (code !== lookedUpCodeRef.current) {
      lookedUpCodeRef.current = code;
      setLookup({ status: 'idle' });
    }
    if (code.length < SESSION_CODE_MIN_LENGTH || code.length > SESSION_CODE_MAX_LENGTH) {
      setIsLookingUp(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsLookingUp(true);
      try {
        const result = await fetchNicknameSuggestions(code);
        if (requestId !== requestIdRef.current) return;
        setLookup({
          status: 'ready',
          mode: result.nickname_mode,
          suggestions: result.suggestions,
          requestId,
        });
      } catch (err: any) {
        if (requestId !== requestIdRef.current) return;
        // 404 : code inconnu ou session terminée. Autre erreur (réseau…) : on laisse la saisie
        // libre, le serveur tranchera au moment de rejoindre.
        setLookup(err?.response?.status === 404 ? { status: 'not-found' } : { status: 'idle' });
      } finally {
        if (requestId === requestIdRef.current) setIsLookingUp(false);
      }
    }, SUGGESTIONS_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [code, reloadToken]);

  // Nouveau mode « généré » ou nouvelle série de propositions : le pseudo précédent ne vaut plus.
  useEffect(() => {
    if (isGenerated) setValue('pseudo', '');
  }, [isGenerated, lookup, setValue]);

  // Refus du serveur en mode généré (pseudo pris entre-temps…) : nouvelle roulette.
  const previousErrorRef = useRef(error);
  useEffect(() => {
    if (error && error !== previousErrorRef.current && isGenerated) {
      setReloadToken((t) => t + 1);
    }
    previousErrorRef.current = error;
  }, [error, isGenerated]);

  const passwordField = register('password');
  const lookupError = lookup.status === 'not-found' ? JOIN_ERROR_MESSAGES.notFound : undefined;

  return (
    <Card className="p-6 w-full max-w-md space-y-4">
      <h2 className="text-xl font-bold text-center">Rejoindre un quiz</h2>
      <p className="text-sm text-ink-secondary text-center">
        Entrez le mot de passe de la session et votre pseudo
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1">
          <Input
            label="Mot de passe de la session"
            placeholder="Ex: ABC123"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="font-display font-semibold uppercase tracking-[0.12em] placeholder:font-sans placeholder:font-normal placeholder:normal-case placeholder:tracking-normal"
            {...passwordField}
            onChange={(e) => {
              // Normalisation à la saisie : majuscules, sans espaces.
              e.target.value = normalizeSessionCode(e.target.value);
              return passwordField.onChange(e);
            }}
            error={errors.password?.message ?? lookupError}
          />
          {isLookingUp && (
            <p role="status" className="text-caption text-ink-secondary">
              Recherche de la session…
            </p>
          )}
        </div>

        {lookup.status === 'ready' && lookup.mode === 'generated' ? (
          <NicknameRoulette
            // Nouvelle série de propositions : roulette remise à zéro.
            key={lookup.requestId}
            suggestions={lookup.suggestions}
            value={pseudo}
            onChange={(nickname) => setValue('pseudo', nickname, { shouldValidate: isSubmitted })}
            error={errors.pseudo ? 'Lance la roulette pour obtenir ton pseudo' : undefined}
            disabled={isSubmitting}
          />
        ) : (
          <Input
            label="Votre pseudo"
            placeholder="SuperJoueur"
            autoComplete="nickname"
            maxLength={NICKNAME_MAX_LENGTH}
            {...register('pseudo')}
            error={errors.pseudo?.message}
          />
        )}

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Rejoindre le quiz
        </Button>
      </form>
    </Card>
  );
}
