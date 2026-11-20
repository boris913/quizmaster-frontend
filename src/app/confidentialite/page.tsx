import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

/*
 * AVERTISSEMENT INTERNE — À FAIRE RELIRE PAR UN DPO AVANT TOUTE COMMUNICATION.
 *
 * Ce texte décrit le fonctionnement technique de Kwizora en langage clair. Ce n'est pas un
 * avis juridique : il ne permet pas, à lui seul, d'affirmer que l'outil est « conforme RGPD ».
 * Le texte vit dans messages/fr.json et messages/en.json (espace `privacy`) ; la version
 * française fait foi.
 *
 * Points à compléter / vérifier par le mainteneur (clés privacy.hosting, privacy.contact,
 * privacy.lastUpdate) :
 * - HEBERGEMENT : hébergeur(s) et région(s) des données (Supabase + hébergement du front et de
 *   l'API). Ne rien inventer : laisser « à confirmer » tant que ce n'est pas vérifié.
 * - CONTACT : adresse de contact pour les demandes de suppression et l'exercice des droits.
 * - DERNIERE_MISE_A_JOUR : date de validation du texte.
 * - La durée de conservation (30 jours puis anonymisation) reprend boris913/quizmaster-backend#9 :
 *   elle n'est vraie que si la purge planifiée décrite dans cette issue est déployée et active.
 * - Préférences d'affichage : le thème (localStorage, next-themes) et la langue (cookie
 *   NEXT_LOCALE) ne sont écrits que si l'utilisateur les change lui-même.
 */
const DUREE_CONSERVATION_JOURS = 30;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('privacy');
  return { title: t('metaTitle'), description: t('metaDescription') };
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="text-h3 text-ink">
        {title}
      </h2>
      <div className="space-y-3 text-body text-ink-secondary">{children}</div>
    </section>
  );
}

const strong = (chunks: React.ReactNode) => <strong className="text-ink">{chunks}</strong>;

export default async function ConfidentialitePage() {
  const t = await getTranslations('privacy');
  const days = DUREE_CONSERVATION_JOURS;
  const frenchPrevails = t('frenchPrevails');

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <article className="max-w-3xl mx-auto space-y-10">
        <header className="space-y-3">
          <p className="text-small font-medium text-primary-700">
            <Link href="/" className="hover:underline">
              Kwizora
            </Link>
          </p>
          <h1 className="text-h1 text-ink">{t('title')}</h1>
          <p className="text-body text-ink-secondary">{t('intro')}</p>
          <p className="text-small text-ink-secondary">{t('updated', { date: t('lastUpdate') })}</p>
          {frenchPrevails && <p className="text-small text-ink-tertiary">{frenchPrevails}</p>}
        </header>

        <section
          aria-labelledby="en-bref"
          className="rounded-lg border border-primary-200 bg-primary-50 p-6 space-y-3"
        >
          <h2 id="en-bref" className="text-card-title text-ink">
            {t('summary.title')}
          </h2>
          <ul className="list-disc pl-5 space-y-1.5 text-body text-ink">
            <li>{t('summary.noAccount')}</li>
            <li>{t('summary.codeOnly')}</li>
            <li>{t('summary.stored')}</li>
            <li>{t('summary.anonymised', { days })}</li>
            <li>{t('summary.deletion')}</li>
            <li>{t('summary.noTrackers')}</li>
          </ul>
        </section>

        <Section id="donnees-eleves" title={t('students.title')}>
          <p>{t('students.lead')}</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>{t.rich('students.pseudo', { b: strong })}</li>
            <li>{t.rich('students.answers', { b: strong })}</li>
            <li>{t.rich('students.time', { b: strong })}</li>
            <li>{t.rich('students.score', { b: strong })}</li>
            <li>{t.rich('students.connection', { b: strong })}</li>
          </ul>
          <p>{t.rich('students.noAccount', { b: strong })}</p>
          <p>{t('students.device')}</p>
          <p>{t('students.purpose')}</p>
        </Section>

        <Section id="donnees-enseignants" title={t('teachers.title')}>
          <p>{t('teachers.text')}</p>
        </Section>

        <Section id="conservation" title={t('retention.title')}>
          <p>{t.rich('retention.text', { days, b: strong })}</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>{t('retention.pseudo')}</li>
            <li>{t('retention.connection')}</li>
          </ul>
          <p>{t('retention.stats')}</p>
        </Section>

        <Section id="suppression" title={t('deletion.title')}>
          <p>{t('deletion.teacher')}</p>
          <p>{t('deletion.student')}</p>
        </Section>

        <Section id="hebergement" title={t('hostingSection.title')}>
          <p>{t('hosting')}</p>
          <p>{t('hostingSection.fonts')}</p>
        </Section>

        <Section id="droits" title={t('rights.title')}>
          <p>{t('rights.text')}</p>
          <p>{t('rights.cnil')}</p>
        </Section>

        <Section id="contact" title={t('contactSection.title')}>
          <p>{t.rich('contactSection.text', { contact: t('contact'), b: strong })}</p>
        </Section>
      </article>
    </main>
  );
}
