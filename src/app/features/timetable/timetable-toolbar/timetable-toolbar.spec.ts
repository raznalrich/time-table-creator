import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableToolbar } from './timetable-toolbar';

describe('TimetableToolbar', () => {
  let component: TimetableToolbar;
  let fixture: ComponentFixture<TimetableToolbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimetableToolbar],
    }).compileComponents();

    fixture = TestBed.createComponent(TimetableToolbar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
