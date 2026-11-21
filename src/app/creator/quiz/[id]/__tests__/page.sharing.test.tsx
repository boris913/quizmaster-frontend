import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuizDetailPage from '@/app/creator/quiz/[id]/page';
import api from '@/lib/api';
import { useQuizStore } from '@/store/quizStore';

vi.setConfig({ testTimeout: 30_000 });

const push = vi.fn();
let search = '';
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'quiz-1' }),
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(search),
}));

let quiz: Record<string, unknown>;

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn(), patch: vi.fn() },
}));

function baseQuiz(extra: Record<string, unknown> = {}) {
  return {
    id: 'quiz-1',
    title: 'Les volcans',
    description: '',
    total_questions: 1,
    use_global_timer: true,
    global_timer_seconds: 30,
    questions: [
      {
        id: 'q1',
        quiz_id: 'quiz-1',
        text: 'Quel volcan ?',
        type: 'single',
        options: [
          { id: 'A', text: 'Etna' },
          { id: 'B', text: 'Mont Blanc' },
        ],
        correct_answers: ['A'],
        max_points: 1000,
        timer_seconds: 30,
        order_index: 0,
        created_at: '',
      },
    ],
    ...extra,
  };
}

describe('Page du quiz : dupliquer et partager', () => {
  beforeEach(() => {
    push.mockReset();
    search = '';
    quiz = baseQuiz();
    useQuizStore.setState({ currentQuiz: null, quizzes: [] });
    vi.mocked(api.get).mockReset();
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/quizzes') return { data: [] };
      if (url === '/quizzes/quiz-1') return { data: quiz };
      throw new Error(`URL inattendue : ${url}`);
    });
    vi.mocked(api.post).mockReset();
    vi.mocked(api.delete).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('conserve le rappel des réponses et « Assigner en devoir »', async () => {
    render(<QuizDetailPage />);
    expect(await screen.findByText('Quel volcan ?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Assigner en devoir/ })).toBeInTheDocument();
    expect(screen.getByText('A: Etna')).toBeInTheDocument();
  });

  it('« Dupliquer » crée une copie puis redirige vers elle', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({ data: { quiz: { id: 'quiz-2', title: 'Les volcans (copie)' }, warnings: [] } });
    render(<QuizDetailPage />);
    await user.click(await screen.findByRole('button', { name: /Dupliquer/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/creator/quiz/quiz-2'));
    expect(api.post).toHaveBeenCalledWith('/quizzes/quiz-1/duplicate');
  });

  it('transmet l’avertissement des images non copiées à la page de la copie', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({
      data: {
        quiz: { id: 'quiz-2' },
        warnings: [
          { question_number: 1, message: 'image non copiée (erreur du stockage) : question copiée sans image' },
          { question_number: 2, message: 'image non copiée (copie refusée par le stockage) : question copiée sans image' },
        ],
      },
    });
    render(<QuizDetailPage />);
    await user.click(await screen.findByRole('button', { name: /Dupliquer/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/creator/quiz/quiz-2?imagesNonCopiees=2'));
  });

  it('affiche l’avertissement sur la copie', async () => {
    search = 'imagesNonCopiees=2';
    render(<QuizDetailPage />);
    expect(await screen.findByTestId('images-not-copied')).toHaveTextContent('2 images n’ont pas pu être copiées');
  });

  it('affiche une erreur si la duplication échoue', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockRejectedValue({ response: { status: 500, data: {} } });
    render(<QuizDetailPage />);
    await user.click(await screen.findByRole('button', { name: /Dupliquer/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('La copie n’a pas pu être créée');
    expect(push).not.toHaveBeenCalled();
  });

  it('génère le lien de partage, le copie et explique ce que reçoit le collègue', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({ data: { share_token: 'tok123' } });
    render(<QuizDetailPage />);
    await user.click(await screen.findByRole('button', { name: /^Partager$/ }));
    expect(screen.getByTestId('share-explanation')).toHaveTextContent(
      'Le collègue reçoit une copie modifiable, votre quiz n\'est jamais modifié.'
    );
    await user.click(screen.getByRole('button', { name: /Générer un lien de partage/ }));
    expect(api.post).toHaveBeenCalledWith('/quizzes/quiz-1/share');
    const input = (await screen.findByLabelText('Lien de partage')) as HTMLInputElement;
    expect(input.value).toBe(`${window.location.origin}/creator/quiz/shared/tok123`);
    await user.click(screen.getByRole('button', { name: /Copier le lien/ }));
    // userEvent installe son propre presse-papiers : on relit ce qui y a été écrit.
    expect(await navigator.clipboard.readText()).toBe(input.value);
    expect(await screen.findByRole('button', { name: /Lien copié/ })).toBeInTheDocument();
  });

  it('régénère le lien après confirmation', async () => {
    const user = userEvent.setup();
    quiz = baseQuiz({ share_token: 'old' });
    vi.mocked(api.post).mockResolvedValue({ data: { share_token: 'new' } });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<QuizDetailPage />);
    await user.click(await screen.findByRole('button', { name: /^Partager$/ }));
    const input = screen.getByLabelText('Lien de partage') as HTMLInputElement;
    expect(input.value).toMatch(/\/shared\/old$/);

    await user.click(screen.getByRole('button', { name: /Régénérer le lien/ }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(api.post).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Régénérer le lien/ }));
    await waitFor(() => expect(input.value).toMatch(/\/shared\/new$/));
    expect(api.post).toHaveBeenCalledWith('/quizzes/quiz-1/share');
  });

  it('révoque le lien seulement après confirmation', async () => {
    const user = userEvent.setup();
    quiz = baseQuiz({ share_token: 'old' });
    vi.mocked(api.delete).mockResolvedValue({ data: { share_token: null } });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<QuizDetailPage />);
    await user.click(await screen.findByRole('button', { name: /^Partager$/ }));

    await user.click(screen.getByRole('button', { name: /Révoquer le lien/ }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(api.delete).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Révoquer le lien/ }));
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/quizzes/quiz-1/share'));
    expect(await screen.findByText('Lien révoqué : il ne fonctionne plus.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Lien de partage')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Générer un lien de partage/ })).toBeInTheDocument();
  });
});
