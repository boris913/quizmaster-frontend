import { beforeEach, describe, expect, it, vi } from 'vitest';
// fireEvent plutôt que userEvent : voir DeleteSessionButton.test.tsx (conflit de versions de @testing-library/dom).
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import NewQuizPage from '@/app/creator/quiz/new/page';
import api from '@/lib/api';
import { AI_PDF_MAX_BYTES } from '@/lib/aiGeneration';

// Le rendu de six éditeurs de question est lent sur les machines chargées.
vi.setConfig({ testTimeout: 30_000 });

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(async () => ({ data: [] })),
    post: vi.fn(),
  },
}));

const COURSE = 'Les volcans sont des reliefs formés par la remontée du magma vers la surface de la Terre.';

/** Réponse type de POST /api/quizzes/generate (contrat backend#11) : un exemple par type. */
const generated = {
  title: 'Les volcans',
  questions: [
    {
      text: 'Qu’est-ce que le magma ?',
      type: 'single',
      options: [
        { id: 'A', text: 'De la roche fondue' },
        { id: 'B', text: 'De l’eau' },
        { id: 'C', text: 'Du sable' },
      ],
      correct_answers: ['A'],
      explanation: 'Le magma est de la roche en fusion.',
    },
    {
      text: 'Quels sont des types de volcans ?',
      type: 'multiple',
      options: [
        { id: 'A', text: 'Effusif' },
        { id: 'B', text: 'Sous-marin' },
        { id: 'C', text: 'Explosif' },
        { id: 'D', text: 'Liquide' },
      ],
      correct_answers: ['A', 'C'],
    },
    { text: 'Le magma refroidi forme du basalte.', type: 'true_false', options: [], correct_answers: ['true'] },
    {
      text: 'Remettez l’éruption dans l’ordre.',
      type: 'ordering',
      options: [
        { id: 'A', text: 'Coulée de lave' },
        { id: 'B', text: 'Remontée du magma' },
        { id: 'C', text: 'Refroidissement' },
      ],
      correct_answers: ['B', 'A', 'C'],
    },
    {
      text: 'Comment appelle-t-on l’ouverture au sommet d’un volcan ?',
      type: 'short_answer',
      options: [],
      correct_answers: ['cratère', 'le cratère'],
    },
    {
      text: 'Question à supprimer',
      type: 'single',
      options: [
        { id: 'A', text: 'Oui' },
        { id: 'B', text: 'Non' },
      ],
      correct_answers: ['A'],
    },
  ],
  discarded: 2,
  quota: { limit: 3, used: 1, resetAt: '2026-12-01T12:00:00.000Z' },
};

function mockPost(generate: () => Promise<unknown>) {
  vi.mocked(api.post).mockImplementation(async (url: string) => {
    if (url === '/quizzes/generate') return { data: await generate() };
    if (url === '/quizzes') return { data: { id: 'quiz-42' } };
    throw new Error(`URL inattendue : ${url}`);
  });
}

function postCalls(url: string) {
  return vi.mocked(api.post).mock.calls.filter(([u]) => u === url);
}

function axiosError(status: number, data: unknown = {}) {
  return { isAxiosError: true, message: 'Request failed', response: { status, data, headers: {} } };
}

function openAiTab() {
  render(<NewQuizPage />);
  fireEvent.click(screen.getByRole('tab', { name: /Générer depuis un cours/ }));
}

