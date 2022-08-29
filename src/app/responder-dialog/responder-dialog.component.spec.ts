import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResponderDialogComponent } from './responder-dialog.component';

describe('ResponderDialogComponent', () => {
  let component: ResponderDialogComponent;
  let fixture: ComponentFixture<ResponderDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ResponderDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ResponderDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
