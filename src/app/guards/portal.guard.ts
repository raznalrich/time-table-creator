import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs/operators';
import { SchoolPlannerService } from '../core/services/school-planner.service';

/** Protect portal routes — redirect to /login if not authenticated. */
export const authGuard: CanActivateFn = () => {
  const planner = inject(SchoolPlannerService);
  const router  = inject(Router);

  if (planner.isReady()) {
    return planner.currentUser() ? true : router.createUrlTree(['/login']);
  }

  return toObservable(planner.isReady).pipe(
    filter(Boolean),
    take(1),
    map(() => (planner.currentUser() ? true : router.createUrlTree(['/login']))),
  );
};

/** Protect the login route — redirect to / if already authenticated. */
export const guestGuard: CanActivateFn = () => {
  const planner = inject(SchoolPlannerService);
  const router  = inject(Router);

  if (planner.isReady()) {
    return planner.currentUser() ? router.createUrlTree(['/']) : true;
  }

  return toObservable(planner.isReady).pipe(
    filter(Boolean),
    take(1),
    map(() => (planner.currentUser() ? router.createUrlTree(['/']) : true)),
  );
};