function fillTextForm({ count = '6' } = {}) {
  fireEvent.change(screen.getByLabelText('Texte du cours'), { target: { value: COURSE } });
  fireEvent.change(screen.getByLabelText('Niveau'), { target: { value: '5e' } });
  fireEvent.change(screen.getByLabelText(/Nombre de questions/), { target: { value: count } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Réponses multiples' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Remettre dans l’ordre' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Réponse courte' }));
}

function generate() {
  fireEvent.click(screen.getByRole('button', { name: /Générer le brouillon/ }));
}

async function generateDraft() {
  mockPost(async () => generated);
  openAiTab();
  fillTextForm();
  generate();
  await screen.findByTestId('ai-draft-banner');
}

describe('Nouveau quiz : générer depuis un cours', () => {
  beforeEach(() => {
    push.mockClear();
    vi.mocked(api.post).mockReset();
  });

  it('propose l’onglet à côté de la création manuelle et de l’import, sans sondage, avec la mention de confidentialité', () => {
    openAiTab();
    expect(screen.getByRole('tab', { name: /Création manuelle/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Importer un fichier/ })).toHaveAttribute('href', '/creator/quiz/import');
    expect(screen.queryByRole('checkbox', { name: 'Sondage' })).not.toBeInTheDocument();
    const notice = screen.getByTestId('ai-privacy-notice');
    expect(notice).toHaveTextContent(/fournisseur d’IA/);
    expect(notice).toHaveTextContent(/aucune donnée d’élève/);
    expect(within(notice).getByRole('link')).toHaveAttribute('href', '/confidentialite#generation-ia');
  });

  it('envoie le texte en multipart avec niveau, nombre et types cochés', async () => {
    await generateDraft();
    const [[url, body, config]] = postCalls('/quizzes/generate');
    expect(url).toBe('/quizzes/generate');
    expect(body).toBeInstanceOf(FormData);
    const form = body as FormData;
    expect(form.get('text')).toBe(COURSE);
    expect(form.get('file')).toBeNull();
    expect(form.get('level')).toBe('5e');
    expect(form.get('count')).toBe('6');
    expect(form.getAll('types[]')).toEqual(['single', 'multiple', 'true_false', 'ordering', 'short_answer']);
    expect((config as { headers: Record<string, string> }).headers['Content-Type']).toBe('multipart/form-data');
  });

  it('envoie un PDF déposé à la place du texte', async () => {
    mockPost(async () => generated);
    openAiTab();
    fireEvent.click(screen.getByRole('radio', { name: 'Déposer un PDF' }));
    const pdf = new File(['%PDF-1.4'], 'volcans.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Fichier PDF du cours'), { target: { files: [pdf] } });
    expect(screen.getByText(/volcans\.pdf/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Niveau'), { target: { value: '4e' } });
    generate();
    await screen.findByTestId('ai-draft-banner');
    const form = postCalls('/quizzes/generate')[0][1] as FormData;
    expect((form.get('file') as File).name).toBe('volcans.pdf');
    expect(form.get('text')).toBeNull();
  });

  it('refuse côté client un fichier qui n’est pas un PDF ou qui dépasse 10 Mo', () => {
    openAiTab();
    fireEvent.click(screen.getByRole('radio', { name: 'Déposer un PDF' }));
    const input = screen.getByLabelText('Fichier PDF du cours');

    fireEvent.change(input, { target: { files: [new File(['x'], 'cours.docx', { type: 'application/msword' })] } });
    expect(screen.getByRole('alert')).toHaveTextContent('Seuls les fichiers PDF sont acceptés.');

    const big = new File(['x'], 'gros.pdf', { type: 'application/pdf' });
    Object.defineProperty(big, 'size', { value: AI_PDF_MAX_BYTES + 1 });
    fireEvent.change(input, { target: { files: [big] } });
    expect(screen.getByRole('alert')).toHaveTextContent('Le PDF dépasse 10 Mo');

    fireEvent.change(screen.getByLabelText('Niveau'), { target: { value: '4e' } });
    generate();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('bloque le double envoi et affiche la progression pendant la génération', async () => {
    let resolve!: (v: unknown) => void;
    mockPost(() => new Promise((r) => (resolve = r)));
    openAiTab();
    fillTextForm();
    const form = screen.getByRole('button', { name: /Générer le brouillon/ }).closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(await screen.findByRole('status')).toHaveTextContent('Envoi du cours…');
    expect(screen.getByRole('button', { name: /Génération en cours/ })).toBeDisabled();
    expect(postCalls('/quizzes/generate')).toHaveLength(1);
    resolve(generated);
    await screen.findByTestId('ai-draft-banner');
  });

  it('relecture : bannière IA, questions écartées, et rien n’est enregistré sans clic', async () => {
    await generateDraft();
    expect(screen.getByTestId('ai-draft-banner')).toHaveTextContent(
      'Brouillon généré par IA — à vérifier avant utilisation'
    );
    expect(screen.getByTestId('ai-discarded')).toHaveTextContent('2 questions ont été écartées');
    expect(screen.getAllByTestId(/^question-builder-/)).toHaveLength(6);
    expect(screen.getByLabelText('Titre')).toHaveValue('Les volcans');
    // Aucun appel d'enregistrement : seul l'appel de génération a eu lieu.
    expect(postCalls('/quizzes')).toHaveLength(0);
    expect(vi.mocked(api.post)).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it('demande confirmation avant de quitter la page avec un brouillon non enregistré', async () => {
    await generateDraft();
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('enregistrement explicite : modification et suppression prises en compte, bon payload pour chaque type', async () => {
    await generateDraft();
    const builders = screen.getAllByTestId(/^question-builder-/);
    fireEvent.change(within(builders[0]).getByLabelText('Énoncé'), {
      target: { value: 'Qu’est-ce que le magma, exactement ?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer la question 6' }));
    expect(screen.getAllByTestId(/^question-builder-/)).toHaveLength(5);

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le quiz' }));
    await waitFor(() => expect(postCalls('/quizzes')).toHaveLength(1));
    const payload = postCalls('/quizzes')[0][1] as { title: string; questions: Record<string, unknown>[] };
    expect(payload.title).toBe('Les volcans');
    expect(payload.questions).toHaveLength(5);
    expect(payload.questions[0]).toMatchObject({
      text: 'Qu’est-ce que le magma, exactement ?',
      type: 'single',
      correct_answers: ['A'],
      explanation: 'Le magma est de la roche en fusion.',
      max_points: 100,
    });
    expect(payload.questions[1]).toMatchObject({ type: 'multiple', correct_answers: ['A', 'C'] });
    expect(payload.questions[2]).toMatchObject({
      type: 'true_false',
      options: [
        { id: 'true', text: 'Vrai' },
        { id: 'false', text: 'Faux' },
      ],
      correct_answers: ['true'],
    });
    expect(payload.questions[3]).toMatchObject({ type: 'ordering', correct_answers: ['B', 'A', 'C'] });
    expect((payload.questions[3].options as { text: string }[]).map((o) => o.text)).toEqual([
      'Remontée du magma',
      'Coulée de lave',
      'Refroidissement',
    ]);
    expect(payload.questions[4]).toMatchObject({
      type: 'short_answer',
      options: [],
      correct_answers: ['cratère', 'le cratère'],
    });
    expect(payload.questions.some((q) => q.text === 'Question à supprimer')).toBe(false);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/creator/quiz/quiz-42'));

    // Enregistré : la fermeture de l'onglet n'est plus bloquée.
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('la validation de l’éditeur s’applique au brouillon généré', async () => {
    await generateDraft();
    const builders = screen.getAllByTestId(/^question-builder-/);
    fireEvent.change(within(builders[0]).getByLabelText('Option A'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le quiz' }));
    expect(await within(builders[0]).findByText(/toutes renseignées/)).toBeInTheDocument();
    expect(postCalls('/quizzes')).toHaveLength(0);
  });

  it('quota atteint : message clair avec la limite et la date de remise à zéro', async () => {
    mockPost(async () => {
      throw axiosError(429, {
        message: 'Quota mensuel atteint',
        quota: { limit: 3, used: 3, resetAt: '2026-12-01T12:00:00.000Z' },
      });
    });
    openAiTab();
    fillTextForm();
    generate();
    const alert = await screen.findByTestId('ai-error-quota');
    expect(alert).toHaveTextContent('Quota mensuel atteint');
    expect(alert).toHaveTextContent('Vous avez utilisé vos 3 générations du mois.');
    expect(alert).toHaveTextContent('1 décembre 2026');
    expect(screen.queryByTestId('ai-draft-banner')).not.toBeInTheDocument();
  });

  it('503 : IA indisponible', async () => {
    mockPost(async () => {
      throw axiosError(503, { message: 'AI provider not configured' });
    });
    openAiTab();
    fillTextForm();
    generate();
    const alert = await screen.findByTestId('ai-error-unavailable');
    expect(alert).toHaveTextContent('Génération par IA indisponible');
    // Le formulaire reste utilisable pour réessayer.
    expect(screen.getByRole('button', { name: /Générer le brouillon/ })).toBeEnabled();
  });

  it('PDF sans texte (422) et erreur réseau', async () => {
    mockPost(async () => {
      throw axiosError(422, { message: 'Aucun texte extractible du PDF' });
    });
    openAiTab();
    fillTextForm();
    generate();
    expect(await screen.findByTestId('ai-error-pdf_no_text')).toHaveTextContent(/Aucun texte n’a pu être extrait/);

    mockPost(async () => {
      throw { isAxiosError: true, message: 'Network Error' };
    });
    generate();
    expect(await screen.findByTestId('ai-error-network')).toHaveTextContent(/Impossible de joindre le serveur/);
  });
});
