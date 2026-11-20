'use client';

import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { FileText, Upload } from 'lucide-react';

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

export function QuestionImporter({ onImport, isImporting }: QuestionImporterProps) {
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
      <div className="flex items-center gap-2 text-lg font-semibold">
        <FileText className="w-5 h-5" />
        Importer depuis un fichier
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink-secondary">Questions.md</label>
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
          <label className="block text-sm font-medium text-ink-secondary">Reponses.md (optionnel)</label>
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

        <div className="bg-background p-4 rounded-lg text-sm text-ink-secondary space-y-1">
          <p>Format attendu :</p>
          <pre className="bg-subtle p-2 rounded text-xs overflow-x-auto" data-testid="import-format-example">
            {IMPORT_FORMAT_EXAMPLE}
          </pre>
          <p data-testid="import-explanation-help">
            Ligne facultative <code className="font-mono">&gt; Explication : …</code> sous la question, par exemple après les options
            (500 caractères maximum) : elle est montrée aux élèves après la clôture de la question.
          </p>
          <ul className="list-disc space-y-1 pl-5" data-testid="import-types-help">
            <li>
              <strong>Image</strong> : une ligne <code className="font-mono">![texte](https://…)</code> sous
              l&apos;en-tête (URL http(s) d&apos;une image).
            </li>
            <li>
              <strong>Type</strong> : marqueur <code className="font-mono">[type: …]</code> sur la ligne
              « Question N » (marqueurs dans n&apos;importe quel ordre) :{' '}
              <code className="font-mono">true_false</code> (Vrai / Faux, réponse{' '}
              <code className="font-mono">= vrai</code> ou <code className="font-mono">= faux</code>),{' '}
              <code className="font-mono">ordering</code> (options A à F écrites dans l&apos;ordre attendu,
              mélangées pour les élèves), <code className="font-mono">short_answer</code> (une ligne{' '}
              <code className="font-mono">= …</code> par réponse acceptée ; casse, accents et ponctuation
              finale ignorés), <code className="font-mono">poll</code> (sondage, sans bonne réponse ni point).
            </li>
            <li>Sans marqueur : réponse unique ou multiple selon le nombre de <code className="font-mono">[correct]</code>.</li>
          </ul>
        </div>

        <Button onClick={handleSubmit} isLoading={isImporting} disabled={!questionsContent}>
          <Upload className="w-4 h-4 mr-2" />
          Importer
        </Button>
      </div>
    </Card>
  );
}