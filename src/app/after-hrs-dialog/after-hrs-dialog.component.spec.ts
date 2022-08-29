import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AfterHrsDialogComponent } from './after-hrs-dialog.component';

describe('AfterHrsDialogComponent', () => {
  let component: AfterHrsDialogComponent;
  let fixture: ComponentFixture<AfterHrsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AfterHrsDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AfterHrsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
