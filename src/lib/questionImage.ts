import api from '@/lib/api';
import {
  buildImageUploadUrlRequest,
  normalizeImageUploadUrl,
  validateQuestionImageFile,
} from '@/types';

/** Erreur d'upload au message lisible par l'enseignant. */
export class QuestionImageUploadError extends Error {}

/**
 * Envoie une image de question en deux temps :
 * 1. `POST /api/quizzes/:id/questions/image-upload-url` : le backend (clé service côté serveur
 *    uniquement) renvoie une URL signée d'upload et l'URL publique de l'image ;
 * 2. `PUT` du fichier directement sur le stockage via l'URL signée (sans le jeton de l'app).
 *
 * Le type et la taille sont contrôlés avant tout appel réseau. Renvoie l'URL publique,
 * à enregistrer dans `image_url`.
 */
export async function uploadQuestionImage(quizId: string, file: File): Promise<string> {
  const invalid = validateQuestionImageFile(file);
  if (invalid) throw new QuestionImageUploadError(invalid);

  let target;
  try {
    const { data } = await api.post(
      `/quizzes/${quizId}/questions/image-upload-url`,
      buildImageUploadUrlRequest(file)
    );
    target = normalizeImageUploadUrl(data);
  } catch (error: any) {
    const message = error?.response?.data?.message;
    throw new QuestionImageUploadError(
      typeof message === 'string' && message ? message : "Impossible de préparer l'envoi de l'image."
    );
  }
  if (!target) throw new QuestionImageUploadError("Réponse inattendue du serveur pour l'envoi de l'image.");

  let response: Response;
  try {
    response = await fetch(target.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
  } catch {
    throw new QuestionImageUploadError("Échec de l'envoi de l'image. Vérifiez votre connexion.");
  }
  if (!response.ok) {
    throw new QuestionImageUploadError("Le stockage a refusé l'image. Réessayez.");
  }
  return target.publicUrl;
}

/**
 * Téléverse les images encore en attente (choisies avant la création du quiz) et renvoie
 * des payloads sans `image_file`. Une image en échec n'empêche pas l'enregistrement de sa
 * question : elle est simplement retirée et signalée dans `failures`.
 */
export async function resolvePendingQuestionImages<T extends { image_file?: File; image_url?: string }>(
  quizId: string,
  questions: T[]
): Promise<{ questions: Omit<T, 'image_file'>[]; failures: number[] }> {
  const failures: number[] = [];
  const resolved = await Promise.all(
    questions.map(async (question, index) => {
      const { image_file: file, ...rest } = question;
      if (!file) return rest;
      try {
        return { ...rest, image_url: await uploadQuestionImage(quizId, file) };
      } catch {
        failures.push(index);
        return rest;
      }
    })
  );
  return { questions: resolved, failures: failures.sort((a, b) => a - b) };
}
