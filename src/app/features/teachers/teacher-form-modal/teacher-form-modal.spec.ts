import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeacherFormModal } from './teacher-form-modal';

describe('TeacherFormModal', () => {
  let component: TeacherFormModal;
  let fixture: ComponentFixture<TeacherFormModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherFormModal],
    }).compileComponents();

    fixture = TestBed.createComponent(TeacherFormModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
