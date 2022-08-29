import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { AfterHrsDialogComponent } from '../after-hrs-dialog/after-hrs-dialog.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { LoggerService } from '../logger.service';
import { MessagesService } from '../messages/messages.service';
import { ResponderDialogComponent } from '../responder-dialog/responder-dialog.component';
import { SidenavService } from '../sidenav/sidenav.service';

@Component({
  selector: 'app-responder',
  templateUrl: './responder.component.html',
  styleUrls: ['./responder.component.scss']
})
export class ResponderComponent implements OnInit {
  responders: any = [];
  loadingContacts = false;
  isSmall$ = this.sidenavService.isSmall$;
  accountPhones: any = [];
  filteredAccPhones: any = [];
  selectedAccountPhone: any = {};
  userPref: any = {};
  searchAccPhone = new FormControl('');
  private destroy$ = new Subject<void>();
  dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  // dirtyResponders: number[]= [];

  constructor(
    private sidenavService: SidenavService,
    private messagesService: MessagesService,
    private snackbar: MatSnackBar,
    private dialog: MatDialog,
    private logger: LoggerService
  ) { }

  ngOnInit(): void {
    this.sidenavService.shrinkSidenav();
    this.getAccountPhones();
    this.searchAccPhone.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      ).subscribe(
        text => {
          this.filterAccPhones(text);
        }
      )

  }

  getAccountPhones() {
    this.loadingContacts = true;
    this.messagesService.getAccountPhones().subscribe({
      next: (res) => {
        this.accountPhones = res;
        this.filterAccPhones('');
        try {
          const userPref = JSON.parse(localStorage.getItem('userPref') || '{}');
          if (userPref && userPref.accountPhone) {
            this.selectedAccountPhone = userPref.accountPhone;
            this.userPref.accountPhone = userPref.accountPhone;
          } else {
            this.selectedAccountPhone = {};
          }
        } catch (error) {
          this.selectedAccountPhone = {};
        }
        let match = '';
        if (this.selectedAccountPhone && this.selectedAccountPhone.accountPhoneId) {
          match = res.find((eachPhone: any) => eachPhone.accountPhoneId === this.selectedAccountPhone.accountPhoneId);
        }
        if (match) {
          this.selectedAccountPhone = match;
        } else {
          this.selectedAccountPhone = res[0];
        }
        this.getAutoResponderList();
      },
      error: (err) => {
        this.logger.log(err);
        this.snackbar.open('Error fetching account phone numbers');
      }
    })
  }

  filterAccPhones(text: string) {
    if (!text) {
      this.filteredAccPhones = this.accountPhones;
    }
    this.filteredAccPhones = this.accountPhones.filter((eachPhone: any) => eachPhone.accountPhone.indexOf(text) > -1);
  }

  getId(idx: number, item: any) {
    return item.accountPhoneId;
  }

  toggleSideNav($event: any) {
    this.sidenavService.toggle();
  }

  accPhoneChanged() {
    this.userPref.accountPhone = this.selectedAccountPhone;
    localStorage.setItem('userPref', JSON.stringify(this.userPref));
    this.getAutoResponderList();
  }

  decodeSec(sec: number) {
    const today = new Date();
    const time = {
      dayName: 'Sun',
      days: 0.0,
      // meridiem: 'am',
      // hours: 12,
      hours_24: 0.0,
      minutes: 0.0,
      // seconds: 0.0,
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0)
    };
    if (sec === 604800) {
      sec--;
    }
    if (sec <= 0) {
      return time;
    }
    else {
      time.days = Math.floor(sec / (3600 * 24));
      time.dayName = this.dayNames[time.days];
      time.hours_24 = Math.abs((time.days * 24) - (Math.floor(sec / 3600)));
      // time.meridiem = time.hours_24 > 12 ? 'pm' : 'am',
      // time.hours = (time.hours_24 % 12) || 12;
      time.minutes = Math.floor(sec % 3600 / 60);
      // time.seconds = Math.floor(sec % 3600 % 60);
      time.date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), time.hours_24, time.minutes, 0, 0);
      return time;
    }
  }

  getAutoResponderList() {
    this.messagesService.getAutoResponders(this.selectedAccountPhone.accountId, this.selectedAccountPhone.accountPhone).subscribe({
      next: (res) => {
        for (const responder of res) {
          if (responder.endDt) {
            responder.showDates = true;
          }
          for (const detail of responder.details) {
            detail.fromWeekTime = this.decodeSec(detail.fromTime);
            detail.toWeekTime = this.decodeSec(detail.toTime);
          }
        }
        this.responders = res;
      },
      error: (err) => {
        this.logger.log(err);
      }
    })
  }

  prepareResponder(responder: any) {
    const prepResult: any = {};
    for (const key in responder) {
      if (Object.prototype.hasOwnProperty.call(responder, key)) {
        if (key !== 'backUp') {
          prepResult[key] = responder[key];
        }
      }
    }
    return prepResult;
  }

  saveEachResponder(responder: any) {
    let stop = false;
    if (!responder.scheduleName) {
      this.snackbar.open(`Responder name not provided`);
      stop = true;
      return;
    }
    let validDetails = true;
    responder.details.forEach((detail: any) => {
      if (detail.errorMsg) {
        validDetails = false;
      }
    });
    if (!validDetails) {
      this.snackbar.open(`Fix errors in messages to save`);
      stop = true;
    }
    if (stop) {
      return;
    }
    const prepResponder = this.prepareResponder(responder);
    this.messagesService.updateAutoResponder(this.selectedAccountPhone.accountId, this.selectedAccountPhone.accountPhone, prepResponder).subscribe({
      next: (res) => {
        responder.edit = false;
      },
      error: (err) => {
        this.logger.log(err);
        this.snackbar.open(err.error || "failed to save responder");
      }
    })
  }

  addMessage(responder: any) {
    if (!responder.details) {
      responder.details = [];
    }
    responder.details.unshift({
      autoresponderId: responder.id,
      fromTime: 0,
      fromWeekTime: this.decodeSec(0),
      toTime: 0,
      toWeekTime: this.decodeSec(0)
    });
  }

  addResponder() {
    const responder = {
      enabled: true,
      edit : true,
      scheduleName: '',
      accountPhoneId: this.selectedAccountPhone.accountPhoneId,
      startDt: "0001-01-01T00:00:00",
      endDt: null,
      template: '',
      searchPhrase: null,
      resetDecayOnAllMessages: false,
      decaySeconds: 3600,
      timeMode: 3,
      details: [
        {
          fromTime: 0,
          fromWeekTime: this.decodeSec(0),
          toTime: 0,
          toWeekTime: this.decodeSec(0)
        }
      ]
    };
    this.openEditResponder(responder, )
  }

  editAfterHours() {
    const confirmRef = this.dialog.open(AfterHrsDialogComponent, {
      data: { 
        title: 'Office Hours',
        selectedAccountPhone: this.selectedAccountPhone,
      },
      closeOnNavigation: true,
      minWidth: '30%'
    });
    confirmRef.afterClosed().subscribe(result => {
      if (result) {
        // update the selected account Phone
        this.selectedAccountPhone.businessHours = result.businessHours;
      }
    })
  }

  openEditResponder(responder: any) {
    const templateDialogRef = this.dialog.open(ResponderDialogComponent, {
      data: { 
        title: (responder && responder.id) ?  'Edit Responder' : 'Add Responder',
        responder,
        selectedAccountPhone: this.selectedAccountPhone
      },
      minWidth: '50vw',
      disableClose: true,
      closeOnNavigation: true
    });
    templateDialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.getAutoResponderList();
      }
    });
  }

  deleteResponder(responder: any) {
    const confirmRef = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete', message: 'Are you sure to delete?' }
    });
    responder.enabled = false;
    responder.deleted = true;
    confirmRef.afterClosed().subscribe(result => {
      if (result) {
        this.messagesService.updateAutoResponder(this.selectedAccountPhone.accountPhoneId, this.selectedAccountPhone.accountPhone, responder).subscribe({
          next: (res) => {
            this.getAccountPhones();
          },
          error: (err) => {
            this.logger.log(err);
            this.snackbar.open(err.error || 'Unknown exception');
          }
        })
      }
    })
  }


}
