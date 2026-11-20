import type { Metadata } from 'next';
import Link from 'next/link';

/*
 * AVERTISSEMENT INTERNE — À FAIRE RELIRE PAR UN DPO AVANT TOUTE COMMUNICATION.
 *
 * Ce texte décrit le fonctionnement technique de Kwizora en langage clair. Ce n'est pas un
 * avis juridique : il ne permet pas, à lui seul, d'affirmer que l'outil est « conforme RGPD ».
 *
 * Points à compléter / vérifier par le mainteneur :
 * - HEBERGEMENT : hébergeur(s) et région(s) des données (Supabase + hébergement du front et de
 *   l'API). Ne rien inventer : laisser « à confirmer » tant que ce n'est pas vérifié.
 * - CONTACT : adresse de contact pour les demandes de suppression et l'exercice des droits.
 * - DERNIERE_MISE_A_JOUR : date de validation du texte.
 * - La durée de conservation (30 jours puis anonymisation) reprend boris913/quizmaster-backend#9 :
 *   elle n'est vraie que si la purge planifiée décrite dans cette issue est déployée et active.
 */
const HEBERGEMENT = 'À confirmer (hébergeur et région des données non encore renseignés).';
const CONTACT = '[adresse de contact à compléter]';
const DERNIERE_MISE_A_JOUR = '[date à compléter]';
const DUREE_CONSERVATION_JOURS = 30;

export const metadata: Metadata = {
  title: 'Confidentialité — Kwizora',
  description:
    'Quelles données Kwizora traite sur les élèves et les enseignants, combien de temps elles sont conservées et comment les supprimer.',
};

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

