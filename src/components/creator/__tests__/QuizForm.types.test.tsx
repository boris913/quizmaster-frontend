import { describe, expect, it, vi } from 'vitest';
// fireEvent plutôt que userEvent : voir DeleteSessionButton.test.tsx (conflit de versions de @testing-library/dom).
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QuizForm, type QuizFormSubmitData } from '@/components/creator/QuizForm';

function setup(props: Partial<Parameters<typeof QuizForm>[0]> = {}) {
  const onSubmit = vi.fn();
  render(<QuizForm onSubmit={onSubmit} {...props} />);
  fireEvent.change(screen.getByLabelText('Titre'), { target: { value: 'Quiz de test' } });
  return onSubmit;
}

function addQuestion(text: string) {
  fireEvent.click(screen.getByRole('button', { name: /Ajouter une question/ }));
  const builders = screen.getAllByTestId(/^question-builder-/);
  const builder = builders[builders.length - 1];
  fireEvent.change(within(builder).getByLabelText('Énoncé'), { target: { value: text } });
  return builder;
}

function chooseType(builder: HTMLElement, label: string) {
  fireEvent.click(within(builder).getByRole('radio', { name: label }));
}

function fillOptions(builder: HTMLElement, texts: string[]) {
  texts.forEach((t, i) => {
    fireEvent.change(within(builder).getByLabelText(`Option ${'ABCD'[i]}`), { target: { value: t } });
  });
}

