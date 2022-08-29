import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LoggerService } from '../logger.service';
import { MessagesService } from '../messages/messages.service';

@Component({
  selector: 'app-after-hrs-dialog',
  templateUrl: './after-hrs-dialog.component.html',
  styleUrls: ['./after-hrs-dialog.component.scss']
})
export class AfterHrsDialogComponent implements OnInit {
  hours: any = [
    {
      weekName: 'Sun',
      checked: false,
      startTime: {},
      endTime: {},
      fromTime: '',
      toTime: ''
    },
    {
      weekName: 'Mon',
      fromTime: '',
      checked: false,
      startTime: {},
      endTime: {},
      toTime: ''
    },
    {
      weekName: 'Tue',
      fromTime: '',
      checked: false,
      startTime: {},
      endTime: {},
      toTime: ''
    },
    {
      weekName: 'Wed',
      fromTime: '',
      checked: false,
      startTime: {},
      endTime: {},
      toTime: ''
    },
    {
      weekName: 'Thu',
      fromTime: '',
      checked: false,
      startTime: {},
      endTime: {},
      toTime: ''
    },
    {
      weekName: 'Fri',
      fromTime: '',
      checked: false,
      startTime: {},
      endTime: {},
      toTime: ''
    },
    {
      weekName: 'Sat',
      fromTime: '',
      checked: false,
      startTime: {},
      endTime: {},
      toTime: ''
    },
  ];
  dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  constructor(
    public dialogRef: MatDialogRef<AfterHrsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private messagesService: MessagesService,
    private snackBar: MatSnackBar,
    private logger: LoggerService
  ) { }

  ngOnInit(): void {
    if (this.data.selectedAccountPhone) {
      try {
        const officeHrs = JSON.parse(this.data.selectedAccountPhone.businessHours);
        officeHrs.forEach((eachDay: any) => {
          eachDay.startTime = this.decodeSec(eachDay.FromTime);
          eachDay.endTime = this.decodeSec(eachDay.ToTime);
          eachDay.weekName = eachDay.startTime.dayName;
          eachDay.checked = true, 
          this.hours.splice(this.dayNames.indexOf(eachDay.startTime.dayName), 1, eachDay);
        });
      } catch (error) {
        this.logger.log(error);
      }
    }
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

  disableDay(day: any) {
    this.logger.log(day);
  }

  save() {
    const finalHours: any = [];
    this.hours.forEach((eachHour: any) => {
      if (eachHour.checked) {
        finalHours.push(
          {
            FromTime: this.encodeToWeekSec(eachHour.weekName, eachHour.startTime.date),
            ToTime: this.encodeToWeekSec(eachHour.weekName, eachHour.endTime.date)
          }
        )
      }
    });

    this.data.selectedAccountPhone.businessHours = JSON.stringify(finalHours);
    this.messagesService.addUpdateAccountPhone(this.data.selectedAccountPhone.accountId, this.data.selectedAccountPhone).subscribe({
      next: (res) => {
        this.dialogRef.close(res);
      },
      error: (err) => {
        this.logger.log(err);
        this.snackBar.open(err.error || 'Unknown Exception');
      }
    })
  }

}
