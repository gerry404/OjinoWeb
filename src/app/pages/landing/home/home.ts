import { Component } from '@angular/core';
import { Hero } from '../hero/hero';
import { Fonctionalities } from '../fonctionalities/fonctionalities';

@Component({
  imports: [Hero, Fonctionalities],
  selector: 'app-home',
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home {}
