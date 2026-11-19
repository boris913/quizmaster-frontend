import { beforeEach, describe, expect, it, vi } from 'vitest';
// fireEvent (enveloppé dans act par RTL) plutôt que userEvent : user-event 14.5 embarque
// @testing-library/dom 10 alors que RTL 14 utilise dom 9, ce qui provoque des avertissements act().
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DeleteSessionButton } from '@/components/creator/DeleteSessionButton';
import { useSessionStore } from '@/store/sessionStore';
import type { Session } from '@/types';

vi.mock('@/lib/api', () => ({
  default: { delete: vi.fn(), get: vi.fn(), post: vi.fn() },
}));

import api from '@/lib/api';

const mockedDelete = vi.mocked(api.delete);

const session: Session = {
  id: 'sess-1',
  quiz_id: 'quiz-1',
  creator_id: 'user-1',
  password: 'ABC123',
  status: 'finished',
  current_question_index: 0,
  created_at: '2026-11-01T10:00:00Z',
  quiz_title: 'Révisions Histoire',
};

function openDialog() {
  fireEvent.click(screen.getByRole('button', { name: /Supprimer la session et ses données/ }));
}

function click(name: string) {
  fireEvent.click(screen.getByRole('button', { name }));
}

describe('DeleteSessionButton', () => {
  beforeEach(() => {
    mockedDelete.mockReset();
    useSessionStore.setState({ sessions: [session], currentSession: null });
  });

  it("n'appelle pas l'API sans confirmation, et Annuler ferme la boîte", async () => {
    render(<DeleteSessionButton sessionId="sess-1" sessionLabel="Révisions Histoire" />);
    openDialog();

    const dialog = screen.getByRole('alertdialog', { name: 'Supprimer la session et ses données ?' });
    expect(dialog).toHaveTextContent('Révisions Histoire');
    expect(dialog).toHaveTextContent('irréversible');

    click('Annuler');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it('ferme la boîte avec Échap', async () => {
    render(<DeleteSessionButton sessionId="sess-1" />);
    openDialog();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('confirme : DELETE /sessions/:id, retire la session du store et appelle onDeleted', async () => {
    mockedDelete.mockResolvedValueOnce({ data: {} });
    const onDeleted = vi.fn();
    render(<DeleteSessionButton sessionId="sess-1" onDeleted={onDeleted} />);
    openDialog();
    click('Supprimer définitivement');

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(mockedDelete).toHaveBeenCalledWith('/sessions/sess-1');
    expect(useSessionStore.getState().sessions).toEqual([]);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('affiche un message explicite si le backend répond 404 (non-créateur) et garde la session', async () => {
    mockedDelete.mockRejectedValueOnce({ response: { status: 404 } });
    const onDeleted = vi.fn();
    render(<DeleteSessionButton sessionId="sess-1" onDeleted={onDeleted} />);
    openDialog();
    click('Supprimer définitivement');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Session introuvable, ou vous n'en êtes pas le créateur."
    );
    expect(onDeleted).not.toHaveBeenCalled();
    expect(useSessionStore.getState().sessions).toHaveLength(1);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('affiche un message générique pour les autres erreurs', async () => {
    mockedDelete.mockRejectedValueOnce(new Error('Network Error'));
    render(<DeleteSessionButton sessionId="sess-1" />);
    openDialog();
    click('Supprimer définitivement');
    expect(await screen.findByRole('alert')).toHaveTextContent('La suppression a échoué');
  });
});
