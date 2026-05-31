import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { environment } from '../../../environments/environment';

function hasFirebaseValue(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function hasFirebaseConfig(): boolean {
  return [
    environment.firebase.apiKey,
    environment.firebase.authDomain,
    environment.firebase.projectId,
    environment.firebase.appId,
  ].every(hasFirebaseValue);
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!hasFirebaseConfig()) {
    return null;
  }

  const app = getApps()[0] ?? initializeApp(environment.firebase);

  // Boot Analytics asynchronously — safe to ignore if unavailable (e.g. SSR, ad-blockers)
  isSupported().then((supported) => {
    if (supported) {
      getAnalytics(app);
    }
  }).catch(() => { /* analytics not critical */ });

  return app;
}