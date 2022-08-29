import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DraftMessagesComponent } from './draft-messages.component';

describe('DraftMessagesComponent', () => {
  let component: DraftMessagesComponent;
  let fixture: ComponentFixture<DraftMessagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DraftMessagesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DraftMessagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
