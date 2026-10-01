import { Component } from '@angular/core';
import { FeatureCard } from '../feature-card/feature-card';

interface Feature {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
}

@Component({
  imports: [FeatureCard],
  selector: 'app-fonctionalities',
  styleUrl: './fonctionalities.scss',
  templateUrl: './fonctionalities.html',
})
export class Fonctionalities {
  protected readonly features: readonly Feature[] = [
    {
      icon: 'school',
      title: 'De la maternelle à la prépa',
      description: 'Un programme par cycle, pas un programme unique mal adapté à tous.',
    },
    {
      icon: 'auto_awesome',
      title: 'Un tuteur disponible à toute heure',
      description: 'Il explique, corrige et génère des exercices sur ce que tu travailles.',
    },
    {
      icon: 'event_available',
      title: 'Des révisions planifiées',
      description: 'Ton emploi du temps et tes échéances décident de ce que tu révises aujourd’hui.',
    },
  ];
}
