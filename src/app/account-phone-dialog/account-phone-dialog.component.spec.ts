import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountPhoneDialogComponent } from './account-phone-dialog.component';

describe('AccountPhoneDialogComponent', () => {
  let component: AccountPhoneDialogComponent;
  let fixture: ComponentFixture<AccountPhoneDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountPhoneDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountPhoneDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