async function submit(onSubmit: ReturnType<typeof vi.fn>): Promise<QuizFormSubmitData> {
  fireEvent.click(screen.getByRole('button', { name: 'Créer le quiz' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  return onSubmit.mock.calls[0][0] as QuizFormSubmitData;
}

describe('QuizForm : types de questions (backend #7)', () => {
  it('Vrai/Faux : deux boutons, payload avec options fixes et ["false"]', async () => {
    const onSubmit = setup();
    const b = addQuestion('Le Soleil tourne autour de la Terre.');
    chooseType(b, 'Vrai / Faux');
    const faux = within(b).getByRole('radio', { name: 'Faux' });
    fireEvent.click(faux);
    expect(faux).toHaveAttribute('aria-checked', 'true');

    const data = await submit(onSubmit);
    expect(data.questions[0]).toMatchObject({
      type: 'true_false',
      options: [
        { id: 'true', text: 'Vrai' },
        { id: 'false', text: 'Faux' },
      ],
      correct_answers: ['false'],
    });
  });

  it('remettre dans l’ordre : ordre réordonné au clavier envoyé dans correct_answers', async () => {
    const onSubmit = setup();
    const b = addQuestion('Ordre chronologique');
    chooseType(b, 'Remettre dans l’ordre');
    fillOptions(b, ['Renaissance', 'Antiquité', 'Moyen Âge', 'Époque moderne']);

    // Antiquité (B) remonte en tête avec la flèche haut sur sa poignée.
    fireEvent.keyDown(within(b).getByRole('button', { name: /Déplacer « Antiquité »/ }), { key: 'ArrowUp' });
    // Époque moderne (D) supprimée, Moyen Âge (C) descend sous Renaissance.
    fireEvent.click(within(b).getByRole('button', { name: "Supprimer l'option D" }));
    fireEvent.click(within(b).getByRole('button', { name: 'Monter « Moyen Âge »' }));

    const data = await submit(onSubmit);
    expect(data.questions[0].type).toBe('ordering');
    expect(data.questions[0].correct_answers).toEqual(['B', 'C', 'A']);
    expect(data.questions[0].options.map((o) => o.text)).toEqual(['Antiquité', 'Moyen Âge', 'Renaissance']);
  });

  it('remettre dans l’ordre : au moins 3 options', async () => {
    const onSubmit = setup();
    const b = addQuestion('Ordre');
    chooseType(b, 'Remettre dans l’ordre');
    fireEvent.click(within(b).getByRole('button', { name: "Supprimer l'option D" }));
    // Minimum atteint : plus de bouton de suppression.
    expect(within(b).queryByRole('button', { name: "Supprimer l'option C" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Créer le quiz' }));
    expect(await within(b).findByText('Au moins 3 options, toutes renseignées')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('réponse courte : variantes acceptées, aucune option', async () => {
    const onSubmit = setup();
    const b = addQuestion("Capitale de l'Italie ?");
    chooseType(b, 'Réponse courte');
    fireEvent.change(within(b).getByLabelText('Réponse acceptée 1'), { target: { value: ' Rome ' } });
    fireEvent.click(within(b).getByRole('button', { name: /Ajouter une variante/ }));
    fireEvent.change(within(b).getByLabelText('Réponse acceptée 2'), { target: { value: 'Roma' } });

    const data = await submit(onSubmit);
    expect(data.questions[0]).toMatchObject({ type: 'short_answer', options: [], correct_answers: ['Rome', 'Roma'] });
  });

  it('réponse courte : refusée sans variante', async () => {
    const onSubmit = setup();
    const b = addQuestion('Question ouverte');
    chooseType(b, 'Réponse courte');
    fireEvent.click(screen.getByRole('button', { name: 'Créer le quiz' }));
    expect(await within(b).findByText('Au moins une réponse acceptée')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('sondage : pas de bouton « bonne réponse », correct_answers vide', async () => {
    const onSubmit = setup();
    const b = addQuestion('Thème préféré ?');
    chooseType(b, 'Sondage');
    expect(within(b).queryByRole('button', { name: /comme bonne réponse/ })).not.toBeInTheDocument();
    fireEvent.click(within(b).getByRole('button', { name: "Supprimer l'option D" }));
    fireEvent.click(within(b).getByRole('button', { name: "Supprimer l'option C" }));
    fillOptions(b, ['Volcans', 'Océans']);

    const data = await submit(onSubmit);
    expect(data.questions[0]).toMatchObject({
      type: 'poll',
      options: [
        { id: 'A', text: 'Volcans' },
        { id: 'B', text: 'Océans' },
      ],
      correct_answers: [],
    });
  });

  it('non-régression : choix unique et multiple', async () => {
    const onSubmit = setup();
    const single = addQuestion('Capitale ?');
    fillOptions(single, ['Londres', 'Paris', 'Rome', 'Berlin']);
    fireEvent.click(within(single).getByRole('button', { name: "Marquer l'option B comme bonne réponse" }));

    const multiple = addQuestion('Pays européens ?');
    chooseType(multiple, 'Réponses multiples');
    fillOptions(multiple, ['France', 'Japon', 'Italie', 'Chili']);
    fireEvent.click(within(multiple).getByRole('button', { name: "Marquer l'option A comme bonne réponse" }));
    fireEvent.click(within(multiple).getByRole('button', { name: "Marquer l'option C comme bonne réponse" }));

    const data = await submit(onSubmit);
    expect(data.questions[0]).toMatchObject({ type: 'single', correct_answers: ['B'] });
    expect(data.questions[0].options).toHaveLength(4);
    expect(data.questions[1]).toMatchObject({ type: 'multiple', correct_answers: ['A', 'C'] });
    // Sans image : pas de champ image_url ni de fichier en attente.
    expect(data.questions[0]).not.toHaveProperty('image_url');
    expect(data.questions[0]).not.toHaveProperty('image_file');
  });

  it('édition : questions existantes de nouveaux types rechargées puis renvoyées à l’identique', async () => {
    const onSubmit = vi.fn();
    render(
      <QuizForm
        onSubmit={onSubmit}
        submitLabel="Enregistrer"
        initialData={{
          title: 'Quiz existant',
          questions: [
            {
              text: 'Ordre',
              type: 'ordering',
              options: [
                { id: 'A', text: 'Trois' },
                { id: 'B', text: 'Un' },
                { id: 'C', text: 'Deux' },
              ],
              correct_answers: ['B', 'C', 'A'],
              max_points: 100,
              image_url: 'https://cdn.test/q.png',
            },
            { text: 'Capitale ?', type: 'short_answer', options: [], correct_answers: ['Paris'], max_points: 100 },
          ],
        }}
      />
    );
    // L'ordre attendu est restitué dans l'éditeur, l'image est prévisualisée.
    const items = screen.getAllByRole('listitem').filter((li) => li.dataset.testid?.startsWith('sortable-item-'));
    expect(items.map((li) => li.dataset.testid)).toEqual(['sortable-item-B', 'sortable-item-C', 'sortable-item-A']);
    expect(screen.getByTestId('question-image-preview')).toHaveAttribute('src', 'https://cdn.test/q.png');

    // Passage de la réponse courte en Vrai/Faux : les variantes ne fuient pas dans le payload.
    const second = screen.getByTestId('question-builder-1');
    chooseType(second, 'Vrai / Faux');
    fireEvent.click(within(second).getByRole('radio', { name: 'Vrai' }));

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const data = onSubmit.mock.calls[0][0] as QuizFormSubmitData;
    expect(data.questions[0]).toMatchObject({
      type: 'ordering',
      correct_answers: ['B', 'C', 'A'],
      image_url: 'https://cdn.test/q.png',
    });
    expect(data.questions[1]).toMatchObject({ type: 'true_false', correct_answers: ['true'] });
  });

  it('payload exact du formulaire : uniquement les champs des DTO backend', async () => {
    const onSubmit = setup();
    const b = addQuestion('Capitale ?');
    fillOptions(b, ['Londres', 'Paris', 'Rome', 'Berlin']);
    fireEvent.click(within(b).getByRole('button', { name: "Marquer l'option B comme bonne réponse" }));
    fireEvent.click(within(b).getByRole('button', { name: "Marquer l'option C comme bonne réponse" }));

    const data = await submit(onSubmit);
    expect(data).toEqual({
      title: 'Quiz de test',
      description: '',
      global_timer_seconds: 30,
      use_global_timer: true,
      questions: [
        {
          text: 'Capitale ?',
          type: 'single',
          options: [
            { id: 'A', text: 'Londres' },
            { id: 'B', text: 'Paris' },
            { id: 'C', text: 'Rome' },
            { id: 'D', text: 'Berlin' },
          ],
          // Choix unique : exactement une bonne réponse (la dernière cochée).
          correct_answers: ['C'],
          max_points: 100,
          timer_seconds: 30,
        },
      ],
    });
  });
});
