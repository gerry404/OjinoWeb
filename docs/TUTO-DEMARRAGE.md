# Ojino : architecture et démarrage (landing, connexion, inscription)

> Stack vérifiée dans le repo : **Angular 22.1** (zoneless, SSR + hydratation), **Angular Material 22.2** + **CDK 22.2**, **Vitest**.
> Tout le code ci-dessous utilise les API réellement présentes dans ton `node_modules` (Signal Forms, `@Service`, `FormRoot`, `matButton`, `showProgress`…).

---

## 0. Pourquoi Angular Material, et ce que ça implique

**Ce que tu gagnes**
- Licence **MIT** : pas de clé, pas de bannière, pas de condition de revenus.
- Même équipe et mêmes versions qu'Angular : les mises à jour arrivent ensemble via `ng update`.
- **Accessibilité de très haut niveau** : focus, ARIA, clavier et lecteurs d'écran sont testés par Google.
- **Intégration native des Signal Forms** : `matInput` lit l'état `[formField]` pour afficher `<mat-error>`. `mat-form-field` pose lui-même `aria-invalid` et `aria-describedby`. Tu n'as rien à brancher à la main.

**Ce que tu dois accepter**
- Environ 35 composants. Pas d'éditeur riche, pas de graphiques, pas d'upload. `mat-table` est volontairement basique : le filtrage, l'export ou les colonnes figées sont à coder.
- Look **Material Design 3**. On personnalise via les **tokens** et les mixins `*-overrides`, jamais en cassant le CSS interne.

**La règle d'or** : Material est **la seule** bibliothèque de composants. Si un besoin manque, on choisit une lib **spécialisée** (ex. `ngx-echarts` pour les graphiques, Tiptap pour un éditeur), jamais une deuxième bibliothèque de composants généraliste.

---

## 1. Architecture

### 1.1 Principes

1. **Feature-first** : on range par domaine métier (`auth`, `landing`, `dashboard`), pas par type technique (`components/`, `services/`).
2. **Dépendances à sens unique** :
   ```
   features/*  ──►  shared/   ──►  (rien d'applicatif)
       │
       └──────►  core/
   layout/     ──►  shared/, core/
   ```
   - Une feature **n'importe jamais** une autre feature. Si deux features partagent quelque chose, ça remonte dans `shared/` (UI pure) ou dans `core/` (état et services globaux).
   - `shared/` ne connaît ni `core/` ni les features. Ce sont des briques sans état métier.
3. **Pages « smart », composants « dumb »** : la page injecte les services et orchestre. Les composants UI reçoivent des `input()` et émettent des `output()`, c'est tout.
4. **Tout est lazy** sauf `core/` : chaque feature a son `*.routes.ts` chargé via `loadChildren`.
5. **Pas de wrapper inutile autour de Material.** Ton `shared/components/button` et ton `shared/components/input` actuels n'ajoutent rien à `matButton` / `matInput`. Supprime-les. Un wrapper n'a de sens que s'il **ajoute** un comportement, par exemple un `app-password-field` avec le bouton afficher/masquer, réutilisé dans 3 écrans.

### 1.2 Arborescence cible

```
src/
├── environments/
│   ├── environment.ts
│   └── environment.development.ts
├── styles/
│   └── _theme.scss                   # thème Material + overrides
└── app/
    ├── core/                         # singletons, chargés une seule fois
    │   ├── auth/
    │   │   ├── auth.service.ts       # état de session (signals) + appels API
    │   │   ├── auth.guards.ts        # authGuard, guestGuard
    │   │   └── auth.models.ts
    │   └── http/
    │       ├── api-url.token.ts
    │       └── http.interceptors.ts
    ├── shared/                       # UI réutilisable, sans état métier
    │   └── ui/
    │       └── form-alert/form-alert.ts
    ├── layout/
    │   ├── public-layout/            # toolbar + footer (landing)
    │   └── auth-layout/              # carte centrée (login/register)
    ├── features/
    │   ├── landing/
    │   │   ├── landing-page.ts
    │   │   └── sections/             # hero, features, cta
    │   ├── auth/
    │   │   ├── auth.routes.ts
    │   │   └── pages/
    │   │       ├── login/
    │   │       ├── register/
    │   │       └── reset-password/
    │   └── not-found/
    ├── app.config.ts
    ├── app.config.server.ts
    ├── app.routes.ts
    ├── app.routes.server.ts
    └── app.ts
```

> Tes fichiers actuels `src/app/pages/auth/*` vont dans `src/app/features/auth/pages/*`, et `pages/not-found` va dans `features/not-found`. Nommage Angular v20+ : `login.ts`, pas `login.component.ts`. Tu le fais déjà, garde ça.

### 1.3 Alias d'import (`tsconfig.json`)

```jsonc
{
  "compilerOptions": {
    // ...existant
    "paths": {
      "@core/*": ["./src/app/core/*"],
      "@shared/*": ["./src/app/shared/*"],
      "@layout/*": ["./src/app/layout/*"],
      "@features/*": ["./src/app/features/*"],
      "@env/*": ["./src/environments/*"]
    }
  }
}
```

### 1.4 Faire respecter les règles automatiquement

Une règle d'architecture qui n'est pas vérifiée par un outil ne tient pas longtemps.

