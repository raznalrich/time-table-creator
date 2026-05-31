// src/app/core/services/auth.service.ts
// (Required dependency — include this alongside auth.guard.ts)

import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {
  type Auth,
  type User,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  type Firestore,
  doc,
  getDoc,
  getFirestore
} from 'firebase/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { AppUser } from '../../shared/models/user.model';
import { getFirebaseApp } from '../utils/firebase-app';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private firebaseApp = getFirebaseApp();
  private auth: Auth | null = this.firebaseApp ? getAuth(this.firebaseApp) : null;
  private firestore: Firestore | null = this.firebaseApp ? getFirestore(this.firebaseApp) : null;

  // BehaviorSubject holds the enriched AppUser (with role + teacherId)
  private currentUserSubject = new BehaviorSubject<AppUser | null>(null);
  public currentUser$: Observable<AppUser | null> = this.currentUserSubject.asObservable();

  constructor(
    private router: Router
  ) {
    if (this.auth) {
      onAuthStateChanged(this.auth, async (firebaseUser: User | null) => {
        if (firebaseUser) {
          const appUser = await this.fetchUserProfile(firebaseUser.uid);
          this.currentUserSubject.next(appUser);
        } else {
          this.currentUserSubject.next(null);
        }
      });
    }
  }

  // ── Fetch user profile + role from Firestore ──
  private async fetchUserProfile(uid: string): Promise<AppUser | null> {
    if (!this.firestore) {
      return null;
    }

    try {
      const userDocRef = doc(this.firestore, `users/${uid}`);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        return { uid, ...userSnap.data() } as AppUser;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  // ── Login ──
  async login(email: string, password: string): Promise<void> {
    if (!this.auth) {
      throw new Error('Firebase Auth is not configured yet.');
    }

    const credential = await signInWithEmailAndPassword(
      this.auth,
      email,
      password
    );
    const appUser = await this.fetchUserProfile(credential.user.uid);
    this.currentUserSubject.next(appUser);

    // Redirect based on role
    if (appUser?.role === 'admin') {
      await this.router.navigate(['/admin/dashboard']);
    } else if (appUser?.role === 'teacher') {
      await this.router.navigate(['/teacher/timetable']);
    } else {
      await this.router.navigate(['/login']);
    }
  }

  // ── Logout ──
  async logout(): Promise<void> {
    if (this.auth) {
      await signOut(this.auth);
    }
    this.currentUserSubject.next(null);
    await this.router.navigate(['/login']);
  }

  // ── Convenience getters ──
  get currentUser(): AppUser | null {
    return this.currentUserSubject.getValue();
  }

  get isLoggedIn(): boolean {
    return this.currentUserSubject.getValue() !== null;
  }

  get isAdmin(): boolean {
    return this.currentUserSubject.getValue()?.role === 'admin';
  }

  get isTeacher(): boolean {
    return this.currentUserSubject.getValue()?.role === 'teacher';
  }

  get currentTeacherId(): string | null {
    return this.currentUserSubject.getValue()?.teacherId ?? null;
  }
}