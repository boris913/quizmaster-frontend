import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImportQuizPage from '@/app/creator/quiz/import/page';
import api from '@/lib/api';
import { IMPORT_MAX_BYTES } from '@/lib/quizSharing';

vi.setConfig({ testTimeout: 30_000 });

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

function makeFile(name: string, size = 120): File {
  const file = new File(['question;type\n'], name);
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

function chooseFile(label: RegExp, file: File) {
  fireEvent.change(screen.getByLabelText(label), { target: { files: [file] } });
}

type Call = { url: string; body: unknown; params?: { format?: string; dryRun?: boolean } };
let calls: Call[];

describe('Import de quiz', () => {
  beforeEach(() => {
    push.mockReset();
    calls = [];
    vi.mocked(api.get).mockReset();
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    vi.mocked(api.post).mockReset();
    vi.mocked(api.post).mockImplementation(async (url: string, body?: unknown, config?: unknown) => {
      const params = (config as { params?: Call['params'] } | undefined)?.params;
      calls.push({ url, body, params });
      if (url === '/quizzes') return { data: { id: 'quiz-new' } };
      if (url === '/quizzes/quiz-new/import') {
        // Forme du backend #12 : `imported` vaut 0 en dryRun, `valid` compte les questions valides.
        if (params?.dryRun === true) {
          return {
            data: {
              format: params.format,
              dry_run: true,
              total_rows: 4,
              valid: 2,
              imported: 0,
              questions: [],
              errors: [
                { row: 4, message: 'Type de question inconnu : « essay »' },
                { row: 7, message: 'Aucune bonne réponse indiquée' },
              ],
            },
          };
        }
        return { data: { format: params?.format, dry_run: false, total_rows: 4, valid: 2, imported: 2, questions: [], errors: [] } };
      }
      throw new Error(`URL inattendue : ${url}`);
    });
  });

  it('Markdown reste l’onglet par défaut, inchangé', async () => {
    const user = userEvent.setup();
    render(<ImportQuizPage />);
    expect(screen.getByRole('tab', { name: 'Markdown' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('import-format-example')).toHaveTextContent('Question 1 [timer:30] [points:100]');
    expect(screen.getByTestId('import-types-help')).toBeInTheDocument();
    expect(screen.getByText('Questions.md')).toBeInTheDocument();

    // L'envoi Markdown garde son contrat JSON (questions_content / answers_content).
    const file = new File(['Question 1\nTexte ?\nA) Oui [correct]\nB) Non'], 'q.md', { type: 'text/markdown' });
    const input = document.querySelector('input[type="file"][accept=".md,.txt"]') as HTMLInputElement;
    await user.upload(input, file);
    const button = screen.getByRole('button', { name: /^Importer$/ });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
    await waitFor(() => expect(calls.map((c) => c.url)).toContain('/quizzes/quiz-new/import'));
    const importCall = calls.find((c) => c.url === '/quizzes/quiz-new/import')!;
    expect(importCall.body).toEqual({
      questions_content: 'Question 1\nTexte ?\nA) Oui [correct]\nB) Non',
      answers_content: undefined,
    });
  });

  it('Tableur : aperçu en dryRun avec les erreurs par ligne, puis import sur confirmation', async () => {
    const user = userEvent.setup();
    render(<ImportQuizPage />);
    await user.click(screen.getByRole('tab', { name: /Tableur/ }));
    expect(screen.getByRole('link', { name: /Télécharger le modèle CSV/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/\/api\/quizzes\/import-template\.csv$/)
    );

    chooseFile(/Fichier tableur/, makeFile('questions.csv'));
    await user.click(screen.getByRole('button', { name: /Prévisualiser/ }));

    const preview = await screen.findByTestId('import-preview');
    expect(within(preview).getByRole('status')).toHaveTextContent('2 questions valides prêtes à importer.');
    const rows = within(preview).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent('4');
    expect(rows[1]).toHaveTextContent('Type de question inconnu : « essay »');
    expect(rows[2]).toHaveTextContent('Aucune bonne réponse indiquée');

    const dryRunCall = calls.find((c) => c.url === '/quizzes/quiz-new/import')!;
    expect(dryRunCall.params).toEqual({ format: 'csv', dryRun: true });
    expect(((dryRunCall.body as FormData).get('file') as File).name).toBe('questions.csv');
    // Rien n'est importé tant que l'enseignant n'a pas confirmé.
    expect(calls.filter((c) => c.url.endsWith('/import'))).toHaveLength(1);
    expect(push).not.toHaveBeenCalled();

    await user.click(within(preview).getByRole('button', { name: 'Importer 2 questions' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/creator/quiz/quiz-new'));
    const importCalls = calls.filter((c) => c.url.endsWith('/import'));
    expect(importCalls).toHaveLength(2);
    expect(importCalls[1].params).toEqual({ format: 'csv', dryRun: false });
    // Le quiz n'est créé qu'une fois pour l'aperçu et l'import.
    expect(calls.filter((c) => c.url === '/quizzes')).toHaveLength(1);
  });

  it('Kahoot : envoie format=kahoot et refuse un fichier qui n’est pas .xlsx', async () => {
    const user = userEvent.setup();
    render(<ImportQuizPage />);
    await user.click(screen.getByRole('tab', { name: /Kahoot/ }));

    chooseFile(/Fichier Kahoot/, makeFile('export.csv'));
    expect(screen.getByRole('alert')).toHaveTextContent('.xlsx exporté depuis Kahoot');
    expect(screen.getByRole('button', { name: /Prévisualiser/ })).toBeDisabled();

    chooseFile(/Fichier Kahoot/, makeFile('export.xlsx'));
    await user.click(screen.getByRole('button', { name: /Prévisualiser/ }));
    await screen.findByTestId('import-preview');
    expect(calls.find((c) => c.url.endsWith('/import'))!.params).toEqual({ format: 'kahoot', dryRun: true });
  });

  it('refuse un type non pris en charge ou un fichier trop volumineux, sans appel réseau', async () => {
    const user = userEvent.setup();
    render(<ImportQuizPage />);
    await user.click(screen.getByRole('tab', { name: /Tableur/ }));

    chooseFile(/Fichier tableur/, makeFile('cours.pdf'));
    expect(screen.getByRole('alert')).toHaveTextContent('Format non pris en charge');

    chooseFile(/Fichier tableur/, makeFile('gros.xlsx', IMPORT_MAX_BYTES + 1));
    expect(screen.getByRole('alert')).toHaveTextContent('Fichier trop volumineux');
    expect(screen.getByRole('button', { name: /Prévisualiser/ })).toBeDisabled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('aucune question valide : l’import réel est impossible', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/quizzes') return { data: { id: 'quiz-new' } };
      return { data: { dry_run: true, valid: 0, imported: 0, errors: [{ row: 2, message: 'Énoncé manquant' }] } };
    });
    render(<ImportQuizPage />);
    await user.click(screen.getByRole('tab', { name: /Tableur/ }));
    chooseFile(/Fichier tableur/, makeFile('questions.xlsx'));
    await user.click(screen.getByRole('button', { name: /Prévisualiser/ }));
    expect(await screen.findByText('Aucune question valide dans ce fichier.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Importer 0 question' })).toBeDisabled();
  });

  it('affiche le message du serveur si l’analyse échoue', async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockImplementation(async (url: string) => {
      if (url === '/quizzes') return { data: { id: 'quiz-new' } };
      throw { response: { status: 400, data: { message: 'Colonnes manquantes : question' } } };
    });
    render(<ImportQuizPage />);
    await user.click(screen.getByRole('tab', { name: /Tableur/ }));
    chooseFile(/Fichier tableur/, makeFile('questions.csv'));
    await user.click(screen.getByRole('button', { name: /Prévisualiser/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Colonnes manquantes : question');
  });
});
