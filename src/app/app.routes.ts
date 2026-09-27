import { Routes } from '@angular/router';
import { Login } from './pages/auth/login/login';
import { Home } from './pages/landing/home/home';
export const routes: Routes = [
    {
        path: '',
        component: Home,
        title: 'Acceuil',
    }, 
];
