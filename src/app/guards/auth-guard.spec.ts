import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthGuard } from './auth-guard';
import { AuthService } from '../core/services/auth.service';

describe('AuthGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        {
          provide: AuthService,
          useValue: { currentUser$: of(null) },
        },
        {
          provide: Router,
          useValue: { createUrlTree: () => ({}) },
        },
      ],
    });
  });

  it('should be created', () => {
    expect(TestBed.inject(AuthGuard)).toBeTruthy();
  });
});
