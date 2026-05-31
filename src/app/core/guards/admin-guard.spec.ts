import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AdminGuard } from './admin-guard';
import { AuthService } from '../services/auth.service';

describe('AdminGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AdminGuard,
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
    expect(TestBed.inject(AdminGuard)).toBeTruthy();
  });
});
