'use client';

import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { FileText, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Exemple d'import couvrant les types du backend #7 (syntaxe du parseur backend :
 * marqueurs `[type: …]` sur la ligne « Question N », image `![texte](url)`, réponses
 * attendues `= …`). Sans marqueur : choix unique ou multiple selon le nombre de `[correct]`.
 */
export const IMPORT_FORMAT_EXAMPLE = `Question 1 [timer:30] [points:100]
Quelle est la capitale ?
![Carte de l'Europe](https://exemple.fr/carte-europe.png)
A) Londres
B) Berlin
C) Paris [correct]
D) Madrid
> Explication : Paris est la capitale de la France.

Question 2 [type: true_false] [points:50]
La Terre est plate.
= faux

Question 3 [type: ordering] [timer:40]
Remettez dans l'ordre chronologique (options dans l'ordre attendu) :
A) Antiquité
B) Moyen Âge
C) Renaissance

Question 4 [type: short_answer]
Capitale de l'Italie ?
= Rome
= Roma

Question 5 [type: poll]
Quel thème pour la prochaine séance ?
A) Volcans
B) Océans`;

interface QuestionImporterProps {
  onImport: (questionsContent: string, answersContent?: string) => Promise<void>;
  isImporting?: boolean;
}

const richCode = {
  b: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
  code: (chunks: React.ReactNode) => <code className="font-mono">{chunks}</code>,
};

export function QuestionImporter({ onImport, isImporting }: QuestionImporterProps) {
  const t = useTranslations('importer');
  const [questionsFile, setQuestionsFile] = useState<File | null>(null);
  const [answersFile, setAnswersFile] = useState<File | null>(null);
  const [questionsContent, setQuestionsContent] = useState('');
  const [answersContent, setAnswersContent] = useState('');

  const handleFileRead = (file: File, setContent: (text: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => setContent(e.target?.result as string);
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    await onImport(questionsContent, answersContent || undefined);
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-2 text-card-title">
        <FileText className="w-5 h-5" aria-hidden />
        {t('title')}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-small font-medium text-ink-secondary">{t('questionsFile')}</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="file"
              accept=".md,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setQuestionsFile(file);
                  handleFileRead(file, setQuestionsContent);
                }
              }}
              className="text-sm"
            />
            {questionsFile && (
              <span className="text-sm text-success">{questionsFile.name}</span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-small font-medium text-ink-secondary">{t('answersFile')}</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="file"
              accept=".md,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setAnswersFile(file);
                  handleFileRead(file, setAnswersContent);
                }
              }}
              className="text-sm"
            />
            {answersFile && (
              <span className="text-sm text-success">{answersFile.name}</span>
            )}
          </div>
        </div>

        <div className="bg-subtle p-4 rounded-lg text-small text-ink-secondary space-y-2">
          <p>{t('format')}</p>
          <pre className="bg-surface border border-borderc p-2 rounded-sm text-caption overflow-x-auto" data-testid="import-format-example">
            {IMPORT_FORMAT_EXAMPLE}
          </pre>
          <p data-testid="import-explanation-help">
            {t.rich('explanationHelp', { code: (chunks) => <code className="font-mono">{chunks}</code> })}
          </p>
          <p>
            {t('keywordsNote')}
          </p>
          <ul className="list-disc space-y-1 pl-5" data-testid="import-types-help">
            <li>{t.rich('help.image', richCode)}</li>
            <li>{t.rich('help.type', richCode)}</li>
            <li>{t.rich('help.default', richCode)}</li>
          </ul>
        </div>

        <Button onClick={handleSubmit} isLoading={isImporting} disabled={!questionsContent}>
          <Upload className="w-4 h-4" />
          {t('submit')}
        </Button>
      </div>
    </Card>
  );
}