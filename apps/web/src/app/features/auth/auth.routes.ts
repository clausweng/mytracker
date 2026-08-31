import { Route } from '@angular/router';

export const authRoutes: Route[] = [
  { path: 'login', loadComponent: () => import('./login-page.component').then((m) => m.LoginPageComponent) },
  {
    path: 'register',
    loadComponent: () => import('./register-page.component').then((m) => m.RegisterPageComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./forgot-password-page.component').then((m) => m.ForgotPasswordPageComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
];
