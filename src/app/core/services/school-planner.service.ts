import { Injectable, computed, signal } from '@angular/core';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import { getFirebaseApp } from '../utils/firebase-app';
import {
  type ClassAnalytics,
  type ClassRecord,
  type DashboardSummary,
  type DayKey,
  type PortalUser,
  type SchoolData,
  type SubjectAnalytics,
  type SubjectRecord,
  type TeacherAnalytics,
  type TeacherRecord,
  type TimetableEntry,
  type UserRole,
  SCHOOL_DAYS,
  TIMETABLE_PERIODS,
} from '../../shared/models/school.model';

const STORAGE_KEY = 'ttc-school-data-v1';
const SESSION_KEY = 'ttc-session-v1';
const REMOTE_DOCUMENT_PATH = 'schools/default';
const ADMIN_EMAIL = 'admin@amups.com';
const ADMIN_PASSWORD = 'admin@amups';

@Injectable({
  providedIn: 'root',
})
export class SchoolPlannerService {
  private readonly emptyData: SchoolData = { classes: [], teachers: [], subjects: [], entries: [] };
  private readonly firebaseApp = getFirebaseApp();
  private readonly firestore = this.firebaseApp ? getFirestore(this.firebaseApp) : null;
  private readonly auth = this.firebaseApp ? getAuth(this.firebaseApp) : null;
  private readonly periodMinutes = new Map(TIMETABLE_PERIODS.map((period) => [period.id, period.minutes]));

  readonly isReady = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly data = signal<SchoolData>(this.emptyData);
  readonly currentUser = signal<PortalUser | null>(null);
  readonly isFirebaseEnabled = computed(() => Boolean(this.firebaseApp));

  readonly classes = computed(() => this.data().classes);
  readonly teachers = computed(() => this.data().teachers);
  readonly subjects = computed(() => this.data().subjects);
  readonly entries = computed(() => this.data().entries);

  readonly dashboardSummary = computed<DashboardSummary>(() => {
    const data = this.data();
    const scheduledPeriods = data.entries.length;
    const scheduledMinutes = data.entries.reduce((total, entry) => total + (this.periodMinutes.get(entry.periodId) ?? 0), 0);

    return {
      classCount: data.classes.length,
      teacherCount: data.teachers.length,
      subjectCount: data.subjects.length,
      scheduledPeriods,
      scheduledHours: roundHours(scheduledMinutes),
      teacherConflicts: countTeacherConflicts(data.entries),
    };
  });

  readonly subjectAnalytics = computed<SubjectAnalytics[]>(() => {
    const data = this.data();
    const classMap = new Map(data.classes.map((classroom) => [classroom.id, classroom]));
    const teacherMap = new Map(data.teachers.map((teacher) => [teacher.id, teacher]));

    return data.subjects
      .map((subject) => {
        const scheduledPeriods = data.entries.filter((entry) => entry.subjectId === subject.id).length;
        const scheduledMinutes = data.entries
          .filter((entry) => entry.subjectId === subject.id)
          .reduce((total, entry) => total + (this.periodMinutes.get(entry.periodId) ?? 0), 0);

        return {
          id: subject.id,
          subjectName: subject.name,
          className: toClassLabel(classMap.get(subject.classId)),
          teacherName: teacherMap.get(subject.teacherId)?.name ?? 'Unassigned',
          targetPeriods: subject.weeklyPeriods,
          scheduledPeriods,
          scheduledHours: roundHours(scheduledMinutes),
          variance: scheduledPeriods - subject.weeklyPeriods,
        };
      })
      .sort((left, right) => right.scheduledPeriods - left.scheduledPeriods || left.subjectName.localeCompare(right.subjectName));
  });

