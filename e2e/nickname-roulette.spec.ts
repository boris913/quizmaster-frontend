import { expect, test } from '@playwright/test';

// Mode « pseudos générés » : la roulette est alimentée par GET /api/sessions/join/nicknames.
// Les appels API sont interceptés : aucun backend nécessaire.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

test('roulette : 3 tirages au clavier, puis envoi du dernier pseudo tiré', async ({ page }) => {
  await page.route('**/api/sessions/join/nicknames**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: cors,
      contentType: 'application/json',
      body: JSON.stringify({
        nickname_mode: 'generated',
        suggestions: ['Loutre Curieuse', 'Hibou Malin', 'Panda Rapide'],
      }),
    });
  });

  let body: { password?: string; pseudo?: string } | null = null;
  await page.route('**/api/sessions/join', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    body = route.request().postDataJSON();
    await route.fulfill({
      status: 403,
      headers: cors,
      contentType: 'application/json',
      body: JSON.stringify({ message: "Vous avez été exclu de cette session par l'enseignant." }),
    });
  });

  await page.goto('/player/join?code=k7m2p9');
  const spin = page.getByRole('button', { name: /Lancer la roulette \(3 essais restants\)/ });
  await expect(spin).toBeVisible();

  await spin.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('nickname-roulette-value')).toHaveText('Loutre Curieuse');
  await page.keyboard.press('Space');
  await expect(page.getByTestId('nickname-roulette-value')).toHaveText('Hibou Malin');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('nickname-roulette-value')).toHaveText('Panda Rapide');
  await expect(page.getByRole('button', { name: /0 essai restant/ })).toBeDisabled();

  await page.getByRole('button', { name: 'Rejoindre le quiz' }).click();
  await expect(page.getByRole('alert')).toContainText('Tu as été exclu de cette session');
  expect(body).toEqual({ password: 'K7M2P9', pseudo: 'Panda Rapide' });
});
