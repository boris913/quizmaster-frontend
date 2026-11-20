import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ParticipantList } from '@/components/creator/ParticipantList';
import type { Participant } from '@/types';

const participants: Participant[] = [
  { id: 'p1', session_id: 's1', pseudo: 'Alice', score: 10, status: 'waiting', joined_at: '' },
  { id: 'p2', session_id: 's1', pseudo: 'Bob', score: 5, status: 'waiting', joined_at: '' },
];

describe('ParticipantList : exclusion', () => {
  it('sans onKick, pas de bouton « Exclure »', () => {
    render(<ParticipantList participants={participants} />);
    expect(screen.queryByRole('button', { name: /Exclure/ })).not.toBeInTheDocument();
  });

  it('demande une confirmation avant d’exclure', async () => {
    const user = userEvent.setup();
    const onKick = vi.fn();
    render(<ParticipantList participants={participants} onKick={onKick} />);

    await user.click(screen.getByRole('button', { name: 'Exclure Bob' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('Exclure Bob de la partie ?');
    expect(onKick).not.toHaveBeenCalled();
    // Focus sur « Annuler » : pas d'exclusion par un Entrée réflexe.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Annuler' })).toHaveFocus());

    await user.click(screen.getByRole('button', { name: 'Exclure' }));
    expect(onKick).toHaveBeenCalledTimes(1);
    expect(onKick).toHaveBeenCalledWith(expect.objectContaining({ id: 'p2', pseudo: 'Bob' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('Annuler ou Échap referme la confirmation sans exclure', async () => {
    const user = userEvent.setup();
    const onKick = vi.fn();
    render(<ParticipantList participants={participants} onKick={onKick} />);

    await user.click(screen.getByRole('button', { name: 'Exclure Alice' }));
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Exclure Alice' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Annuler' })).toHaveFocus());
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onKick).not.toHaveBeenCalled();
  });
});