```bash
ng add angular-eslint
npm i -D eslint-plugin-boundaries
```

Configure `boundaries/element-types` pour interdire `features/a → features/b` et `shared → core`. Ajoute aussi `lint` dans la CI.

### 1.5 SSR : les règles à connaître dès le jour 1

Ton projet est en `outputMode: "server"` avec hydratation. Conséquences :

- **Pas de `window`, `document` ni `localStorage` au top-level** d'un service ou dans un constructeur. Utilise `afterNextRender()` ou `inject(PLATFORM_ID)` + `isPlatformBrowser`.
- **Choisis le mode de rendu par route** (`app.routes.server.ts`) :
  - landing : `Prerender` (HTML statique, idéal pour le SEO)
  - login/register : `Prerender` (pas de données utilisateur)
  - espace connecté : `Client` (le serveur ne connaît pas la session)
- **Auth = cookie `HttpOnly` posé par le backend**, pas de JWT dans `localStorage`. Un token en `localStorage` est lisible par n'importe quel script injecté (XSS). Le front ne manipule jamais le token, il envoie juste `withCredentials`.

---

## 2. Installation (✅ déjà fait)

```bash
npm uninstall primeng @primeuix/themes
ng add @angular/material --skip-confirmation --defaults
```

Résultat : `@angular/material` et `@angular/cdk` 22.2 sont dans `package.json`. Le thème M3 est dans `src/styles.scss`, et `index.html` charge Roboto et **Material Symbols Outlined**. Le build passe.

Il te reste à faire :

```bash
ng g environments
```

Petites corrections dans le repo :

- `src/index.html` : `<html lang="en">` → **`<html lang="fr">`** (AXE vérifie `html-lang-valid` et le lecteur d'écran prononcera mal le contenu sinon).
- `src/app/app.html` : supprime tout le placeholder et garde uniquement `<router-outlet />`. Retire aussi `RouterLink` des `imports` de `app.ts` (le build affiche le warning NG8113).
- `app.routes.ts` : la faute `Acceuil` disparaît avec les nouvelles routes (§4).

---

## 3. Configuration de base

### 3.1 Environnements

```ts
// src/environments/environment.ts
export const environment = {
  apiUrl: '/api',
};
```

```ts
// src/environments/environment.development.ts
export const environment = {
  apiUrl: 'http://localhost:3000/api',
};
```

### 3.2 Token d'URL d'API

```ts
// src/app/core/http/api-url.token.ts
import { InjectionToken } from '@angular/core';
import { environment } from '@env/environment';

export const API_URL = new InjectionToken<string>('API_URL', {
  factory: () => environment.apiUrl,
});
```

> Pourquoi un token plutôt qu'importer `environment` partout ? Parce qu'en test tu fais `{ provide: API_URL, useValue: '/fake' }`, et qu'aucun service ne dépend d'un fichier de build.

### 3.3 Thème Material (M3)

**Étape 1 : génère tes palettes à partir de ta couleur de marque**

```bash
ng generate @angular/material:theme-color
```

Le schematic te demande ta couleur primaire en hex (ex. `#4F46E5`) et génère `src/styles/_theme-colors.scss` avec `$primary-palette` et `$tertiary-palette`. Il vérifie aussi le **contraste** : M3 garantit l'AA sur les rôles `on-*` (`on-primary`, `on-surface`…).

**Étape 2 : centralise le thème dans un partial**

```scss
// src/styles/_theme.scss
@use '@angular/material' as mat;
@use './theme-colors' as brand; // généré à l'étape 1

@mixin apply() {
  html {
    color-scheme: light; // passe à `light dark` pour suivre le système
    @include mat.theme((
      color: (
        primary: brand.$primary-palette,
        tertiary: brand.$tertiary-palette,
      ),
      typography: (plain-family: 'Roboto', brand-family: 'Roboto'),
      density: 0,
    ));
  }

  // Personnalisation via l'API officielle : jamais de ::ng-deep
  :root {
    @include mat.form-field-overrides((
      outlined-container-shape: 12px,
    ));
    @include mat.button-overrides((
      filled-container-shape: 12px,
      outlined-container-shape: 12px,
    ));
    @include mat.card-overrides((
      outlined-container-shape: 16px,
    ));
  }
}
```

> Tant que tu n'as pas lancé le schematic, remplace `brand.$primary-palette` par `mat.$azure-palette` (la valeur actuelle).
> Les noms de tokens disponibles pour chaque `*-overrides` sont listés dans l'onglet **Styling** de chaque composant sur material.angular.dev.

**Étape 3 : `styles.scss` réduit à l'essentiel**

```scss
// src/styles.scss
@use './styles/theme';

@include theme.apply();

*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100dvh;
  background-color: var(--mat-sys-surface);
  color: var(--mat-sys-on-surface);
  font: var(--mat-sys-body-large);
}

img { max-width: 100%; display: block; }

.container { width: min(72rem, 100% - 2rem); margin-inline: auto; }

.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

> **Règle de style** : dans tes composants, utilise **uniquement** les variables système `--mat-sys-*` (`--mat-sys-primary`, `--mat-sys-on-surface-variant`, `--mat-sys-outline-variant`, `--mat-sys-surface-container`, `--mat-sys-headline-large`…). Aucune couleur en dur : le dark mode et les changements de marque deviennent gratuits.

### 3.4 Intercepteurs HTTP

```ts
// src/app/core/http/http.interceptors.ts
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_URL } from './api-url.token';

