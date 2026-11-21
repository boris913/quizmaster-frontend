import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SharedQuizPage from '@/app/creator/quiz/shared/[token]/page';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

vi.setConfig({ testTimeout: 30_000 });

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ token: 'tok123' }),
  useRouter: () => ({ push }),
}));

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const preview = {
  title: 'Les volcans',
  description: 'Révisions de 5e',
  question_count: 3,
  questions: [
    { text: 'Quel volcan est en Sicile ?', type: 'single', options: [{ id: 'A', text: 'Etna' }, { id: 'B', text: 'Fuji' }] },
    { text: 'Le magma est froid.', type: 'true_false', options: [] },
    { text: 'Nom du volcan d’Auvergne ?', type: 'short_answer', options: [] },
  ],
};

function login(isAuthenticated: boolean) {
  useAuthStore.setState({
    isAuthenticated,
    token: isAuthenticated ? 'jwt' : null,
    user: isAuthenticated ? { id: 'u1', pseudo: 'prof', created_at: '' } : null,
  });
}

describe('Page d’un quiz partagé', () => {
  beforeEach(() => {
    push.mockReset();
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.get).mockResolvedValue({ data: preview });
    login(true);
  });

  it('affiche un aperçu lisible sans les réponses', async () => {
    render(<SharedQuizPage />);
    expect(await screen.findByRole('heading', { name: 'Les volcans' })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/quizzes/shared/tok123');
    expect(screen.getByTestId('shared-summary')).toHaveTextContent('3 questions');
    expect(screen.getByTestId('shared-summary')).toHaveTextContent('Réponse unique × 1');
    expect(screen.getByTestId('shared-summary')).toHaveTextContent('Vrai / Faux × 1');
    expect(screen.getAllByTestId('shared-question')).toHaveLength(3);
    expect(screen.getByText('Quel volcan est en Sicile ?')).toBeInTheDocument();
    expect(screen.queryByText(/correct/i)).not.toBeInTheDocument();
  });

  it('ne montre pas les réponses même si le serveur en envoyait', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        ...preview,
        questions: [{ text: 'Capitale ?', type: 'short_answer', options: [], correct_answers: ['Rome-secret'] }],
      },
    });
    render(<SharedQuizPage />);
    expect(await screen.findByText('Capitale ?')).toBeInTheDocument();
    expect(screen.queryByText(/Rome-secret/)).not.toBeInTheDocument();
  });

  it('« Ajouter à mes quiz » copie le quiz puis ouvre la copie', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({ data: { quiz: { id: 'quiz-9' }, warnings: [] } });
    render(<SharedQuizPage />);
    await user.click(await screen.findByRole('button', { name: /Ajouter à mes quiz/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/creator/quiz/quiz-9'));
    expect(api.post).toHaveBeenCalledWith('/quizzes/shared/tok123/copy');
  });

  it('non connecté : renvoie vers la connexion avec retour sur cette page', async () => {
    const user = userEvent.setup();
    login(false);
    render(<SharedQuizPage />);
    await user.click(await screen.findByRole('button', { name: /Ajouter à mes quiz/ }));
    expect(push).toHaveBeenCalledWith('/login?next=%2Fcreator%2Fquiz%2Fshared%2Ftok123');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('session expirée (401 à la copie) : renvoie aussi vers la connexion', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockRejectedValue({ response: { status: 401, data: {} } });
    render(<SharedQuizPage />);
    await user.click(await screen.findByRole('button', { name: /Ajouter à mes quiz/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/login?next=%2Fcreator%2Fquiz%2Fshared%2Ftok123'));
  });

  it.each([404, 410])('jeton inconnu ou révoqué (%i) : message clair', async (status) => {
    vi.mocked(api.get).mockRejectedValue({ response: { status, data: { message: 'Not Found' } } });
    render(<SharedQuizPage />);
    expect(await screen.findByTestId('shared-invalid')).toHaveTextContent('n’existe pas ou a été révoqué');
    expect(screen.queryByRole('button', { name: /Ajouter à mes quiz/ })).not.toBeInTheDocument();
  });
});
