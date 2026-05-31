import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './guards/portal.guard';

export const routes: Routes = [
	{
		path: 'login',
		loadComponent: () => import('./features/auth/login/login').then(m => m.Login),
		canActivate: [guestGuard],
	},
	{
		path: '',
		loadComponent: () => import('./portal/portal').then(m => m.Portal),
		canActivate: [authGuard],
	},
	{ path: '**', redirectTo: '' },
];
