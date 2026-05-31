// src/app/core/interceptors/auth.interceptor.ts

import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, switchMap, take } from 'rxjs/operators';
import { Router } from '@angular/router';
import { getAuth, signOut } from 'firebase/auth';
import { getFirebaseApp } from '../utils/firebase-app';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private auth = (() => {
    const app = getFirebaseApp();
    return app ? getAuth(app) : null;
  })();

  constructor(
    private router: Router
  ) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {

    // Skip token attachment for non-API requests
    // (Firebase SDK handles its own auth internally)
    if (this.isFirebaseRequest(request.url)) {
      return next.handle(request);
    }

    // Get current Firebase user and attach ID token to request
    return from(this.getFirebaseToken()).pipe(
      take(1),
      switchMap(token => {
        if (token) {
          const authRequest = this.attachToken(request, token);
          return next.handle(authRequest);
        }
        // No token — pass request as-is
        return next.handle(request);
      }),
      catchError((error: HttpErrorResponse) =>
        this.handleError(error)
      )
    );
  }

  // ── Get Firebase ID token from current user ──
  private async getFirebaseToken(): Promise<string | null> {
    const user = this.auth?.currentUser;
    if (!user) return null;
    try {
      // forceRefresh = false: uses cached token unless expired
      return await user.getIdToken(false);
    } catch (error) {
      console.error('AuthInterceptor: Failed to get ID token', error);
      return null;
    }
  }

  // ── Clone request and attach Bearer token header ──
  private attachToken(
    request: HttpRequest<unknown>,
    token: string
  ): HttpRequest<unknown> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Skip Firebase internal SDK URLs ──
  private isFirebaseRequest(url: string): boolean {
    const firebaseHosts = [
      'firestore.googleapis.com',
      'firebase.googleapis.com',
      'identitytoolkit.googleapis.com',
      'securetoken.googleapis.com',
      'firebaseinstallations.googleapis.com'
    ];
    return firebaseHosts.some(host => url.includes(host));
  }

  // ── Centralised HTTP error handler ──
  private handleError(error: HttpErrorResponse): Observable<never> {
    switch (error.status) {

      case 401:
        // Token expired or invalid — logout and redirect
        console.warn('AuthInterceptor: 401 Unauthorized — redirecting to login');
        if (this.auth) {
          signOut(this.auth).then(() => {
            this.router.navigate(['/login'], {
              queryParams: { reason: 'session_expired' }
            });
          });
        }
        break;

      case 403:
        // Authenticated but not permitted
        console.warn('AuthInterceptor: 403 Forbidden — insufficient permissions');
        this.router.navigate(['/login'], {
          queryParams: { reason: 'forbidden' }
        });
        break;

      case 0:
        // Network failure / CORS
        console.error('AuthInterceptor: Network error or CORS issue', error);
        break;

      default:
        console.error(`AuthInterceptor: HTTP ${error.status}`, error.message);
        break;
    }

    return throwError(() => error);
  }
}