/** Envoie le cookie de session uniquement vers notre API. */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const apiUrl = inject(API_URL);
  return next(req.url.startsWith(apiUrl) ? req.clone({ withCredentials: true }) : req);
};

/** Session expirée → retour au login, sans casser les pages publiques. */
export const unauthorizedInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  return next(req).pipe(
    catchError((error: unknown) => {
      const isAuthCall = req.url.includes('/auth/');
      if (error instanceof HttpErrorResponse && error.status === 401 && !isAuthCall) {
        void router.navigate(['/auth/login'], {
          queryParams: { returnUrl: router.url },
        });
      }
      return throwError(() => error);
    }),
  );
};
```

### 3.5 `app.config.ts`

```ts
// src/app/app.config.ts
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MAT_ICON_DEFAULT_OPTIONS } from '@angular/material/icon';
import { AuthService } from '@core/auth/auth.service';
import { credentialsInterceptor, unauthorizedInterceptor } from '@core/http/http.interceptors';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(), // query params / params → input() des pages
      withViewTransitions(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    provideHttpClient(withFetch(), withInterceptors([credentialsInterceptor, unauthorizedInterceptor])),
    provideClientHydration(withEventReplay()),

    // index.html charge « Material Symbols Outlined » : il faut le dire à <mat-icon>,
    // sinon il cherche la police « material-icons » et affiche le texte brut.
    { provide: MAT_ICON_DEFAULT_OPTIONS, useValue: { fontSet: 'material-symbols-outlined' } },
    // Même apparence sur tous les champs, sans la répéter dans chaque template
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline', subscriptSizing: 'dynamic' } },

    // Récupère la session existante (cookie) avant le premier rendu navigateur
    provideAppInitializer(() => inject(AuthService).restoreSession()),
  ],
};
```

---

## 4. Routing

### 4.1 `app.routes.ts`

```ts
// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard, guestGuard } from '@core/auth/auth.guards';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('@layout/public-layout/public-layout'),
    children: [
      {
        path: '',
        loadComponent: () => import('@features/landing/landing-page'),
        title: 'Ojino | Accueil',
      },
    ],
  },
  {
    path: 'auth',
    canMatch: [guestGuard],
    loadChildren: () => import('@features/auth/auth.routes'),
  },
  {
    path: 'app',
    canMatch: [authGuard],
    // loadChildren: () => import('@features/dashboard/dashboard.routes'),
    children: [],
  },
  {
    path: '**',
    loadComponent: () => import('@features/not-found/not-found').then((m) => m.NotFound),
    title: 'Page introuvable',
  },
];
```

> Astuce : avec un **`export default`** sur le composant ou sur le tableau de routes, `loadComponent: () => import('...')` suffit, sans `.then(m => m.X)`. Je l'utilise pour tous les nouveaux fichiers.

### 4.2 `features/auth/auth.routes.ts`

```ts
import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('@layout/auth-layout/auth-layout'),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      { path: 'login', loadComponent: () => import('./pages/login/login'), title: 'Connexion | Ojino' },
      { path: 'register', loadComponent: () => import('./pages/register/register'), title: 'Inscription | Ojino' },
    ],
  },
] satisfies Routes;
```

### 4.3 `app.routes.server.ts`

```ts
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'auth/**', renderMode: RenderMode.Prerender },
  { path: 'app/**', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Server },
];
```

---

## 5. Couche Auth (`core/auth`)

### 5.1 Modèles

```ts
// src/app/core/auth/auth.models.ts
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}
```

### 5.2 Service

```ts
// src/app/core/auth/auth.service.ts
import { HttpClient } from '@angular/common/http';
import { PLATFORM_ID, Service, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '@core/http/api-url.token';
import { LoginRequest, RegisterRequest, User } from './auth.models';

@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly currentUser = signal<User | null>(null);

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  async restoreSession(): Promise<void> {
    if (!this.isBrowser) return; // le serveur ne connaît pas le cookie utilisateur
    try {
      const user = await firstValueFrom(this.http.get<User>(`${this.apiUrl}/auth/me`));
      this.currentUser.set(user);
    } catch {
      this.currentUser.set(null);
    }
  }

  async login(credentials: LoginRequest): Promise<void> {
    const user = await firstValueFrom(
      this.http.post<User>(`${this.apiUrl}/auth/login`, credentials),
    );
    this.currentUser.set(user);
  }

  async register(payload: RegisterRequest): Promise<void> {
    const user = await firstValueFrom(
      this.http.post<User>(`${this.apiUrl}/auth/register`, payload),
    );
    this.currentUser.set(user);
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.post<void>(`${this.apiUrl}/auth/logout`, {}));
    this.currentUser.set(null);
  }
}
```

> **Pourquoi des `Promise` ici ?** Les actions de soumission des Signal Forms attendent une `Promise`. Pour du one-shot (login, register), `firstValueFrom` est plus lisible qu'un `subscribe`. Garde les `Observable` pour les flux (recherche, websockets…).

### 5.3 Guards fonctionnels

```ts
// src/app/core/auth/auth.guards.ts
import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanMatchFn = (_route, segments) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const returnUrl = '/' + segments.map((s) => s.path).join('/');
  return auth.isAuthenticated() || router.createUrlTree(['/auth/login'], { queryParams: { returnUrl } });
};