  readonly teacherAnalytics = computed<TeacherAnalytics[]>(() => {
    const data = this.data();
    const conflicts = buildTeacherConflictMap(data.entries);

    return data.teachers
      .map((teacher) => {
        const assignedSubjects = data.subjects.filter((subject) => subject.teacherId === teacher.id);
        const scheduledEntries = data.entries.filter((entry) => entry.teacherId === teacher.id);
        const assignedClasses = new Set(assignedSubjects.map((subject) => subject.classId)).size;
        const assignedPeriods = assignedSubjects.reduce((total, subject) => total + subject.weeklyPeriods, 0);
        const scheduledMinutes = scheduledEntries.reduce((total, entry) => total + (this.periodMinutes.get(entry.periodId) ?? 0), 0);

        return {
          id: teacher.id,
          teacherName: teacher.name,
          assignedClasses,
          assignedPeriods,
          scheduledPeriods: scheduledEntries.length,
          scheduledHours: roundHours(scheduledMinutes),
          weeklyCapacity: teacher.weeklyCapacity,
          remainingCapacity: teacher.weeklyCapacity - scheduledEntries.length,
          conflictCount: conflicts.get(teacher.id) ?? 0,
        };
      })
      .sort((left, right) => left.teacherName.localeCompare(right.teacherName));
  });

  readonly classAnalytics = computed<ClassAnalytics[]>(() => {
    const data = this.data();
    const totalPeriods = SCHOOL_DAYS.length * TIMETABLE_PERIODS.length;

    return data.classes
      .map((classroom) => {
        const classEntries = data.entries.filter((entry) => entry.classId === classroom.id);
        const classSubjects = data.subjects.filter((subject) => subject.classId === classroom.id);

        return {
          id: classroom.id,
          className: toClassLabel(classroom),
          filledPeriods: classEntries.length,
          totalPeriods,
          coverage: Math.round((classEntries.length / totalPeriods) * 100),
          subjectCount: classSubjects.length,
        };
      })
      .sort((left, right) => left.className.localeCompare(right.className));
  });

  constructor() {
    void this.initialize();
  }

  async login(email: string, password: string, role: UserRole): Promise<void> {
    this.errorMessage.set('');
    const normalizedEmail = email.trim().toLowerCase();

    if (this.auth) {
      try {
        const credential = await signInWithEmailAndPassword(this.auth, normalizedEmail, password);

        // Firebase Auth succeeded — resolve the portal profile
        let remoteUser = await this.fetchRemoteUserProfile(credential.user.uid);

        // Auto-provision admin profile when no Firestore doc exists yet
        if (!remoteUser && role === 'admin' && normalizedEmail === ADMIN_EMAIL) {
          remoteUser = {
            id: credential.user.uid,
            uid: credential.user.uid,
            name: 'School Admin',
            email: ADMIN_EMAIL,
            role: 'admin',
          };
        }

        if (!remoteUser) {
          await signOut(this.auth);
          this.errorMessage.set('This Firebase account has no timetable portal profile yet.');
          return;
        }

        if (remoteUser.role !== role) {
          await signOut(this.auth);
          this.errorMessage.set('This account does not match the selected portal.');
          return;
        }

        this.persistSession(remoteUser);
        return;
      } catch (error) {
        const msg = error instanceof Error ? error.message : '';
        // Firebase auth errors (invalid-credential, user-not-found, etc.) — fall through
        // to local/demo credential check below so the app works before Firebase Auth is
        // fully configured. Any other error (profile / role mismatch) is already handled
        // above with an explicit return, so only Firebase SDK errors reach here.
        if (!msg.includes('auth/')) {
          this.errorMessage.set(msg || 'Firebase login failed.');
          return;
        }
      }
    }

    // Fallback: local seed / demo credentials
    const demoUser = this.resolveDemoUser(normalizedEmail, password, role);
    if (!demoUser) {
      this.errorMessage.set('Invalid credentials. Please check your email and password.');
      return;
    }

    this.persistSession(demoUser);
  }

