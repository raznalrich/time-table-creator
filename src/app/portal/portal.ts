import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SchoolPlannerService } from '../core/services/school-planner.service';
import {
  BREAK_WINDOWS,
  SCHOOL_DAYS,
  TIMETABLE_PERIODS,
  type DayKey,
  type PeriodSlot,
} from '../shared/models/school.model';

type AdminSection = 'overview' | 'timetable' | 'analytics';

@Component({
  selector: 'app-portal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './portal.html',
  styleUrl: './portal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Portal {
  protected readonly planner = inject(SchoolPlannerService);
  private readonly router = inject(Router);

  protected readonly days = SCHOOL_DAYS;
  protected readonly periods = TIMETABLE_PERIODS;
  protected readonly breaks = BREAK_WINDOWS;
  protected readonly summary = this.planner.dashboardSummary;
  protected readonly subjectAnalytics = this.planner.subjectAnalytics;
  protected readonly teacherAnalytics = this.planner.teacherAnalytics;
  protected readonly classAnalytics = this.planner.classAnalytics;

  protected activeSection: AdminSection = 'overview';
  protected selectedClassId = '';
  protected selectedTeacherId = '';

  protected classDraft = {
    name: '',
    grade: '',
    division: '',
    strength: 30,
    roomLabel: '',
  };

  protected teacherDraft = {
    name: '',
    email: '',
    teacherCode: '',
    weeklyCapacity: 30,
    password: 'teacher123',
  };

  protected subjectDraft = {
    name: '',
    classId: '',
    teacherId: '',
    color: '#0ea5e9',
    weeklyPeriods: 5,
  };

  constructor() {
    effect(() => {
      // Redirect to login if session expires
      if (this.planner.isReady() && !this.planner.currentUser()) {
        void this.router.navigate(['/login']);
        return;
      }

      const classes = this.planner.classes();
      if (classes.length > 0 && !classes.some((c) => c.id === this.selectedClassId)) {
        this.selectedClassId = classes[0].id;
      }

      const teachers = this.planner.teachers();
      const activeTeacherId = this.currentUser()?.teacherId ?? this.selectedTeacherId;
      if (teachers.length > 0 && !teachers.some((t) => t.id === activeTeacherId)) {
        this.selectedTeacherId = teachers[0].id;
      }

      if (!this.subjectDraft.classId && classes.length > 0) {
        this.subjectDraft.classId = classes[0].id;
      }

      if (!this.subjectDraft.teacherId && teachers.length > 0) {
        this.subjectDraft.teacherId = teachers[0].id;
      }

      const teacherUser = this.currentUser();
      if (teacherUser?.role === 'teacher' && teacherUser.teacherId) {
        this.selectedTeacherId = teacherUser.teacherId;
      }
    });
  }

  protected currentUser() {
    return this.planner.currentUser();
  }

  protected isAdmin(): boolean {
    return this.currentUser()?.role === 'admin';
  }

  protected isTeacher(): boolean {
    return this.currentUser()?.role === 'teacher';
  }

  protected selectedTeacherScheduleId(): string {
    return this.currentUser()?.teacherId ?? this.selectedTeacherId;
  }

  protected async logout(): Promise<void> {
    await this.planner.logout();
    void this.router.navigate(['/login']);
  }

  protected async saveClass(): Promise<void> {
    await this.planner.addClass({
      ...this.classDraft,
      strength: Number(this.classDraft.strength),
    });
    this.classDraft = { name: '', grade: '', division: '', strength: 30, roomLabel: '' };
  }

  protected async deleteClass(classId: string): Promise<void> {
    await this.planner.deleteClass(classId);
  }

  protected async saveTeacher(): Promise<void> {
    await this.planner.addTeacher({
      ...this.teacherDraft,
      weeklyCapacity: Number(this.teacherDraft.weeklyCapacity),
    });
    this.teacherDraft = { name: '', email: '', teacherCode: '', weeklyCapacity: 30, password: 'teacher123' };
  }

  protected async deleteTeacher(teacherId: string): Promise<void> {
    await this.planner.deleteTeacher(teacherId);
  }

  protected async saveSubject(): Promise<void> {
    await this.planner.addSubject({
      ...this.subjectDraft,
      weeklyPeriods: Number(this.subjectDraft.weeklyPeriods),
    });
    this.subjectDraft = {
      name: '',
      classId: this.selectedClassId,
      teacherId: this.planner.teachers()[0]?.id ?? '',
      color: '#0ea5e9',
      weeklyPeriods: 5,
    };
  }

  protected async deleteSubject(subjectId: string): Promise<void> {
    await this.planner.deleteSubject(subjectId);
  }

  protected async updateCell(day: DayKey, periodId: string, subjectId: string): Promise<void> {
    if (!this.selectedClassId) return;
    await this.planner.setTimetableEntry(this.selectedClassId, day, periodId, subjectId || null);
  }

  protected async generateTimetable(): Promise<void> {
    await this.planner.generateTimetable();
  }

  protected entrySubjectId(day: DayKey, periodId: string): string {
    return this.planner.entryForClassPeriod(this.selectedClassId, day, periodId)?.subjectId ?? '';
  }

  protected subjectName(subjectId: string | undefined): string {
    return this.planner.subjectById(subjectId)?.name ?? 'Free';
  }

  protected subjectColor(subjectId: string | undefined): string {
    return this.planner.subjectById(subjectId)?.color ?? '#dbe4f0';
  }

  protected teacherName(teacherId: string | undefined): string {
    return this.planner.teacherById(teacherId)?.name ?? 'Unassigned';
  }

  protected classLabel(classId: string | undefined): string {
    return classId ? this.planner.toClassLabel(classId) : 'Unknown class';
  }

  protected classSubjects(): ReturnType<SchoolPlannerService['subjectsForClass']> {
    return this.planner.subjectsForClass(this.selectedClassId);
  }

  protected selectedClassLabel(): string {
    return this.classLabel(this.selectedClassId);
  }

  protected teacherEntry(day: DayKey, periodId: string) {
    return this.planner.entryForTeacherPeriod(this.selectedTeacherScheduleId(), day, periodId);
  }

  protected teacherConflict(day: DayKey, periodId: string): boolean {
    return this.planner.teacherConflictAt(this.selectedTeacherScheduleId(), day, periodId);
  }

  protected selectedTeacherName(): string {
    return this.teacherName(this.selectedTeacherScheduleId());
  }

  protected selectedTeacherMetrics() {
    return this.teacherAnalytics().find((t) => t.id === this.selectedTeacherScheduleId()) ?? null;
  }

  protected periodRange(period: PeriodSlot): string {
    return `${period.start} - ${period.end}`;
  }
}
