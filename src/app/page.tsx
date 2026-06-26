'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Zap, Shield, Users } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center space-y-6">
          <h1 className="text-5xl font-bold tracking-tight text-neutral-900">
            QuizMaster
          </h1>
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
            Créez, gérez et participez à des quiz en temps réel avec vos amis ou votre public.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-6">
            <Button size="lg" asChild>
              <Link href="/login">Se connecter</Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/register">Créer un compte</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/player/join">Rejoindre un quiz</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <Card className="p-6 text-center space-y-2">
            <Zap className="w-10 h-10 mx-auto text-amber-500" />
            <h3 className="font-semibold">Temps réel</h3>
            <p className="text-sm text-neutral-600">Répondez instantanément et voyez les scores évoluer en direct.</p>
          </Card>
          <Card className="p-6 text-center space-y-2">
            <Shield className="w-10 h-10 mx-auto text-blue-500" />
            <h3 className="font-semibold">Facile à organiser</h3>
            <p className="text-sm text-neutral-600">Créez des sessions avec mot de passe et gérez le rythme.</p>
          </Card>
          <Card className="p-6 text-center space-y-2">
            <Users className="w-10 h-10 mx-auto text-green-500" />
            <h3 className="font-semibold">Scoring dynamique</h3>
            <p className="text-sm text-neutral-600">Plus vous répondez vite, plus vous marquez de points.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}