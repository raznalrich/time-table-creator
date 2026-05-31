// src/app/core/guards/admin.guard.ts
// (Companion guard — restricts /admin/* to role === 'admin' only)

import { Injectable } from '@angular/core';
import {
  CanActivate,
  CanActivateChild,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
  UrlTree
} from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate, CanActivateChild {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    return this.checkAdmin();
  }

  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    return this.checkAdmin();
  }

  private checkAdmin(): Observable<boolean | UrlTree> {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (user?.role === 'admin') {
          return true;
        }
        // Logged-in teacher trying to hit /admin → redirect to their timetable
        if (user?.role === 'teacher') {
          return this.router.createUrlTree(['/teacher/timetable']);
        }
        // Not logged in at all → back to login
        return this.router.createUrlTree(['/login']);
      })
    );
  }
}