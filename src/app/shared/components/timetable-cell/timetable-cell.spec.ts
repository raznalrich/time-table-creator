import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableCell } from './timetable-cell';

describe('TimetableCell', () => {
  let component: TimetableCell;
  let fixture: ComponentFixture<TimetableCell>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimetableCell],
    }).compileComponents();

    fixture = TestBed.createComponent(TimetableCell);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