  async logout(): Promise<void> {
    if (this.auth?.currentUser) {
      await signOut(this.auth);
    }

    this.currentUser.set(null);
    localStorage.removeItem(SESSION_KEY);
  }

  async addClass(input: Omit<ClassRecord, 'id'>): Promise<void> {
    const nextClass: ClassRecord = { id: createId('class'), ...input };
    await this.updateData((current) => ({ ...current, classes: [...current.classes, nextClass] }));
  }

  async deleteClass(classId: string): Promise<void> {
    await this.updateData((current) => {
      const subjectIds = new Set(current.subjects.filter(s => s.classId === classId).map(s => s.id));
      return {
        ...current,
        classes:  current.classes.filter(c => c.id !== classId),
        subjects: current.subjects.filter(s => s.classId !== classId),
        entries:  current.entries.filter(e => e.classId !== classId && !subjectIds.has(e.subjectId)),
      };
    });
  }

  async addTeacher(input: Omit<TeacherRecord, 'id'>): Promise<void> {
    const nextTeacher: TeacherRecord = { id: createId('teacher'), ...input };
    await this.updateData((current) => ({ ...current, teachers: [...current.teachers, nextTeacher] }));
  }

  async deleteTeacher(teacherId: string): Promise<void> {
    await this.updateData((current) => {
      const subjectIds = new Set(current.subjects.filter(s => s.teacherId === teacherId).map(s => s.id));
      return {
        ...current,
        teachers: current.teachers.filter(t => t.id !== teacherId),
        subjects: current.subjects.filter(s => s.teacherId !== teacherId),
        entries:  current.entries.filter(e => e.teacherId !== teacherId && !subjectIds.has(e.subjectId)),
      };
    });
  }

  async addSubject(input: Omit<SubjectRecord, 'id'>): Promise<void> {
    const nextSubject: SubjectRecord = { id: createId('subject'), ...input };
    await this.updateData((current) => ({ ...current, subjects: [...current.subjects, nextSubject] }));
  }

  async deleteSubject(subjectId: string): Promise<void> {
    await this.updateData((current) => ({
      ...current,
      subjects: current.subjects.filter(s => s.id !== subjectId),
      entries:  current.entries.filter(e => e.subjectId !== subjectId),
    }));
  }

  async setTimetableEntry(classId: string, day: DayKey, periodId: string, subjectId: string | null): Promise<void> {
    await this.updateData((current) => {
      const remainingEntries = current.entries.filter(
        (entry) => !(entry.classId === classId && entry.day === day && entry.periodId === periodId),
      );

      if (!subjectId) {
        return {
          ...current,
          entries: remainingEntries,
        };
      }

      const subject = current.subjects.find((candidate) => candidate.id === subjectId && candidate.classId === classId);
      if (!subject) {
        return current;
      }

      const nextEntry: TimetableEntry = {
        id: createId('entry'),
        classId,
        day,
        periodId,
        subjectId,
        teacherId: subject.teacherId,
      };

      return {
        ...current,
        entries: [...remainingEntries, nextEntry],
      };
    });
  }

  subjectsForClass(classId: string): SubjectRecord[] {
    return this.subjects().filter((subject) => subject.classId === classId);
  }

