'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { BarChart3, EyeOff, FileUp, QrCode, ShieldCheck, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { answerTone } from '@/lib/answerTone';
import { normalizeSessionCode } from '@/lib/sessionCode';
import { cn } from '@/lib/utils';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-content items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Kwizora, accueil">
          <Logo size={26} withWordmark />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Se connecter</Link>
          </Button>
          <Button size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/register">Créer un compte</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-content items-center gap-12 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
          <div>
            <h1 className="text-[2.5rem] font-bold leading-[1.05] tracking-[-0.03em] text-ink text-balance sm:text-display lg:text-[4rem]">
              Le quiz en direct qui fait participer toute la classe.
            </h1>
            <p className="mt-5 max-w-xl text-body text-ink-secondary sm:text-[1.125rem]">
              Vos élèves répondent depuis leur téléphone, sans créer de compte. Vous voyez, question par
              question, ce qui est compris et ce qui reste à revoir.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/register">Créer mon premier quiz</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">J&apos;ai déjà un compte</Link>
              </Button>
            </div>

            <JoinByCode />
          </div>

          <LivePreview />
        </section>

        <section className="border-t border-borderc bg-surface">
          <div className="mx-auto max-w-content px-4 py-16 sm:px-6">
            <h2 className="max-w-2xl text-h2 text-ink sm:text-h1">Une séance en trois temps</h2>
            <ol className="mt-10 grid gap-10 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="font-display text-h2 font-bold leading-none text-primary tabular-nums">{i + 1}</span>
                  <div>
                    <h3 className="text-card-title text-ink">{step.title}</h3>
                    <p className="mt-1.5 text-small text-ink-secondary">{step.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-content px-4 py-16 sm:px-6">
          <h2 className="max-w-2xl text-h2 text-ink sm:text-h1">Pensé pour la salle de classe</h2>
          <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <f.icon className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden />
                <h3 className="mt-3 text-body font-semibold text-ink">{f.title}</h3>
                <p className="mt-1 text-small text-ink-secondary">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

const STEPS = [
  {
    title: 'Préparez',
    desc: 'Écrivez vos questions ou importez-les depuis un fichier. Choix unique ou multiple, minuteur par question.',
  },
  {
    title: 'Projetez',
    desc: 'Affichez le code et le QR code au tableau. Les élèves rejoignent en quelques secondes depuis leur téléphone.',
  },
  {
    title: 'Analysez',
    desc: 'Après chaque question, la répartition des réponses. À la fin, un rapport pour repérer les notions à retravailler.',
  },
];

const FEATURES = [
  {
    icon: Smartphone,
    title: 'Aucun compte pour les élèves',
    desc: 'Un code, un pseudo, et c’est parti. Rien à installer.',
  },
  {
    icon: QrCode,
    title: 'Écran de projection',
    desc: 'Une vue plein écran lisible du fond de la salle, avec code, QR code et minuteur.',
  },
  {
    icon: BarChart3,
    title: 'Résultats question par question',
    desc: 'Repérez immédiatement les erreurs fréquentes et revenez dessus à chaud.',
  },
  {
    icon: EyeOff,
    title: 'Classement masqué si besoin',
    desc: 'Pour une évaluation formative sans compétition, n’affichez que le score de la classe.',
  },
  {
    icon: ShieldCheck,
    title: 'Pseudonymes et modération',
    desc: 'Pseudos filtrés ou générés, exclusion en un clic, données des élèves anonymisées.',
  },
  {
    icon: FileUp,
    title: 'Import de questions',
    desc: 'Réutilisez vos questions existantes au lieu de tout ressaisir.',
  },
];

function JoinByCode() {
  const router = useRouter();
  const [code, setCode] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const normalized = normalizeSessionCode(code);
    router.push(normalized ? `/player/join?code=${encodeURIComponent(normalized)}` : '/player/join');
  };

  return (
    <form
      onSubmit={onSubmit}
      className="mt-10 max-w-md rounded-lg border border-borderc bg-surface p-4 shadow-xs"
      aria-labelledby="join-title"
    >
      <p id="join-title" className="text-small font-semibold text-ink">
        Vous êtes élève ?
      </p>
      <p className="text-small text-ink-secondary">Entrez le code affiché au tableau.</p>
      <div className="mt-3 flex gap-2">
        <label htmlFor="home-join-code" className="sr-only">
          Code de la session
        </label>
        <input
          id="home-join-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="min-h-[44px] w-full min-w-0 flex-1 rounded-md border border-borderc-strong bg-surface px-3 font-display text-body font-semibold uppercase tracking-[0.12em] text-ink placeholder:font-sans placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-tertiary focus:border-primary focus:shadow-glow focus:outline-none"
        />
        <Button type="submit" variant="secondary">
          Rejoindre
        </Button>
      </div>
    </form>
  );
}

const PREVIEW = {
  question: 'Quelle fraction est égale à 2/4 ?',
  options: [
    { id: 'A', text: '1/3', pct: 8 },
    { id: 'B', text: '1/2', pct: 71, correct: true },
    { id: 'C', text: '2/3', pct: 13 },
    { id: 'D', text: '3/4', pct: 8 },
  ],
};

/**
 * Aperçu de l'écran de projection après une question : le seul moment animé
 * de la page (les barres se remplissent une fois). Toujours en thème sombre,
 * comme la vraie projection.
 */
function LivePreview() {
  const reduce = useReducedMotion();
  return (
    <figure className="dark relative" aria-label="Aperçu de l'écran de projection Kwizora">
      <div className="rounded-xl border border-borderc bg-background p-5 text-ink shadow-md sm:p-7">
        <div className="flex items-center justify-between text-small text-ink-tertiary">
          <span className="tabular-nums">Question 3 / 10</span>
          <span className="tabular-nums">24 / 26 réponses</span>
        </div>
        <p className="mt-4 font-display text-h2 font-bold leading-tight text-ink sm:text-h1">{PREVIEW.question}</p>

        <ul className="mt-6 space-y-3">
          {PREVIEW.options.map((opt, i) => {
            const tone = answerTone(opt.id, i);
            return (
              <li key={opt.id}>
                <div className="flex items-center justify-between gap-3 text-body">
                  <span className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-md font-display text-small font-bold text-white',
                        tone.bg
                      )}
                    >
                      {opt.id}
                    </span>
                    <span className="font-medium">{opt.text}</span>
                    {opt.correct && (
                      <span className="rounded-sm bg-success-solid px-1.5 py-0.5 text-caption font-medium text-white">
                        Bonne réponse
                      </span>
                    )}
                  </span>
                  <span className="font-display font-semibold tabular-nums">{opt.pct} %</span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-ink/10">
                  <motion.div
                    className={cn('h-full rounded-full', opt.correct ? 'bg-success-solid' : 'bg-ink-tertiary/50')}
                    initial={reduce ? false : { width: 0 }}
                    animate={{ width: `${opt.pct}%` }}
                    transition={{ duration: 0.9, delay: 0.25 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    style={reduce ? { width: `${opt.pct}%` } : undefined}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <figcaption className="sr-only">
        Exemple : 71 % des élèves ont choisi la bonne réponse, 1/2.
      </figcaption>
    </figure>
  );
}
