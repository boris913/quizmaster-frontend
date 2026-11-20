import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SessionControl } from '@/components/creator/SessionControl';

const handlers = {
  onStartQuestion: vi.fn(),
  onPause: vi.fn(),
  onResume: vi.fn(),
  onEnd: vi.fn(),
};

describe('SessionControl — CTA « Voir le rapport »', () => {
  it('apparaît une fois le quiz terminé', () => {
    render(
      <SessionControl
        status="finished"
        currentQuestion={2}
        totalQuestions={3}
        reportHref="/creator/session/sess-1/results"
        {...handlers}
      />
    );
    expect(screen.getByRole('link', { name: /Voir le rapport/ })).toHaveAttribute(
      'href',
      '/creator/session/sess-1/results'
    );
  });

  it("n'apparaît pas pendant la partie", () => {
    render(
      <SessionControl
        status="active"
        currentQuestion={0}
        totalQuestions={3}
        reportHref="/creator/session/sess-1/results"
        {...handlers}
      />
    );
    expect(screen.queryByRole('link', { name: /Voir le rapport/ })).not.toBeInTheDocument();
  });
});