  /**
   * Auto-generate a conflict-free timetable for ALL classes.
   *
   * Strategy:
   *  - For each class, build a pool of subject assignments (subject × weeklyPeriods).
   *  - Sort by descending weeklyPeriods so heavier subjects are placed first.
   *  - Candidate slots are ordered in a diagonal pattern (P1-Mon, P2-Tue, P3-Wed …)
   *    so each successive period of the same subject lands on a DIFFERENT day,
   *    spreading load evenly across the week.
   *  - A global teacher-busy map prevents any teacher from being double-booked.
   */
  async generateTimetable(): Promise<void> {
    const data = this.data();

    // Global: which (day, periodId) slots each teacher already owns
    const teacherBusy = new Map<string, Set<string>>();

    // Diagonal-ordered candidate slots: P1-Mon, P2-Tue, P3-Wed, P4-Thu, P5-Fri,
    // P6-Mon, P7-Tue, P8-Wed, P1-Thu … This ensures successive assignments for
    // the same subject hit different days.
    const nDays    = SCHOOL_DAYS.length;       // 5
    const nPeriods = TIMETABLE_PERIODS.length; // 8
    const total    = nDays * nPeriods;         // 40
    const orderedSlots: { day: DayKey; periodId: string }[] = [];
    for (let i = 0; i < total; i++) {
      const pIdx = i % nPeriods;
      const dIdx = (i + Math.floor(i / nPeriods)) % nDays;
      orderedSlots.push({ day: SCHOOL_DAYS[dIdx], periodId: TIMETABLE_PERIODS[pIdx].id });
    }

    const newEntries: TimetableEntry[] = [];

    for (const classroom of data.classes) {
      const subjects = data.subjects.filter((s) => s.classId === classroom.id);
      if (subjects.length === 0) continue;

      // Pool: each subject repeated weeklyPeriods times, heaviest first
      const pool: SubjectRecord[] = subjects
        .slice()
        .sort((a, b) => b.weeklyPeriods - a.weeklyPeriods)
        .flatMap((s) => Array.from({ length: s.weeklyPeriods }, () => s));

      const classSlotUsed = new Set<string>();

      for (const subject of pool) {
        if (!teacherBusy.has(subject.teacherId)) {
          teacherBusy.set(subject.teacherId, new Set());
        }
        const teacherSlots = teacherBusy.get(subject.teacherId)!;

        for (const slot of orderedSlots) {
          const key = `${slot.day}-${slot.periodId}`;
          if (classSlotUsed.has(key)) continue;
          if (teacherSlots.has(key)) continue;

          classSlotUsed.add(key);
          teacherSlots.add(key);

          newEntries.push({
            id: createId('entry'),
            classId: classroom.id,
            day: slot.day,
            periodId: slot.periodId,
            subjectId: subject.id,
            teacherId: subject.teacherId,
          });
          break;
        }
      }
    }

    await this.updateData((current) => ({ ...current, entries: newEntries }));
  }

  entryForClassPeriod(classId: string, day: DayKey, periodId: string): TimetableEntry | null {
    return this.entries().find(
      (entry) => entry.classId === classId && entry.day === day && entry.periodId === periodId,
    ) ?? null;
  }

  entryForTeacherPeriod(teacherId: string, day: DayKey, periodId: string): TimetableEntry | null {
    return this.entries().find(
      (entry) => entry.teacherId === teacherId && entry.day === day && entry.periodId === periodId,
    ) ?? null;
  }

  teacherConflictAt(teacherId: string, day: DayKey, periodId: string): boolean {
    return this.entries().filter(
      (entry) => entry.teacherId === teacherId && entry.day === day && entry.periodId === periodId,
    ).length > 1;
  }

  teacherById(teacherId: string | undefined): TeacherRecord | null {
    if (!teacherId) {
      return null;
    }

    return this.teachers().find((teacher) => teacher.id === teacherId) ?? null;
  }

  classById(classId: string | undefined): ClassRecord | null {
    if (!classId) {
      return null;
    }

    return this.classes().find((classroom) => classroom.id === classId) ?? null;
  }

  subjectById(subjectId: string | undefined): SubjectRecord | null {
    if (!subjectId) {
      return null;
    }

    return this.subjects().find((subject) => subject.id === subjectId) ?? null;
  }

  toClassLabel(classId: string): string {
    return toClassLabel(this.classById(classId));
  }

  private async initialize(): Promise<void> {
    try {
      const data = await this.loadSchoolData();
      this.data.set(data);
      this.restoreSession(data);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Failed to load the school planner.');
    } finally {
      this.isReady.set(true);
    }
  }

