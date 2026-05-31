import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CellEditorModal } from './cell-editor-modal';

describe('CellEditorModal', () => {
  let component: CellEditorModal;
  let fixture: ComponentFixture<CellEditorModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CellEditorModal],
    }).compileComponents();

    fixture = TestBed.createComponent(CellEditorModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
