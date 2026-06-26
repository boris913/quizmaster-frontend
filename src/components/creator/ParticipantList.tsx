'use client';

import { Participant } from '@/types';
import { ProgressBar } from '../ui/ProgressBar';
import { Card } from '../ui/Card';
import { Users, CheckCircle, Clock, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ParticipantListProps {
  participants: Participant[];
  progressMap?: Record<string, number>; // participantId -> answered count
}

const statusIcon = {
  waiting: <Clock className="w-3 h-3 text-neutral-400" />,
  answering: <Clock className="w-3 h-3 text-amber-500 animate-pulse" />,
  answered: <CheckCircle className="w-3 h-3 text-green-500" />,
  timeout: <UserX className="w-3 h-3 text-red-500" />,
  disconnected: <UserX className="w-3 h-3 text-neutral-400" />,
};

const statusLabel = {
  waiting: 'En attente',
  answering: 'En cours',
  answered: 'Répondu',
  timeout: 'Timeout',
  disconnected: 'Déconnecté',
};

export function ParticipantList({ participants, progressMap = {} }: ParticipantListProps) {
  const sorted = [...participants].sort((a, b) => b.score - a.score);

  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-semibold flex items-center gap-2">
        <Users className="w-4 h-4" />
        Participants ({participants.length})
      </h3>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {sorted.map((p) => {
          const progress = progressMap[p.id] || 0;
          return (
            <div key={p.id} className="flex items-center gap-3 text-sm">
              <span className="w-5 text-neutral-400 font-mono">
                {statusIcon[p.status]}
              </span>
              <span className="flex-1 font-medium">{p.pseudo}</span>
              <span className="text-xs text-neutral-500">
                {statusLabel[p.status]}
              </span>
              <span className="font-mono font-semibold min-w-12 text-right">
                {p.score}
              </span>
              <ProgressBar value={progress} max={100} className="w-24" barClassName="bg-blue-500" />
            </div>
          );
        })}
      </div>
    </Card>
  );
}