  private async loadSchoolData(): Promise<SchoolData> {
    // Always prefer Firestore when available
    if (this.firestore) {
      try {
        const snapshot = await getDoc(doc(this.firestore, REMOTE_DOCUMENT_PATH));
        if (snapshot.exists()) {
          // Clear any stale local cache so old seed data never bleeds back in
          localStorage.removeItem(STORAGE_KEY);
          return normalizeSchoolData(snapshot.data() as Partial<SchoolData>);
        }
        // Document doesn't exist yet — start empty and let the admin populate it
        localStorage.removeItem(STORAGE_KEY);
        return this.emptyData;
      } catch (error) {
        this.errorMessage.set(error instanceof Error ? error.message : 'Unable to reach Firebase.');
      }
    }

    // Offline fallback: use cached data, never inject seed data
    const cached = localStorage.getItem(STORAGE_KEY);
    if (!cached) {
      return this.emptyData;
    }

    try {
      return normalizeSchoolData(JSON.parse(cached) as Partial<SchoolData>);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return this.emptyData;
    }
  }

  private async fetchRemoteUserProfile(uid: string): Promise<PortalUser | null> {
    if (!this.firestore) {
      return null;
    }

    const snapshot = await getDoc(doc(this.firestore, `users/${uid}`));
    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data() as PortalUser;
    return {
      id: data.id ?? uid,
      uid,
      name: data.name,
      email: data.email,
      role: data.role,
      teacherId: data.teacherId,
    };
  }

  private resolveDemoUser(email: string, password: string, role: UserRole): PortalUser | null {
    if (role === 'admin' && email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      return {
        id: 'admin-demo',
        name: 'School Admin',
        email: ADMIN_EMAIL,
        role: 'admin',
      };
    }

    if (role !== 'teacher') {
      return null;
    }

    const teacher = this.data().teachers.find(
      (candidate) => candidate.email.toLowerCase() === email && candidate.password === password,
    );

    if (!teacher) {
      return null;
    }

    return {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      role: 'teacher',
      teacherId: teacher.id,
    };
  }

