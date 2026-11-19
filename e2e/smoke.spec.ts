import { expect, test } from '@playwright/test';

test.describe('fumée', () => {
  test("la page d'accueil se charge", async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/QuizMaster/);
    await expect(page.getByRole('heading', { level: 1, name: 'QuizMaster' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Rejoindre un quiz' })).toHaveAttribute(
      'href',
      '/player/join'
    );
  });

  test('la page /player/join affiche le formulaire et valide côté client', async ({ page }) => {
    await page.goto('/player/join');
    await expect(page.getByRole('heading', { name: 'Rejoindre un quiz' })).toBeVisible();
    await expect(page.getByPlaceholder('Ex: ABC123')).toBeVisible();
    await expect(page.getByPlaceholder('SuperJoueur')).toBeVisible();

    // Soumission vide : la validation zod s'affiche sans appel au backend.
    await page.getByRole('button', { name: 'Rejoindre le quiz' }).click();
    await expect(page.getByText('Minimum 3 caractères')).toBeVisible();
  });
});
