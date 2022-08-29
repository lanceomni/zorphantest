import { Component, OnInit, Inject, HostListener, OnDestroy } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MessagesService } from '../messages/messages.service';
import { position } from 'caret-pos';
import { debounceTime, distinctUntilChanged, first, map, Observable, shareReplay, Subject, takeUntil, tap } from 'rxjs';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Router } from '@angular/router';
import { AfterHrsDialogComponent } from '../after-hrs-dialog/after-hrs-dialog.component';
import { LoggerService } from '../logger.service';

@Component({
  selector: 'app-responder-dialog',
  templateUrl: './responder-dialog.component.html',
  styleUrls: ['./responder-dialog.component.scss']
})
export class ResponderDialogComponent implements OnInit, OnDestroy{
  responderCopy : any;
  showEmojiList = false;
  dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  previousTextPosition: any;
  searchTemplates = new FormControl('');
  isLarge$: Observable<boolean> = this.breakpointObserver.observe([Breakpoints.Medium, Breakpoints.Tablet, Breakpoints.Large, Breakpoints.XLarge])
    .pipe(
      map(result => result.matches),
      shareReplay()
    );
  templates: any[] = [];
  filteredTemplates: any[] = [];
  private destroy$ = new Subject<void>();
  msgLmits: { cnt: number; msg: string; } = {
    cnt: 0,
    msg: ''
  };

  constructor(
    public dialogRef: MatDialogRef<ResponderDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private messagesService: MessagesService,
    private fb: FormBuilder,
    private snackbar: MatSnackBar,
    private breakpointObserver : BreakpointObserver,
    private router : Router,
    private dialog: MatDialog,
    private logger: LoggerService
  ) { }

  ngOnInit(): void {
    this.getSavedTemplates();
    if (this.data.responder) {
      this.responderCopy = JSON.parse(JSON.stringify(this.data.responder));
      this.charCount(this.data.responder.template);
    }
    this.searchTemplates.valueChanges
    .pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(
      text => {
      this.filterTemplates(text) ;
      }
    )
  }

  @HostListener('click', ['$event'])
  onClick($event: any) {
    if (this.showEmojiList) {
      this.showEmojiList = false;
    }
  }

  toggleEmojiList(event: any) {
    event.stopPropagation();
    this.showEmojiList = !this.showEmojiList;
  }

  addEmoji(event: any) {
    const input = document.getElementById('templateBox') as HTMLElement;
    const pos = position(input);
    this.previousTextPosition = pos;
    this.insertText(event.emoji.native);
  }

  insertText(text: string) {
    let newPos = text.length;
    let newText = '';
    const currentText = this.data.responder.template;
    if (this.previousTextPosition && this.previousTextPosition.pos) {
      newText = currentText.slice(0, this.previousTextPosition.pos) + text + currentText.slice(this.previousTextPosition.pos);
      newPos = this.previousTextPosition.pos + text.length;
    } else {
      newText = text + currentText;
      newPos = text.length;
    }
    this.data.responder.template = newText;
    const input = document.getElementById('templateBox') as HTMLElement;
    setTimeout(() => {
      input.focus();
      position(input, newPos);
      this.charCount(this.data.responder.template);
    }, 100);
  }

  pauseEmojiClose(event: any) {
    event.stopPropagation();
  }

  backgroundImageFn(set: string, sheetSize: number) {
    return "assets/img/emoji_sheet_32.png";
  };

  // templates
  filterTemplates(text: string) {
    if (!text) {
      this.filteredTemplates = this.templates;
    }
    this.filteredTemplates = this.templates.filter((eachTemplate: any) => (eachTemplate.templateName.toLowerCase().indexOf(text.toLowerCase()) > -1) || (eachTemplate.templateText.toLowerCase().indexOf(text.toLowerCase()) > -1));
  }

  getSavedTemplates() {
    this.templates = [];
    this.filteredTemplates = [];
    this.messagesService.getTemplates(this.data.selectedAccountPhone.accountId, this.data.selectedAccountPhone.accountPhone).subscribe({
      next: (res) => {
        this.templates = res;
        this.filteredTemplates = res;
      },
      error: (err) => {
        this.templates = [];
        this.filteredTemplates = [];
        this.logger.log(err);
      }
    })
  }

  templateOpened() {
    const input = document.getElementById('templateBox') as HTMLElement;
    const pos = position(input);
    this.previousTextPosition = pos;
  }

