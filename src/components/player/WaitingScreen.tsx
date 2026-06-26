'use client';

import { Loader2 } from 'lucide-react';
import { Card } from '../ui/Card';

interface WaitingScreenProps {
  message?: string;
  isPaused?: boolean;
}

export function WaitingScreen({ message = 'En attente de la prochaine question...', isPaused = false }: WaitingScreenProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="p-8 text-center max-w-md">
        {isPaused ? (
          <div className="space-y-3">
            <div className="text-4xl">⏸️</div>
            <h3 className="text-xl font-semibold">Quiz en pause</h3>
            <p className="text-neutral-600">Le créateur a mis le quiz en pause.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-neutral-400" />
            <h3 className="text-xl font-semibold">{message}</h3>
            <p className="text-sm text-neutral-500">Restez prêt, la question arrive !</p>
          </div>
        )}
      </Card>
    </div>
  );
}