export default function ConfidentialitePage() {
  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <article className="max-w-3xl mx-auto space-y-10">
        <header className="space-y-3">
          <p className="text-small font-medium text-primary-700">
            <Link href="/" className="hover:underline">
              Kwizora
            </Link>
          </p>
          <h1 className="text-h1 text-ink">Confidentialité et données des élèves</h1>
          <p className="text-body text-ink-secondary">
            Cette page s&apos;adresse aux enseignants, aux établissements et aux délégués à la
            protection des données (DPO). Elle explique simplement quelles données Kwizora
            traite, pourquoi, combien de temps, et comment les faire supprimer.
          </p>
          <p className="text-small text-ink-secondary">
            Dernière mise à jour : {DERNIERE_MISE_A_JOUR}
          </p>
        </header>

        <section
          aria-labelledby="en-bref"
          className="rounded-lg border border-primary-200 bg-primary-50 p-6 space-y-3"
        >
          <h2 id="en-bref" className="text-card-title text-ink">
            En bref
          </h2>
          <ul className="list-disc pl-5 space-y-1.5 text-body text-ink">
            <li>Les élèves n&apos;ont pas de compte et ne donnent ni nom, ni e-mail, ni âge.</li>
            <li>
              Pour jouer, un élève saisit seulement le code de la session et un pseudo de son
              choix.
            </li>
            <li>
              Nous enregistrons le pseudo, les réponses et le temps de réponse, pour calculer le
              score et le classement.
            </li>
            <li>
              {DUREE_CONSERVATION_JOURS} jours après la fin d&apos;une session, les pseudos sont
              anonymisés.
            </li>
            <li>
              L&apos;enseignant peut supprimer une session et toutes ses données à tout moment.
            </li>
            <li>
              Aucune publicité, aucun outil de mesure d&apos;audience, aucun script tiers sur les
              pages élèves.
            </li>
          </ul>
        </section>

        <Section id="donnees-eleves" title="Données collectées sur les élèves">
          <p>Quand un élève rejoint une session, Kwizora enregistre :</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-ink">le pseudo</strong> qu&apos;il a choisi (nous
              recommandons de ne pas utiliser son nom complet) ;
            </li>
            <li>
              <strong className="text-ink">ses réponses</strong> à chaque question ;
            </li>
            <li>
              <strong className="text-ink">son temps de réponse</strong>, qui sert à calculer les
              points ;
            </li>
            <li>
              le <strong className="text-ink">score et le rang</strong> calculés à partir de ces
              réponses ;
            </li>
            <li>
              un <strong className="text-ink">identifiant technique de connexion</strong>,
              temporaire, nécessaire au fonctionnement en temps réel.
            </li>
          </ul>
          <p>
            Il n&apos;y a <strong className="text-ink">aucun compte élève</strong> : pas
            d&apos;inscription, pas de mot de passe, pas d&apos;adresse e-mail. Kwizora ne
            demande ni nom, ni prénom, ni date de naissance, ni classe, ni établissement.
            L&apos;application n&apos;enregistre rien sur l&apos;appareil de l&apos;élève (pas de
            cookie ni de stockage local côté élève).
          </p>
          <p>
            Ces données servent uniquement au déroulement du quiz : afficher le classement en
            direct et permettre à l&apos;enseignant de voir les résultats de sa session. Elles ne
            sont ni vendues, ni utilisées à des fins publicitaires.
          </p>
        </Section>

        <Section id="donnees-enseignants" title="Données des enseignants">
          <p>
            Pour créer des quiz et lancer des sessions, l&apos;enseignant crée un compte avec une
            adresse e-mail, un pseudo et un mot de passe (conservé uniquement sous forme hachée,
            jamais en clair). Les quiz et les sessions qu&apos;il crée sont rattachés à son compte.
            Sur son navigateur, un jeton de connexion est conservé dans le stockage local pour
            qu&apos;il reste connecté.
          </p>
        </Section>

        <Section id="conservation" title="Durée de conservation">
          <p>
            Les données des élèves sont conservées le temps de la session, puis{' '}
            <strong className="text-ink">
              {DUREE_CONSERVATION_JOURS} jours après la fin de la session
            </strong>
            . Passé ce délai, elles sont anonymisées automatiquement :
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              chaque pseudo est remplacé par un libellé neutre (« Joueur 1 », « Joueur 2 »…) ;
            </li>
            <li>l&apos;identifiant technique de connexion est effacé.</li>
          </ul>
          <p>
            Seules restent des statistiques sans lien avec une personne (par exemple le taux de
            bonnes réponses à une question), utiles à l&apos;enseignant pour améliorer ses quiz.
          </p>
        </Section>

        <Section id="suppression" title="Suppression à la demande">
          <p>
            L&apos;enseignant peut à tout moment supprimer une session depuis son tableau de bord
            (action « Supprimer la session et ses données »). La suppression est définitive : elle
            efface la session, la liste des participants et toutes leurs réponses. Seul
            l&apos;enseignant qui a créé la session peut la supprimer.
          </p>
          <p>
            Un élève ou ses responsables légaux qui souhaitent faire supprimer des données peuvent
            s&apos;adresser à l&apos;enseignant qui a organisé la session, ou nous écrire à
            l&apos;adresse indiquée ci-dessous.
          </p>
        </Section>

        <Section id="hebergement" title="Hébergement">
          <p>{HEBERGEMENT}</p>
          <p>
            Les polices de caractères sont servies directement par Kwizora : l&apos;affichage
            des pages élèves ne déclenche aucune requête vers un service tiers (polices,
            statistiques, réseaux sociaux ou publicité).
          </p>
        </Section>

        <Section id="droits" title="Vos droits">
          <p>
            Conformément au RGPD, chaque personne concernée peut demander l&apos;accès à ses
            données, leur rectification ou leur effacement, et s&apos;opposer à leur traitement.
            Comme les élèves n&apos;ont pas de compte, la demande doit permettre de retrouver la
            session concernée (date, enseignant, pseudo utilisé).
          </p>
          <p>
            Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une
            réclamation à la CNIL.
          </p>
        </Section>

        <Section id="contact" title="Contact">
          <p>
            Pour toute question ou demande concernant vos données : <strong className="text-ink">{CONTACT}</strong>
          </p>
        </Section>
      </article>
    </main>
  );
}