  private restoreSession(data: SchoolData): void {
    const cached = localStorage.getItem(SESSION_KEY);
    if (!cached) {
      return;
    }

    try {
      const user = JSON.parse(cached) as PortalUser;
      if (user.role === 'teacher' && user.teacherId && !data.teachers.some((teacher) => teacher.id === user.teacherId)) {
        localStorage.removeItem(SESSION_KEY);
        return;
      }

      this.currentUser.set(user);
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  private persistSession(user: PortalUser): void {
    this.currentUser.set(user);
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  private async updateData(mutator: (current: SchoolData) => SchoolData): Promise<void> {
    const nextData = mutator(this.data());
    this.data.set(nextData);
    await this.persistSchoolData(nextData);
  }

  private async persistSchoolData(data: SchoolData): Promise<void> {
    this.isSaving.set(true);
    this.errorMessage.set('');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    if (this.firestore) {
      try {
        await setDoc(doc(this.firestore, REMOTE_DOCUMENT_PATH), stripSensitiveData(data), { merge: true });
      } catch (error) {
        this.errorMessage.set(error instanceof Error ? error.message : 'Unable to save to Firebase.');
      }
    }

    this.isSaving.set(false);
  }
}

function normalizeSchoolData(raw: Partial<SchoolData>): SchoolData {
  const classes = Array.isArray(raw.classes) ? raw.classes.map(normalizeClass) : [];

  const teachers = Array.isArray(raw.teachers)
    ? raw.teachers.map((teacher) => normalizeTeacher(teacher))
    : [];

  const classIds = new Set(classes.map((classroom) => classroom.id));
  const teacherIds = new Set(teachers.map((teacher) => teacher.id));

  const subjects = Array.isArray(raw.subjects)
    ? raw.subjects
        .map(normalizeSubject)
        .filter((subject) => classIds.has(subject.classId) && teacherIds.has(subject.teacherId))
    : [];

  const subjectMap = new Map(subjects.map((subject) => [subject.id, subject]));
  const entries = Array.isArray(raw.entries)
    ? raw.entries
        .map(normalizeEntry)
        .filter((entry) => {
          const subject = subjectMap.get(entry.subjectId);
          return Boolean(subject) && classIds.has(entry.classId) && SCHOOL_DAYS.includes(entry.day);
        })
        .map((entry) => ({
          ...entry,
          teacherId: subjectMap.get(entry.subjectId)?.teacherId ?? entry.teacherId,
        }))
    : [];

  return { classes, teachers, subjects, entries };
}

function normalizeClass(value: Partial<ClassRecord>): ClassRecord {
  return {
    id: String(value.id ?? createId('class')),
    name: String(value.name ?? 'New Class'),
    grade: String(value.grade ?? 'Grade'),
    division: String(value.division ?? 'A'),
    strength: Number(value.strength ?? 0),
    roomLabel: String(value.roomLabel ?? 'Room'),
  };
}

function normalizeTeacher(value: Partial<TeacherRecord>): TeacherRecord {
  return {
    id: String(value.id ?? createId('teacher')),
    name: String(value.name ?? 'Teacher'),
    email: String(value.email ?? ''),
    teacherCode: String(value.teacherCode ?? 'TBD'),
    weeklyCapacity: Number(value.weeklyCapacity ?? 32),
    password: String(value.password ?? 'teacher123'),
  };
}

function normalizeSubject(value: Partial<SubjectRecord>): SubjectRecord {
  return {
    id: String(value.id ?? createId('subject')),
    name: String(value.name ?? 'Subject'),
    classId: String(value.classId ?? ''),
    teacherId: String(value.teacherId ?? ''),
    color: String(value.color ?? '#3B82F6'),
    weeklyPeriods: Number(value.weeklyPeriods ?? 0),
  };
}

function normalizeEntry(value: Partial<TimetableEntry>): TimetableEntry {
  return {
    id: String(value.id ?? createId('entry')),
    classId: String(value.classId ?? ''),
    day: (value.day as DayKey) ?? 'Monday',
    periodId: String(value.periodId ?? 'p1'),
    subjectId: String(value.subjectId ?? ''),
    teacherId: String(value.teacherId ?? ''),
  };
}

function stripSensitiveData(data: SchoolData): SchoolData {
  return {
    classes: data.classes,
    teachers: data.teachers.map(({ password, ...teacher }) => teacher),
    subjects: data.subjects,
    entries: data.entries,
  };
}

function toClassLabel(classroom: ClassRecord | null | undefined): string {
  if (!classroom) {
    return 'Unknown class';
  }

  return `${classroom.name} - ${classroom.division}`;
}

function roundHours(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10;
}

function countTeacherConflicts(entries: TimetableEntry[]): number {
  let conflicts = 0;
  const index = new Map<string, number>();

  for (const entry of entries) {
    const key = `${entry.teacherId}-${entry.day}-${entry.periodId}`;
    const nextCount = (index.get(key) ?? 0) + 1;
    index.set(key, nextCount);
    if (nextCount > 1) {
      conflicts += 1;
    }
  }

  return conflicts;
}

function buildTeacherConflictMap(entries: TimetableEntry[]): Map<string, number> {
  const slotCounts = new Map<string, number>();

  for (const entry of entries) {
    const key = `${entry.teacherId}-${entry.day}-${entry.periodId}`;
    slotCounts.set(key, (slotCounts.get(key) ?? 0) + 1);
  }

  const conflicts = new Map<string, number>();
  for (const [key, count] of slotCounts.entries()) {
    if (count <= 1) {
      continue;
    }

    const teacherId = key.split('-')[0];
    conflicts.set(teacherId, (conflicts.get(teacherId) ?? 0) + (count - 1));
  }

  return conflicts;
}

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}