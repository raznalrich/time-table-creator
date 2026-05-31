import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SchoolPlannerService } from '../../../core/services/school-planner.service';
import { type UserRole } from '../../../shared/models/school.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  protected readonly planner = inject(SchoolPlannerService);
  private readonly router = inject(Router);

  protected loginRole: UserRole = 'admin';
  protected loginEmail = 'admin@amups.com';
  protected loginPassword = 'admin@amups';
  protected loading = signal(false);

  protected async login(): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.planner.errorMessage.set('');

    await this.planner.login(this.loginEmail, this.loginPassword, this.loginRole);

    this.loading.set(false);

    if (!this.planner.errorMessage()) {
      void this.router.navigate(['/']);
    }
  }

  protected fillDemo(): void {
    if (this.loginRole === 'admin') {
      this.loginEmail = 'admin@amups.com';
      this.loginPassword = 'admin@amups';
      return;
    }

    const teacher = this.planner.teachers()[0];
    if (teacher) {
      this.loginEmail = teacher.email;
      this.loginPassword = (teacher as { password?: string }).password ?? 'teacher123';
    }
  }
}
