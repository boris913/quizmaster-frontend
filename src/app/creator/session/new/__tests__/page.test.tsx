import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewSessionPage from '@/app/creator/session/new/page';
import api from '@/lib/api';
import { useQuizStore } from '@/store/quizStore';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams('quizId=quiz-1'),
}));

const quiz = {
  id: 'quiz-1',
  title: 'Les fractions',
  total_questions: 3,
  use_global_timer: true,
  global_timer_seconds: 20,
};

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(async (url: string) => {
      if (url === '/quizzes') return { data: [quiz] };
      if (url === '/quizzes/quiz-1') return { data: quiz };
      if (url === '/sessions') return { data: [] };
      throw new Error(`URL inattendue : ${url}`);
    }),
    post: vi.fn(async (_url: string, body: { nicknameMode?: string }) => ({
      data: { id: 'session-1', password: 'K7M2P9', nickname_mode: body.nicknameMode ?? 'free' },
    })),
  },
}));

describe('Nouvelle session : mode des pseudos', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockClear();
    useQuizStore.setState({ currentQuiz: null });
  });

  it('propose « Pseudos libres » par défaut, avec une ligne d’explication', async () => {
    render(<NewSessionPage />);
    const free = await screen.findByRole('radio', { name: 'Pseudos libres' });
    expect(free).toBeChecked();
    expect(free).toHaveAccessibleDescription(/termes inappropriés sont refusés/);
    expect(screen.getByRole('radio', { name: 'Pseudos générés' })).not.toBeChecked();
  });

  it('envoie nicknameMode: "generated" à la création', async () => {
    const user = userEvent.setup();
    render(<NewSessionPage />);

    await user.click(await screen.findByRole('radio', { name: 'Pseudos générés' }));
    await user.click(screen.getByRole('button', { name: 'Créer la session' }));

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(vi.mocked(api.post).mock.calls[0]).toEqual([
      '/sessions',
      { quiz_id: 'quiz-1', nicknameMode: 'generated' },
    ]);
    expect(await screen.findByText('Pseudos générés')).toBeInTheDocument();
  });

  it('mode libre : nicknameMode: "free"', async () => {
    const user = userEvent.setup();
    render(<NewSessionPage />);

    await user.click(await screen.findByRole('button', { name: 'Créer la session' }));
    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(vi.mocked(api.post).mock.calls[0][1]).toEqual({ quiz_id: 'quiz-1', nicknameMode: 'free' });
  });
});
