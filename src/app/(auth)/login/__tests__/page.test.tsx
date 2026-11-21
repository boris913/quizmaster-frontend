import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '@/app/(auth)/login/page';
import api from '@/lib/api';

vi.setConfig({ testTimeout: 30_000 });

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/lib/api', () => ({
  default: { post: vi.fn() },
}));

async function submit() {
  const user = userEvent.setup();
  render(<LoginPage />);
  await user.type(screen.getByPlaceholderText('Votre pseudo'), 'prof');
  await user.type(screen.getByPlaceholderText('••••••••'), 'secret');
  await user.click(screen.getByRole('button', { name: 'Se connecter' }));
}

describe('Connexion : retour sur la page d’origine', () => {
  beforeEach(() => {
    push.mockReset();
    vi.mocked(api.post).mockResolvedValue({
      data: { access_token: 'jwt', user: { id: 'u1', pseudo: 'prof', created_at: '' } },
    });
  });

  it('revient sur la page du quiz partagé après connexion', async () => {
    window.history.pushState({}, '', '/login?next=%2Fcreator%2Fquiz%2Fshared%2Ftok123');
    await submit();
    await waitFor(() => expect(push).toHaveBeenCalledWith('/creator/quiz/shared/tok123'));
    expect(screen.getByRole('link', { name: /inscrire/ })).toHaveAttribute(
      'href',
      '/register?next=%2Fcreator%2Fquiz%2Fshared%2Ftok123'
    );
  });

  it('ignore une destination externe et va au tableau de bord', async () => {
    window.history.pushState({}, '', '/login?next=https%3A%2F%2Fevil.example');
    await submit();
    await waitFor(() => expect(push).toHaveBeenCalledWith('/creator/dashboard'));
  });

  it('sans destination : tableau de bord', async () => {
    window.history.pushState({}, '', '/login');
    await submit();
    await waitFor(() => expect(push).toHaveBeenCalledWith('/creator/dashboard'));
  });
});
