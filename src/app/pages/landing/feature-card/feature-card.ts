import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  imports: [MatCardModule, MatIconModule],
  selector: 'app-feature-card',
  styleUrl: './feature-card.scss',
  templateUrl: './feature-card.html',
})
export class FeatureCard {
  /** Nom d'un symbole Material, par exemple `school`. */
  readonly icon = input.required<string>();
  readonly title = input.required<string>();
  readonly description = input<string>('');
}
