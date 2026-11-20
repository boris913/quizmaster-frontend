import { expect, test } from '@playwright/test';

test.describe('fumée', () => {
  test("la page d'accueil se charge", async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Kwizora/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Le quiz en direct qui fait participer toute la classe.' })
    ).toBeVisible();

    // Accès élève depuis l'accueil : le code saisi est transmis à /player/join.
    await page.getByLabel('Code de la session').fill('abc123');
    await page.getByRole('button', { name: 'Rejoindre', exact: true }).click();
    await expect(page).toHaveURL(/\/player\/join\?code=ABC123$/);
  });

  test('la page /player/join affiche le formulaire et valide côté client', async ({ page }) => {
    await page.goto('/player/join');
    await expect(page.getByRole('heading', { name: 'Rejoindre un quiz' })).toBeVisible();
    await expect(page.getByPlaceholder('Ex : ABC123')).toBeVisible();
    await expect(page.getByPlaceholder('SuperJoueur')).toBeVisible();

    // Soumission vide : la validation zod s'affiche sans appel au backend.
    await page.getByRole('button', { name: 'Rejoindre le quiz' }).click();
    await expect(page.getByText('Minimum 3 caractères')).toBeVisible();
  });
});
