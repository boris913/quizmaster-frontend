'use client';

import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import { ImagePlus, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuestionImageUploadError, uploadQuestionImage } from '@/lib/questionImage';
import { QUESTION_IMAGE_MIME_TYPES, validateQuestionImageFile } from '@/types';

export interface QuestionImageValue {
  /** Image déjà envoyée (URL publique). */
  imageUrl: string | null;
  /** Image choisie mais pas encore envoyée (quiz pas encore créé : envoi à l'enregistrement). */
  file: File | null;
}

interface QuestionImageFieldProps extends QuestionImageValue {
  /** Quiz existant : l'image est envoyée tout de suite via l'URL signée. Sinon elle reste en attente. */
  quizId?: string;
  onChange: (value: QuestionImageValue) => void;
  /** Texte alternatif de l'aperçu (énoncé de la question). */
  alt?: string;
}

function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}

/**
 * Image d'illustration d'une question : glisser-déposer ou sélection, contrôle du type et de
 * la taille côté client, aperçu, remplacement et suppression.
 */
export function QuestionImageField({ quizId, imageUrl, file, onChange, alt }: QuestionImageFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const objectUrl = useObjectUrl(file);
  const preview = imageUrl || objectUrl;
  const hasImage = Boolean(imageUrl || file);

  const handleFile = async (selected: File | undefined | null) => {
    if (!selected) return;
    const invalid = validateQuestionImageFile(selected);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    if (!quizId) {
      onChange({ imageUrl: null, file: selected });
      return;
    }
    setIsUploading(true);
    try {
      const url = await uploadQuestionImage(quizId, selected);
      onChange({ imageUrl: url, file: null });
    } catch (e) {
      setError(e instanceof QuestionImageUploadError ? e.message : "Échec de l'envoi de l'image.");
    } finally {
      setIsUploading(false);
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    void handleFile(event.dataTransfer?.files?.[0]);
  };

  const openPicker = () => inputRef.current?.click();

  return (
    <div className="space-y-1.5">
      <p className="text-small font-medium text-ink" id={`${inputId}-label`}>
        Image (facultatif)
      </p>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={QUESTION_IMAGE_MIME_TYPES.join(',')}
        className="sr-only"
        aria-labelledby={`${inputId}-label`}
        data-testid="question-image-input"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        data-testid="question-image-dropzone"
        className={cn(
          'rounded-md border-2 border-dashed p-3 transition-colors',
          isDragOver ? 'border-primary bg-primary-50' : 'border-borderc'
        )}
      >
        {hasImage && preview ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt={alt ? `Aperçu de l'image : ${alt}` : "Aperçu de l'image de la question"}
              loading="lazy"
              className="max-h-40 w-auto rounded-md object-contain"
              data-testid="question-image-preview"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openPicker}
                disabled={isUploading}
                className="inline-flex items-center gap-1 rounded-md border border-borderc px-3 py-1.5 text-small hover:bg-black/[0.04]"
              >
                <RefreshCw className="h-4 w-4" aria-hidden /> Remplacer
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  onChange({ imageUrl: null, file: null });
                }}
                disabled={isUploading}
                className="inline-flex items-center gap-1 rounded-md border border-borderc px-3 py-1.5 text-small text-danger hover:bg-danger-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden /> Supprimer l&apos;image
              </button>
              {file && !imageUrl && (
                <p className="w-full text-caption text-ink-secondary">
                  L&apos;image sera envoyée à l&apos;enregistrement du quiz.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2 text-center text-small text-ink-secondary">
            <ImagePlus className="h-6 w-6" aria-hidden />
            <p>Glissez une image ici ou</p>
            <button
              type="button"
              onClick={openPicker}
              disabled={isUploading}
              className="rounded-md border border-borderc bg-surface px-3 py-1.5 font-medium text-ink hover:bg-black/[0.04]"
            >
              Choisir une image
            </button>
            <p className="text-caption">PNG, JPEG, WebP ou GIF · 2 Mo maximum</p>
          </div>
        )}
        {isUploading && (
          <p className="mt-2 flex items-center gap-2 text-small text-ink-secondary" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Envoi de l&apos;image…
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
