'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
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
  JoinErrorMessages,
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
  NICKNAME_PATTERN,
  NicknameMode,
  fetchNicknameSuggestions,
} from '@/lib/nickname';

type Translator = ReturnType<typeof useTranslations<'join'>>;

function buildJoinSchema(t: Translator) {
  return z.object({
    // Le code est normalisé (majuscules, sans espaces) avant validation. On ne fige pas sa longueur
    // exacte : c'est le backend qui fait foi sur le format.
    password: z.preprocess(
      normalizeSessionCode,
      z
        .string()
        .min(1, t('errors.codeRequired'))
        .min(SESSION_CODE_MIN_LENGTH, t('errors.codeTooShort'))
        .max(SESSION_CODE_MAX_LENGTH, t('errors.codeTooLong'))
        .regex(/^[A-Z0-9]+$/, t('errors.codePattern'))
    ),
    // Même règle que le backend (JoinSessionDto) : accents et espaces simples autorisés.
    pseudo: z.preprocess(
      (value) => (typeof value === 'string' ? value.trim() : value),
      z
        .string()
        .min(NICKNAME_MIN_LENGTH, t('errors.minChars', { count: NICKNAME_MIN_LENGTH }))
        .max(NICKNAME_MAX_LENGTH, t('errors.maxChars', { count: NICKNAME_MAX_LENGTH }))
        .regex(NICKNAME_PATTERN, t('errors.nicknamePattern'))
    ),
  });
}

/** Messages d'échec du join, traduits. */
export function useJoinErrorMessages(): JoinErrorMessages {
  const t = useTranslations('join.errors');
  return useMemo(
    () => ({
      kicked: t('kicked'),
      notFound: t('notFound'),
      invalidNickname: t('invalidNickname'),
      nicknameTaken: t('nicknameTaken'),
      network: t('network'),
      generic: t('generic'),
    }),
    [t]
  );
}

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
  const t = useTranslations('join');
  const joinSchema = useMemo(() => buildJoinSchema(t), [t]);
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
  const lookupError = lookup.status === 'not-found' ? t('errors.notFound') : undefined;

  return (
    <Card className="p-6 w-full max-w-md space-y-4">
      <h1 className="text-h3 text-center">{t('title')}</h1>
      <p className="text-small text-ink-secondary text-center">{t('subtitle')}</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1">
          <Input
            label={t('codeLabel')}
            placeholder={t('codePlaceholder')}
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
              {t('lookingUp')}
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
            error={errors.pseudo ? t('errors.spinFirst') : undefined}
            disabled={isSubmitting}
          />
        ) : (
          <Input
            label={t('pseudoLabel')}
            placeholder={t('pseudoPlaceholder')}
            autoComplete="nickname"
            maxLength={NICKNAME_MAX_LENGTH}
            {...register('pseudo')}
            error={errors.pseudo?.message}
          />
        )}

        {error && (
          <p role="alert" className="text-small text-danger">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          {t('submit')}
        </Button>
      </form>
    </Card>
  );
}