export const guestGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return !auth.isAuthenticated() || router.createUrlTree(['/app']);
};
```

> `canMatch` plutôt que `canActivate` : si le guard refuse, **le chunk lazy n'est même pas téléchargé**.

---

## 6. Layouts

### 6.1 Layout public (toolbar + footer + skip link)

```ts
// src/app/layout/public-layout/public-layout.ts
import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule],
  template: `
    <a class="skip-link" href="#main">Aller au contenu</a>

    <header>
      <mat-toolbar class="toolbar">
        <nav class="container nav" aria-label="Navigation principale">
          <a routerLink="/" class="brand" aria-label="Ojino, accueil">Ojino</a>
          <div class="nav-actions">
            <a matButton routerLink="/auth/login">Connexion</a>
            <a matButton="filled" routerLink="/auth/register">Créer un compte</a>
          </div>
        </nav>
      </mat-toolbar>
    </header>

    <main id="main" tabindex="-1">
      <router-outlet />
    </main>

    <footer class="footer">
      <div class="container">© Ojino</div>
    </footer>
  `,
  styles: `
    :host { display: flex; flex-direction: column; min-height: 100dvh; }
    main { flex: 1; outline: none; }
    .skip-link {
      position: absolute; left: 1rem; top: -3rem; z-index: 100; padding: .5rem 1rem;
      background: var(--mat-sys-primary); color: var(--mat-sys-on-primary);
      border-radius: var(--mat-sys-corner-small);
    }
    .skip-link:focus { top: 1rem; }
    .toolbar { background: var(--mat-sys-surface); border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .nav { display: flex; align-items: center; justify-content: space-between; }
    .brand { font: var(--mat-sys-title-large); color: var(--mat-sys-on-surface); text-decoration: none; }
    .nav-actions { display: flex; gap: .5rem; }
    .footer {
      padding-block: 2rem; font: var(--mat-sys-body-medium);
      color: var(--mat-sys-on-surface-variant); border-top: 1px solid var(--mat-sys-outline-variant);
    }
  `,
})
export default class PublicLayout {}
```

### 6.2 Layout auth (carte centrée)

```ts
// src/app/layout/auth-layout/auth-layout.ts
import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet, RouterLink, MatCardModule],
  template: `
    <main class="wrapper">
      <a routerLink="/" class="brand">Ojino</a>
      <mat-card appearance="outlined" class="card">
        <mat-card-content>
          <router-outlet />
        </mat-card-content>
      </mat-card>
    </main>
  `,
  styles: `
    .wrapper {
      min-height: 100dvh; display: grid; place-content: center; gap: 1.5rem;
      padding: 1rem; background: var(--mat-sys-surface-container-low);
    }
    .brand { text-align: center; font: var(--mat-sys-headline-small); color: var(--mat-sys-on-surface); text-decoration: none; }
    .card { width: min(28rem, 100vw - 2rem); padding: 1rem; }
  `,
})
export default class AuthLayout {}
```

---

## 7. Landing page

### 7.1 Découpage

```
features/landing/
├── landing-page.ts          # assemble les sections, gère le SEO
└── sections/
    ├── hero-section.ts
    ├── features-section.ts
    └── cta-section.ts
