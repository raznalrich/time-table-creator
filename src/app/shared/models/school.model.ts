export type UserRole = 'admin' | 'teacher';
export type DayKey = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';

export interface PeriodSlot {
  id: string;
  shortLabel: string;
  label: string;
  start: string;
  end: string;
  minutes: number;
}

export interface BreakWindow {
  label: string;
  start: string;
  end: string;
  fridayEnd?: string;
}

export interface PortalUser {
  id: string;
  uid?: string;
  name: string;
  email: string;
  role: UserRole;
  teacherId?: string;
}

export interface TeacherRecord {
  id: string;
  name: string;
  email: string;
  teacherCode: string;
  weeklyCapacity: number;
  password?: string;
}

export interface ClassRecord {
  id: string;
  name: string;
  grade: string;
  division: string;
  strength: number;
  roomLabel: string;
}

export interface SubjectRecord {
  id: string;
  name: string;
  classId: string;
  teacherId: string;
  color: string;
  weeklyPeriods: number;
  firstPeriodOnly?: boolean;
}

export interface TimetableEntry {
  id: string;
  classId: string;
  day: DayKey;
  periodId: string;
  subjectId: string;
  teacherId: string;
}

export interface SchoolData {
  classes: ClassRecord[];
  teachers: TeacherRecord[];
  subjects: SubjectRecord[];
  entries: TimetableEntry[];
}

export interface SubjectAnalytics {
  id: string;
  subjectName: string;
  className: string;
  teacherName: string;
  targetPeriods: number;
  scheduledPeriods: number;
  scheduledHours: number;
  variance: number;
}

export interface TeacherAnalytics {
  id: string;
  teacherName: string;
  assignedClasses: number;
  assignedPeriods: number;
  scheduledPeriods: number;
  scheduledHours: number;
  weeklyCapacity: number;
  remainingCapacity: number;
  conflictCount: number;
}

export interface ClassAnalytics {
  id: string;
  className: string;
  filledPeriods: number;
  totalPeriods: number;
  coverage: number;
  subjectCount: number;
}

export interface DashboardSummary {
  classCount: number;
  teacherCount: number;
  subjectCount: number;
  scheduledPeriods: number;
  scheduledHours: number;
  teacherConflicts: number;
}

export const SCHOOL_DAYS: DayKey[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const TIMETABLE_PERIODS: PeriodSlot[] = [
  { id: 'p1', shortLabel: 'P1', label: 'First period', start: '9:58 AM', end: '10:45 AM', minutes: 47 },
  { id: 'p2', shortLabel: 'P2', label: 'Second period', start: '10:45 AM', end: '11:25 AM', minutes: 40 },
  { id: 'p3', shortLabel: 'P3', label: 'Third period', start: '11:30 AM', end: '12:10 PM', minutes: 40 },
  { id: 'p4', shortLabel: 'P4', label: 'Fourth period', start: '12:10 PM', end: '12:50 PM', minutes: 40 },
  { id: 'p5', shortLabel: 'P5', label: 'Fifth period', start: '1:40 PM', end: '2:15 PM', minutes: 35 },
  { id: 'p6', shortLabel: 'P6', label: 'Sixth period', start: '2:15 PM', end: '2:55 PM', minutes: 40 },
  { id: 'p7', shortLabel: 'P7', label: 'Seventh period', start: '3:00 PM', end: '3:30 PM', minutes: 30 },
  { id: 'p8', shortLabel: 'P8', label: 'Eighth period', start: '3:30 PM', end: '4:00 PM', minutes: 30 }
];

export const BREAK_WINDOWS: BreakWindow[] = [
  { label: 'Morning break', start: '11:25 AM', end: '11:30 AM' },
  { label: 'Lunch break', start: '12:50 PM', end: '1:35 PM', fridayEnd: '1:40 PM' },
  { label: 'Afternoon break', start: '2:55 PM', end: '3:00 PM' }
];