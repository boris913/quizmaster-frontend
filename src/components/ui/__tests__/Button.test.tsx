import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('rend un <button> avec son libellé et les classes de variante/taille', () => {
    render(
      <Button variant="danger" size="sm" className="extra">
        Supprimer
      </Button>
    );
    const button = screen.getByRole('button', { name: 'Supprimer' });
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveClass('bg-danger-solid', 'h-9', 'extra');
  });

  it('appelle onClick au clic', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Valider</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Valider' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('est désactivé et ne déclenche pas onClick quand isLoading', async () => {
    const onClick = vi.fn();
    render(
      <Button isLoading onClick={onClick}>
        Envoi
      </Button>
    );
    const button = screen.getByRole('button', { name: 'Envoi' });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('transmet la ref au <button>', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  describe('asChild', () => {
    it("rend l'enfant à la place d'un <button>, sans <button> imbriqué", () => {
      render(
        <Button asChild size="lg">
          <a href="/player/join">Rejoindre</a>
        </Button>
      );
      const link = screen.getByRole('link', { name: 'Rejoindre' });
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', '/player/join');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it("fusionne les classes du bouton avec celles de l'enfant", () => {
      render(
        <Button asChild variant="outline" className="btn-extra">
          <a href="/" className="child-extra">
            Accueil
          </a>
        </Button>
      );
      const link = screen.getByRole('link', { name: 'Accueil' });
      expect(link).toHaveClass('inline-flex', 'border', 'btn-extra', 'child-extra');
    });
  });
});