```

Une section = un composant sans dépendance à un service. Toutes sont pré-rendues en HTML statique.

### 7.2 Page + SEO

```ts
// src/app/features/landing/landing-page.ts
import { Component, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { HeroSection } from './sections/hero-section';
import { FeaturesSection } from './sections/features-section';
import { CtaSection } from './sections/cta-section';

@Component({
  selector: 'app-landing-page',
  imports: [HeroSection, FeaturesSection, CtaSection],
  template: `
    <app-hero-section />
    <app-features-section />
    <app-cta-section />
  `,
})
export default class LandingPage {
  constructor() {
    const meta = inject(Meta);
    meta.updateTag({ name: 'description', content: 'Ojino : la phrase qui résume ta proposition de valeur.' });
    meta.updateTag({ property: 'og:title', content: 'Ojino' });
  }
}
```

### 7.3 Hero

Place ton image dans `public/images/hero.webp` (idéalement 1200×900, en WebP ou AVIF).

```ts
// src/app/features/landing/sections/hero-section.ts
import { Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-hero-section',
  imports: [NgOptimizedImage, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <section class="container hero" aria-labelledby="hero-title">
      <div>
        <h1 id="hero-title">Le titre qui vend Ojino en une ligne</h1>
        <p class="lead">Une phrase qui explique le bénéfice concret pour l'utilisateur.</p>
        <div class="actions">
          <a matButton="filled" routerLink="/auth/register">
            Commencer gratuitement
            <mat-icon iconPositionEnd>arrow_forward</mat-icon>
          </a>
          <a matButton="outlined" routerLink="/" fragment="features">Voir les fonctionnalités</a>
        </div>
      </div>
      <img
        ngSrc="images/hero.webp"
        width="1200"
        height="900"
        priority
        alt="Aperçu du tableau de bord Ojino"
      />
    </section>
  `,
  styles: `
    .hero {
      display: grid; gap: 3rem; align-items: center;
      padding-block: clamp(3rem, 8vw, 6rem);
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
    }
    h1 { font: var(--mat-sys-display-medium); margin: 0 0 1rem; }
    .lead { font: var(--mat-sys-title-large); color: var(--mat-sys-on-surface-variant); margin: 0 0 2rem; }
    .actions { display: flex; flex-wrap: wrap; gap: .75rem; }
    img { width: 100%; height: auto; border-radius: var(--mat-sys-corner-extra-large); }
  `,
})
export class HeroSection {}
```

> - **`priority`** sur l'image au-dessus de la ligne de flottaison (LCP). Aucune autre image ne doit l'avoir.
> - **Un seul `<h1>` par page**, ensuite des `<h2>` par section. AXE vérifie `heading-order` et `page-has-heading-one`.
> - `<mat-icon>` pose `aria-hidden="true"` par défaut. Une icône décorative ne demande donc rien de plus.
> - La typo `--mat-sys-display-medium` est **fixe** (45px). Si tu veux un titre fluide, écris `font-size: clamp(...)` après le `font:`.

### 7.4 Fonctionnalités (`mat-card` + projection)

```ts
// src/app/features/landing/sections/features-section.ts
import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-feature-card',
  imports: [MatCardModule, MatIconModule],
  host: { role: 'listitem' },
  template: `
    <mat-card appearance="outlined" class="card">
      <mat-card-content>
        <span class="icon"><mat-icon>{{ icon() }}</mat-icon></span>
        <h3>{{ title() }}</h3>
        <p>{{ description() }}</p>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .card { height: 100%; }
    .icon {
      display: inline-grid; place-items: center; width: 3rem; height: 3rem; margin-bottom: 1rem;
      border-radius: var(--mat-sys-corner-medium);
      background: var(--mat-sys-primary-container); color: var(--mat-sys-on-primary-container);
    }
    h3 { font: var(--mat-sys-title-medium); margin: 0 0 .5rem; }
    p { font: var(--mat-sys-body-medium); margin: 0; color: var(--mat-sys-on-surface-variant); }
  `,
})
export class FeatureCard {
  readonly icon = input.required<string>();
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}

@Component({
  selector: 'app-features-section',
  imports: [FeatureCard],
  template: `
    <section id="features" class="container section" aria-labelledby="features-title">
      <h2 id="features-title">Pourquoi Ojino</h2>
      <div class="grid" role="list">
        @for (feature of features; track feature.title) {
          <app-feature-card [icon]="feature.icon" [title]="feature.title" [description]="feature.description" />
        }
      </div>
    </section>
  `,
  styles: `
    .section { padding-block: 5rem; scroll-margin-top: 5rem; }
    h2 { font: var(--mat-sys-headline-large); text-align: center; margin: 0 0 3rem; }
    .grid { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); }
  `,
})
export class FeaturesSection {
  protected readonly features = [
    { icon: 'bolt', title: 'Rapide', description: 'Explique le bénéfice n°1.' },
    { icon: 'shield', title: 'Sécurisé', description: 'Explique le bénéfice n°2.' },
    { icon: 'monitoring', title: 'Mesurable', description: 'Explique le bénéfice n°3.' },
  ] as const;
}
```

> Garder `FeatureCard` dans ce fichier est un choix volontaire : elle ne sert qu'ici. Le jour où une autre feature en a besoin, elle part dans `shared/ui/`.
> Les noms d'icônes se trouvent sur https://fonts.google.com/icons (filtre « Material Symbols »).

### 7.5 CTA

```ts
// src/app/features/landing/sections/cta-section.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-cta-section',
  imports: [RouterLink, MatButtonModule],
  template: `
    <section class="container cta" aria-labelledby="cta-title">
      <h2 id="cta-title">Prêt à te lancer ?</h2>
      <p>Création de compte en moins d'une minute.</p>
      <a matButton="filled" routerLink="/auth/register">Créer mon compte</a>
    </section>
  `,
  styles: `
    .cta {
      text-align: center; padding: 4rem 1.5rem; margin-block: 3rem;
      border-radius: var(--mat-sys-corner-extra-large);
      background: var(--mat-sys-primary-container); color: var(--mat-sys-on-primary-container);
    }
    h2 { font: var(--mat-sys-headline-medium); margin: 0 0 .5rem; }
    p { font: var(--mat-sys-body-large); margin: 0 0 1.5rem; }
  `,
})
export class CtaSection {}
```

---

## 8. Formulaires : Signal Forms + Angular Material

### 8.1 Les règles

- **Signal Forms** (`@angular/forms/signals`), stables en v22 : `form()`, `[formField]`, `<form [formRoot]>`, validateurs par schéma.
- **`matInput` + `[formField]`** : Material 22 lit directement l'état du champ. Son `ErrorStateMatcher` a une méthode `isSignalErrorState` qui renvoie `invalid && touched`. Conséquences :
  - `<mat-error>` s'affiche au bon moment, **sans `@if` de ta part** ;
  - `mat-form-field` pose `aria-invalid` et relie `mat-error` / `mat-hint` via `aria-describedby` **automatiquement**.
- **`mat-checkbox`, `mat-select`, `mat-datepicker`** fonctionnent aussi avec `[formField]`, grâce au pont vers les `ControlValueAccessor`.
- **Erreur serveur** : l'action de soumission **retourne** une erreur de validation. Avec `fieldTree`, elle s'affiche sous le bon champ. Sans `fieldTree`, elle s'attache au formulaire.
- **Une seule erreur à la fois par champ** (la première) : c'est plus lisible et le lecteur d'écran n'a pas trois messages à annoncer.

### 8.2 Alerte de formulaire partagée

Material n'a pas de composant « alerte inline ». Voici le seul composant partagé à créer :

```ts
// src/app/shared/ui/form-alert/form-alert.ts
import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-form-alert',
  imports: [MatIconModule],
  host: { role: 'alert' },
  template: `<mat-icon>error</mat-icon><span>{{ message() }}</span>`,
  styles: `
    :host {
      display: flex; gap: .75rem; align-items: center; padding: .75rem 1rem;
      border-radius: var(--mat-sys-corner-medium); font: var(--mat-sys-body-medium);
      background: var(--mat-sys-error-container); color: var(--mat-sys-on-error-container);
    }
  `,
})
export class FormAlert {
  readonly message = input.required<string>();
}
```

> `role="alert"` : le message est annoncé immédiatement par le lecteur d'écran quand il apparaît. Le couple `error-container` / `on-error-container` est garanti AA par M3.

### 8.3 Page de connexion

```ts
// src/app/features/auth/pages/login/login.ts
import { Component, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { email, form, FormField, FormRoot, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '@core/auth/auth.service';
import { FormAlert } from '@shared/ui/form-alert/form-alert';

interface LoginModel {
  email: string;
  password: string;
}

@Component({
  selector: 'app-login',
  imports: [
    RouterLink, FormField, FormRoot,
    MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule,
    FormAlert,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export default class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Lu depuis ?returnUrl=… grâce à withComponentInputBinding() */
  readonly returnUrl = input<string>('/app');

  protected readonly showPassword = signal(false);

  private readonly model = signal<LoginModel>({ email: '', password: '' });

  protected readonly loginForm = form(
    this.model,
    (p) => {
      required(p.email, { message: "L'adresse e-mail est obligatoire." });
      email(p.email, { message: "Format d'e-mail invalide." });
      required(p.password, { message: 'Le mot de passe est obligatoire.' });
    },
    {
      submission: {
        action: async (f) => {
          try {
            await this.auth.login(f().value());
            await this.router.navigateByUrl(this.safeReturnUrl());
            return undefined;
          } catch (err) {
            return { kind: 'server', message: this.toMessage(err) };
          }
        },
      },
    },
  );

  /** Évite l'open redirect : on n'accepte que des chemins internes. */
  private safeReturnUrl(): string {
    const url = this.returnUrl();
    return url.startsWith('/') && !url.startsWith('//') ? url : '/app';
  }

  private toMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) return 'E-mail ou mot de passe incorrect.';
      if (err.status === 0) return 'Serveur injoignable. Vérifie ta connexion.';
    }
    return 'Une erreur est survenue. Réessaie dans un instant.';
  }
}
```

```html
<!-- src/app/features/auth/pages/login/login.html -->
<h1>Connexion</h1>
<p class="subtitle">Content de te revoir.</p>

<form [formRoot]="loginForm" class="form">
  @if (loginForm().errors()[0]; as error) {
    <app-form-alert [message]="error.message ?? ''" />
  }

  <mat-form-field>
    <mat-label>Adresse e-mail</mat-label>
    <input matInput type="email" autocomplete="email" [formField]="loginForm.email" />
    <mat-icon matPrefix>mail</mat-icon>
    @if (loginForm.email().errors()[0]; as error) {
      <mat-error>{{ error.message }}</mat-error>
    }
  </mat-form-field>

  <mat-form-field>
    <mat-label>Mot de passe</mat-label>
    <input
      matInput
      autocomplete="current-password"
      [type]="showPassword() ? 'text' : 'password'"
      [formField]="loginForm.password"
    />
    <mat-icon matPrefix>lock</mat-icon>
    <button
      matIconButton
      matSuffix
      type="button"
      [attr.aria-label]="showPassword() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
      [attr.aria-pressed]="showPassword()"
      (click)="showPassword.update((v) => !v)"
    >
      <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
    </button>
    @if (loginForm.password().errors()[0]; as error) {
      <mat-error>{{ error.message }}</mat-error>
    }
  </mat-form-field>

  <a routerLink="/auth/reset-password" class="forgot">Mot de passe oublié ?</a>

  <button
    matButton="filled"
    type="submit"
    class="submit"
    [showProgress]="loginForm().submitting()"
    [disabled]="loginForm().submitting()"
  >
    Se connecter
    <mat-progress-spinner progressIndicator mode="indeterminate" diameter="20" aria-label="Connexion en cours" />
  </button>
</form>

<p class="switch">
  Pas encore de compte ? <a routerLink="/auth/register">Créer un compte</a>
</p>
```

```scss
/* src/app/features/auth/pages/login/login.scss (partagé avec register) */
h1 { font: var(--mat-sys-headline-medium); margin: 0; }
.subtitle { font: var(--mat-sys-body-large); margin: .25rem 0 1.5rem; color: var(--mat-sys-on-surface-variant); }
.form { display: flex; flex-direction: column; gap: .75rem; }
mat-form-field { width: 100%; }
.forgot { align-self: flex-end; font: var(--mat-sys-label-large); color: var(--mat-sys-primary); }
.submit { width: 100%; height: 3rem; margin-top: .5rem; }
.switch { font: var(--mat-sys-body-medium); text-align: center; margin: 1.5rem 0 0; color: var(--mat-sys-on-surface-variant); }
.switch a { color: var(--mat-sys-primary); }
.checkbox-error { font: var(--mat-sys-body-small); color: var(--mat-sys-error); margin: -0.5rem 0 0 .75rem; }
```

> Ce qu'un revieweur senior regarde sur cette page :
> - `autocomplete="email"` / `current-password` → les gestionnaires de mots de passe fonctionnent (WCAG 1.3.5).
> - `<mat-label>` est un vrai label (Material le relie à l'input). Un placeholder ne remplace **jamais** un label.
> - Bouton œil : `type="button"`, sinon il soumet le formulaire. Il a aussi `aria-pressed` et un `aria-label` explicite.
> - `showProgress` (nouveau dans Material 22) affiche le spinner dans le bouton. `disabled` empêche la double soumission.
> - `returnUrl` filtré contre l'**open redirect** (`//evil.com`).
> - Message serveur **générique** (« e-mail ou mot de passe incorrect ») : on n'indique jamais lequel des deux est faux.

### 8.4 Page d'inscription (validation croisée)

```ts
// src/app/features/auth/pages/register/register.ts
import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import {
  email, form, FormField, FormRoot, minLength, pattern, required, validate,
} from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '@core/auth/auth.service';
import { FormAlert } from '@shared/ui/form-alert/form-alert';

interface RegisterModel {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

@Component({
  selector: 'app-register',
  imports: [
    RouterLink, FormField, FormRoot,
    MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule,
    FormAlert,
  ],
  templateUrl: './register.html',
  styleUrl: '../login/login.scss', // même mise en page que le login
})
export default class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly model = signal<RegisterModel>({
    name: '', email: '', password: '', confirmPassword: '', acceptTerms: false,
  });

  protected readonly registerForm = form(
    this.model,
    (p) => {
      required(p.name, { message: 'Le nom est obligatoire.' });

      required(p.email, { message: "L'adresse e-mail est obligatoire." });
      email(p.email, { message: "Format d'e-mail invalide." });

      required(p.password, { message: 'Le mot de passe est obligatoire.' });
      minLength(p.password, 12, { message: '12 caractères minimum.' });
      pattern(p.password, /[A-Z]/, { message: 'Au moins une majuscule.' });
      pattern(p.password, /\d/, { message: 'Au moins un chiffre.' });

      required(p.confirmPassword, { message: 'Confirme ton mot de passe.' });
      validate(p.confirmPassword, ({ value, valueOf }) =>
        value() && value() !== valueOf(p.password)
          ? { kind: 'mismatch', message: 'Les mots de passe ne correspondent pas.' }
          : undefined,
      );

      validate(p.acceptTerms, ({ value }) =>
        value() ? undefined : { kind: 'terms', message: 'Tu dois accepter les conditions.' },
      );
    },
    {
      submission: {
        action: async (f) => {
          const { name, email: mail, password } = f().value();
          try {
            await this.auth.register({ name, email: mail, password });
            await this.router.navigateByUrl('/app');
            return undefined;
          } catch (err) {
            if (err instanceof HttpErrorResponse && err.status === 409) {
              // Rattachée au champ e-mail : elle s'affiche dans son <mat-error>
              return { kind: 'taken', message: 'Un compte existe déjà avec cet e-mail.', fieldTree: f.email };
            }
            return { kind: 'server', message: 'Inscription impossible pour le moment.' };
          }
        },
      },
    },
  );

  /** mat-checkbox n'est pas dans un mat-form-field : on gère son erreur nous-mêmes. */
  protected readonly termsInvalid = computed(
    () => this.registerForm.acceptTerms().touched() && this.registerForm.acceptTerms().invalid(),
  );
}
```

```html
<!-- src/app/features/auth/pages/register/register.html -->
<h1>Créer un compte</h1>
<p class="subtitle">C'est gratuit et ça prend une minute.</p>

<form [formRoot]="registerForm" class="form">
  @if (registerForm().errors()[0]; as error) {
    <app-form-alert [message]="error.message ?? ''" />
  }

  <mat-form-field>
    <mat-label>Nom complet</mat-label>
    <input matInput autocomplete="name" [formField]="registerForm.name" />
    @if (registerForm.name().errors()[0]; as error) {
      <mat-error>{{ error.message }}</mat-error>
    }
  </mat-form-field>

  <mat-form-field>
    <mat-label>Adresse e-mail</mat-label>
    <input matInput type="email" autocomplete="email" [formField]="registerForm.email" />
    @if (registerForm.email().errors()[0]; as error) {
      <mat-error>{{ error.message }}</mat-error>
    }
  </mat-form-field>

  <mat-form-field>
    <mat-label>Mot de passe</mat-label>
    <input matInput type="password" autocomplete="new-password" [formField]="registerForm.password" />
    <mat-hint>12 caractères minimum, avec une majuscule et un chiffre.</mat-hint>
    @if (registerForm.password().errors()[0]; as error) {
      <mat-error>{{ error.message }}</mat-error>
    }
  </mat-form-field>

  <mat-form-field>
    <mat-label>Confirmer le mot de passe</mat-label>
    <input matInput type="password" autocomplete="new-password" [formField]="registerForm.confirmPassword" />
    @if (registerForm.confirmPassword().errors()[0]; as error) {
      <mat-error>{{ error.message }}</mat-error>
    }
  </mat-form-field>

  <mat-checkbox
    [formField]="registerForm.acceptTerms"
    [aria-describedby]="termsInvalid() ? 'terms-error' : ''"
  >
    J'accepte les <a routerLink="/legal/terms">conditions d'utilisation</a>
  </mat-checkbox>
  @if (termsInvalid()) {
    <p id="terms-error" class="checkbox-error">{{ registerForm.acceptTerms().errors()[0]?.message }}</p>
  }

  <button
    matButton="filled"
    type="submit"
    class="submit"
    [showProgress]="registerForm().submitting()"
    [disabled]="registerForm().submitting()"
  >
    Créer mon compte
    <mat-progress-spinner progressIndicator mode="indeterminate" diameter="20" aria-label="Création en cours" />
  </button>
</form>

<p class="switch">Déjà inscrit ? <a routerLink="/auth/login">Se connecter</a></p>
```

> - `<mat-hint>` est relié à l'input par `aria-describedby` : le lecteur d'écran annonce les règles **avant** que l'utilisateur ne tape. Material masque le hint quand une erreur s'affiche.
> - `fieldTree` (type `ValidationError.WithOptionalFieldTree`) rattache l'erreur 409 au champ e-mail.
> - Si le mot de passe change après la confirmation, l'erreur `mismatch` se recalcule toute seule : `valueOf(p.password)` est réactif.

---

## 9. Tests (Vitest, déjà configuré)

Au minimum pour ce premier lot :

| Quoi | Pourquoi |
|---|---|
| `AuthService` avec `provideHttpClientTesting()` | Login OK → `user()` rempli, 401 → exception |
| `authGuard` / `guestGuard` | Redirection et `returnUrl` |
| `Login` : submit avec champs vides | `mat-error` visibles, aucun appel HTTP |
| `Login` : `returnUrl=//evil.com` | Redirige vers `/app` |
| `Register` : mots de passe différents | Erreur `mismatch` |

```ts
// exemple : src/app/core/auth/auth.guards.spec.ts
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { authGuard } from './auth.guards';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  it('redirige vers /auth/login avec returnUrl si non connecté', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { isAuthenticated: () => false } }],
    });
    const result = TestBed.runInInjectionContext(() =>
      authGuard({}, [{ path: 'app' }, { path: 'settings' }] as never),
    ) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/auth/login?returnUrl=%2Fapp%2Fsettings');
  });
});
```

> Pour les tests de composants, utilise les **harnesses Material** (`@angular/material/input/testing`, `button/testing`…) : `await loader.getHarness(MatInputHarness.with({ selector: '[type=email]' }))`. Tes tests ne cassent plus quand Material change son DOM interne.

Ajoute un check d'accessibilité automatique : `npm i -D axe-core`, puis un test qui lance `axe.run()` sur le DOM rendu de chaque page.

---

## 10. Ordre de travail conseillé (1 commit = 1 étape)

1. `chore: replace primeng with angular material` ✅ (installation faite, à committer)
2. `chore: environments, path aliases, theme partial, icon/form-field defaults`
3. `refactor: move pages to features/, remove placeholder and unused wrappers`
4. `feat(core): auth service, guards, http interceptors`
5. `feat(layout): public and auth layouts`
6. `feat(landing): hero, features, cta sections`
7. `feat(auth): login page with signal forms`
8. `feat(auth): register page`
9. `test: auth service, guards, forms`
10. `ci: lint + test + build`

À chaque étape : `ng build` (vérifie les **budgets** : 4 kB max de style par composant, 500 kB en initial), puis `ng serve` et un passage clavier complet (Tab, Shift+Tab, Entrée, Espace).

---

## 11. Checklist « prêt pour la revue »

- [ ] Aucune feature n'importe une autre feature
- [ ] Toutes les routes de feature sont en lazy (`loadComponent` / `loadChildren`)
- [ ] Aucun `any`, aucun `subscribe` sans nettoyage, aucun accès `window`/`localStorage` hors navigateur
- [ ] Aucune couleur en dur : uniquement des `--mat-sys-*`, personnalisation via `mat.*-overrides`, zéro `::ng-deep`
- [ ] `MAT_ICON_DEFAULT_OPTIONS` configuré (sinon les icônes s'affichent en texte)
- [ ] `lang="fr"`, un seul `<h1>` par page, skip link fonctionnel
- [ ] Chaque champ a un `<mat-label>` et un `autocomplete`, et une seule `<mat-error>` à la fois
- [ ] Focus visible partout, contraste AA vérifié (Material le garantit sur ses rôles, à toi de vérifier tes surcharges)
- [ ] `prefers-reduced-motion` respecté
- [ ] Image LCP en `priority`, les autres en lazy (comportement par défaut de `ngSrc`)
- [ ] Tokens de session en cookie `HttpOnly` côté backend, jamais en `localStorage`
