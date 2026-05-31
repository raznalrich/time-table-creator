import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableGrid } from './timetable-grid';

describe('TimetableGrid', () => {
  let component: TimetableGrid;
  let fixture: ComponentFixture<TimetableGrid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimetableGrid],
    }).compileComponents();

    fixture = TestBed.createComponent(TimetableGrid);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