  templateSelected(template: any) {
    if (!template || ! template.templateText) {
      return;
    }
    this.insertText(template.templateText);
  }

  manageTemplates() {
    this.dialogRef.afterClosed().pipe(
      tap(() => this.router.navigate(['templates'])),
      first()
    ).subscribe();
    this.dialogRef.close(this.responderCopy);
  }

  cancel() {
    this.dialogRef.close(this.responderCopy);
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

  encodeToWeekSec(dayName: string, date: Date) {
    // get only time form date
    const hrs = date.getHours();
    const min = date.getMinutes();
    const weekNumber = this.dayNames.indexOf(dayName);
    // convert to week seconds
    const totalHrs = weekNumber > -1 ? (weekNumber * 24) + hrs : hrs;
    const tHrSec = totalHrs * 3600;
    const minSecs = min * 60;
    return tHrSec + minSecs;
  }

  validateTimeRange(detail: any) {
    detail.errorMsg = '';
    detail.fromTime = this.encodeToWeekSec(detail.fromWeekTime.dayName, detail.fromWeekTime.date);
    detail.toTime = this.encodeToWeekSec(detail.toWeekTime.dayName, detail.toWeekTime.date)
    if (detail.fromTime >= detail.toTime) {
      detail.errorMsg += ' Invalid date range - (Time range can not span multiple weeks)';
    }
  }

  removeDetail(responder: any, detail: any, i: number) {
    responder.details.splice(i, 1);
  }

  addNewSchedule(responder: any) {
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

  openOfficeHours() {
    const confirmRef = this.dialog.open(AfterHrsDialogComponent, {
      data: { 
        title: 'Office Hours',
        selectedAccountPhone: this.data.selectedAccountPhone,
      },
      closeOnNavigation: true,
      minWidth: '30%'
    });
    confirmRef.afterClosed().subscribe(result => {
      if (result) {
        // update the selected account Phone
        this.data.selectedAccountPhone.businessHours = result.businessHours;
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
    if (!responder.scheduleName || !responder.template) {
      this.snackbar.open(`Responder name or message not provided`);
      stop = true;
      return;
    }
    if (responder.template.length > 600) {
      this.snackbar.open(`Max character limit exceeded`);
      stop = true;
      return;
    }
    let validDetails = true;
    if((responder.timeMode === 1) || (responder.timeMode === 2) ) {
      responder.details = [];
    } else {
      responder.details.forEach((detail: any) => {
        if (detail.errorMsg) {
          validDetails = false;
        }
      });
    }
    if (!validDetails) {
      this.snackbar.open(`Fix errors in messages to save`);
      stop = true;
    }
    if (stop) {
      return;
    }
    const prepResponder = this.prepareResponder(responder);
    if (prepResponder.id) {
      this.messagesService.updateAutoResponder(this.data.selectedAccountPhone.accountId, this.data.selectedAccountPhone.accountPhone, prepResponder).subscribe({
        next: (res) => {
          // close the dialog
          this.dialogRef.close(res);
        },
        error: (err) => {
          this.logger.log(err);
          this.snackbar.open(err.error || "failed to save responder");
        }
      })
    } else {
      this.messagesService.addAutoResponder(this.data.selectedAccountPhone.accountId, this.data.selectedAccountPhone.accountPhone, prepResponder).subscribe({
        next: (res) => {
          // close the dialog
          this.dialogRef.close(res);
        },
        error: (err) => {
          this.logger.log(err);
          this.snackbar.open(err.error || "failed to save responder");
        }
      })
    }
  }

  charCount(text: string): any {
    const details: any = {
      cnt: 0,
      msg: ''
    };
    if (!text) {
      this.msgLmits = details;
      return details;
    }
    const strArr = text.split(/\r\n|\r|\n/);
    if (strArr.length) {
      details.cnt = text.length + (strArr.length -1);
    } else {
      details.cnt = text.length;
    };
    if (details.cnt > 600) {
      details.msg = 'Max character limit exceeded';
    } else if (details.cnt > 480) {
      details.msg = 'This message will use 4 message credits';
    } else if (details.cnt > 320) {
      details.msg = 'This message will use 3 message credits';
    } else if (details.cnt > 160) {
      details.msg = 'This message will use 2 message credits';
    }
    this.msgLmits = details;
    return details;
  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }

}
