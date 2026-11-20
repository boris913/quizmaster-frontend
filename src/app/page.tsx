'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Zap, Shield, Users } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="max-w-content w-full">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-6"
        >
          <h1 className="text-display gradient-text">Kwizora</h1>
          <p className="text-body sm:text-h3 text-ink-secondary max-w-2xl mx-auto font-normal">
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
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          {[
            { icon: Zap, tone: 'text-warning', title: 'Temps réel', desc: 'Répondez instantanément et voyez les scores évoluer en direct.' },
            { icon: Shield, tone: 'text-primary', title: 'Facile à organiser', desc: 'Créez des sessions avec mot de passe et gérez le rythme.' },
            { icon: Users, tone: 'text-success', title: 'Scoring dynamique', desc: 'Plus vous répondez vite, plus vous marquez de points.' },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08, duration: 0.35 }}
            >
              <Card interactive className="p-6 text-center space-y-2 h-full">
                <item.icon className={`w-10 h-10 mx-auto ${item.tone}`} strokeWidth={1.5} />
                <h3 className="text-card-title text-ink">{item.title}</h3>
                <p className="text-small text-ink-secondary">{item.desc}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
