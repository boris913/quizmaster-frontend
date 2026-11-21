import { expect, test } from '@playwright/test';

// Lien direct / QR code : /player/join?code=XXXXXX. Aucun backend nécessaire.
test.describe('rejoindre via le lien direct', () => {
  test('?code= pré-remplit le code (normalisé) et place le focus sur le pseudo', async ({ page }) => {
    await page.goto('/player/join?code=k7m2p9');

    const code = page.getByLabel('Code de la session');
    const pseudo = page.getByLabel('Ton pseudo');
    await expect(code).toHaveValue('K7M2P9');
    await expect(pseudo).toBeFocused();
  });

  test('envoie le code pré-rempli au backend lors de la soumission', async ({ page }) => {
    // On intercepte l'appel API pour vérifier le contenu sans backend.
    let body: { password?: string; pseudo?: string } | null = null;
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
    await page.route('**/api/sessions/join', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: cors });
        return;
      }
      body = route.request().postDataJSON();
      await route.fulfill({
        status: 404,
        headers: cors,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Session introuvable' }),
      });
    });

    await page.goto('/player/join?code=%20ab%20c123');
    await expect(page.getByLabel('Code de la session')).toHaveValue('ABC123');
    await expect(page.getByLabel('Ton pseudo')).toBeFocused();

    await page.keyboard.type('Alice_42');
    await page.keyboard.press('Enter');

    await expect(page.getByText('Session introuvable')).toBeVisible();
    expect(body).toEqual({ password: 'ABC123', pseudo: 'Alice_42' });
  });

  test('mobile : le formulaire tient dans la largeur', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/player/join?code=ABC123');
    await expect(page.getByLabel('Ton pseudo')).toBeFocused();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);
  });
});
