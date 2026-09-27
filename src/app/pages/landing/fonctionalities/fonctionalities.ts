import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

@Component({
  imports: [RouterLink, MatButtonModule, MatIconModule, MatCardModule],
  selector: 'app-fonctionalities',
  styleUrl: './fonctionalities.scss',
  templateUrl: './fonctionalities.html',
})
export class Fonctionalities {}
