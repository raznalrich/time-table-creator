import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubjectFormModal } from './subject-form-modal';

describe('SubjectFormModal', () => {
  let component: SubjectFormModal;
  let fixture: ComponentFixture<SubjectFormModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubjectFormModal],
    }).compileComponents();

    fixture = TestBed.createComponent(SubjectFormModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
