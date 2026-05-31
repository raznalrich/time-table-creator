import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PeriodLegend } from './period-legend';

describe('PeriodLegend', () => {
  let component: PeriodLegend;
  let fixture: ComponentFixture<PeriodLegend>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PeriodLegend],
    }).compileComponents();

    fixture = TestBed.createComponent(PeriodLegend);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
