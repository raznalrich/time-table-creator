import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClassFormModal } from './class-form-modal';

describe('ClassFormModal', () => {
  let component: ClassFormModal;
  let fixture: ComponentFixture<ClassFormModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClassFormModal],
    }).compileComponents();

    fixture = TestBed.createComponent(ClassFormModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
