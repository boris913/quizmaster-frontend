'use client';

import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { FileText, Upload } from 'lucide-react';

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
          <pre className="bg-white p-2 rounded text-xs">
            {`Question 1 [timer:30] [points:100]\nQuelle est la capitale ?\nA) Londres\nB) Berlin\nC) Paris [correct]\nD) Madrid`}
          </pre>
        </div>

        <Button onClick={handleSubmit} isLoading={isImporting} disabled={!questionsContent}>
          <Upload className="w-4 h-4 mr-2" />
          Importer
        </Button>
      </div>
    </Card>
  );
}