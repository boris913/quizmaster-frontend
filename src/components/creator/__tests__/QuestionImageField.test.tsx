import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QuestionImageField } from '@/components/creator/QuestionImageField';

vi.mock('@/lib/api', () => ({
  default: { delete: vi.fn(), get: vi.fn(), post: vi.fn() },
}));

import api from '@/lib/api';

const mockedPost = vi.mocked(api.post);

function file(name: string, type: string, size: number) {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
}

function pick(f: File) {
  fireEvent.change(screen.getByTestId('question-image-input'), { target: { files: [f] } });
}

describe('QuestionImageField : upload via URL signée', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    mockedPost.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('quiz existant : demande l’URL signée, PUT du fichier, puis renvoie l’URL publique', async () => {
    mockedPost.mockResolvedValue({
      data: { signedUrl: 'https://storage.test/upload?token=t', publicUrl: 'https://cdn.test/q/abc.png', path: 'q/abc.png' },
    });
    fetchMock.mockResolvedValue({ ok: true });
    const onChange = vi.fn();
    render(<QuestionImageField quizId="quiz-1" imageUrl={null} file={null} onChange={onChange} />);

    const image = file('carte.png', 'image/png', 1024);
    pick(image);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ imageUrl: 'https://cdn.test/q/abc.png', file: null }));
    expect(mockedPost).toHaveBeenCalledWith('/quizzes/quiz-1/questions/image-upload-url', {
      content_type: 'image/png',
      size: 1024,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://storage.test/upload?token=t',
      expect.objectContaining({ method: 'PUT', body: image })
    );
  });

  it('refuse un type non accepté sans appel réseau', () => {
    const onChange = vi.fn();
    render(<QuestionImageField quizId="quiz-1" imageUrl={null} file={null} onChange={onChange} />);
    pick(file('doc.pdf', 'application/pdf', 1000));
    expect(screen.getByRole('alert')).toHaveTextContent('PNG, JPEG, WebP ou GIF');
    expect(mockedPost).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('refuse une image de plus de 2 Mo (glisser-déposer)', () => {
    const onChange = vi.fn();
    render(<QuestionImageField quizId="quiz-1" imageUrl={null} file={null} onChange={onChange} />);
    fireEvent.drop(screen.getByTestId('question-image-dropzone'), {
      dataTransfer: { files: [file('grosse.jpg', 'image/jpeg', 2 * 1024 * 1024 + 1)] },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('2 Mo maximum');
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('affiche une erreur si le stockage refuse le fichier', async () => {
    mockedPost.mockResolvedValue({ data: { upload_url: 'https://storage.test/u', public_url: 'https://cdn.test/x.png' } });
    fetchMock.mockResolvedValue({ ok: false });
    const onChange = vi.fn();
    render(<QuestionImageField quizId="quiz-1" imageUrl={null} file={null} onChange={onChange} />);
    pick(file('a.webp', 'image/webp', 10));
    expect(await screen.findByRole('alert')).toHaveTextContent("Le stockage a refusé l'image");
    expect(onChange).not.toHaveBeenCalled();
  });

  it('quiz pas encore créé : image gardée en attente, sans appel réseau', () => {
    const onChange = vi.fn();
    render(<QuestionImageField imageUrl={null} file={null} onChange={onChange} />);
    const image = file('a.gif', 'image/gif', 10);
    pick(image);
    expect(onChange).toHaveBeenCalledWith({ imageUrl: null, file: image });
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('aperçu, remplacement et suppression', () => {
    const onChange = vi.fn();
    render(<QuestionImageField quizId="q" imageUrl="https://cdn.test/a.png" file={null} alt="Carte" onChange={onChange} />);
    const preview = screen.getByTestId('question-image-preview');
    expect(preview).toHaveAttribute('alt', "Aperçu de l'image : Carte");
    expect(preview).toHaveAttribute('loading', 'lazy');
    expect(screen.getByRole('button', { name: /Remplacer/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Supprimer l'image/ }));
    expect(onChange).toHaveBeenCalledWith({ imageUrl: null, file: null });
  });
});
