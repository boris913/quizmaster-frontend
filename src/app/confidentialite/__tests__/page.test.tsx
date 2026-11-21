import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConfidentialitePage from '@/app/confidentialite/page';
import { PrivacyNotice } from '@/components/player/PrivacyNotice';
import { SiteFooter } from '@/components/layout/SiteFooter';

describe('page /confidentialite', () => {
  it('affiche le titre et les sections attendues', async () => {
    render(await ConfidentialitePage());
    expect(
      screen.getByRole('heading', { level: 1, name: 'Confidentialité et données des élèves' })
    ).toBeInTheDocument();
    for (const name of [
      'En bref',
      'Données collectées sur les élèves',
      'Données des enseignants',
      'Durée de conservation',
      'Suppression à la demande',
      'Hébergement',
      'Vos droits',
      'Contact',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
  });

  it('décrit les données élèves, l’absence de compte et la conservation de 30 jours', async () => {
    const { container } = render(await ConfidentialitePage());
    const text = container.textContent ?? '';
    expect(text).toMatch(/pseudo/);
    expect(text).toMatch(/réponses/);
    expect(text).toMatch(/temps de réponse/);
    expect(text).toMatch(/aucun compte élève/);
    expect(text).toMatch(/30 jours après la fin de la session/);
    expect(text).toMatch(/anonymisées/);
  });

  it("garde l'hébergement et le contact en placeholders (rien d'inventé)", async () => {
    render(await ConfidentialitePage());
    const hebergement = screen.getByRole('region', { name: 'Hébergement' });
    expect(hebergement).toHaveTextContent('À confirmer');
    expect(screen.getByRole('region', { name: 'Contact' })).toHaveTextContent('à compléter');
  });
});

describe('liens vers /confidentialite', () => {
  it('la mention du join élève contient le texte demandé et le lien', async () => {
    render(<PrivacyNotice />);
    expect(
      screen.getByText(/Aucun compte, aucune donnée personnelle demandée\. N.utilise pas ton nom complet\./)
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /confidentialité/i })).toHaveAttribute(
      'href',
      '/confidentialite'
    );
  });

  it('le pied de page contient le lien Confidentialité', async () => {
    render(<SiteFooter />);
    expect(screen.getByRole('link', { name: 'Confidentialité' })).toHaveAttribute(
      'href',
      '/confidentialite'
    );
  });
});
