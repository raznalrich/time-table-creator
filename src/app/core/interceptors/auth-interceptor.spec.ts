import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthInterceptor } from './auth-interceptor';

describe('AuthInterceptor', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthInterceptor,
        {
          provide: Router,
          useValue: { navigate: () => Promise.resolve(true) },
        },
      ],
    });
  });

  it('should be created', () => {
    expect(TestBed.inject(AuthInterceptor)).toBeTruthy();
  });
});
