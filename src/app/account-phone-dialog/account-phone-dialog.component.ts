import { Component, OnInit, Inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { LoggerService } from '../logger.service';
import { MessagesService } from '../messages/messages.service';

@Component({
  selector: 'app-account-phone-dialog',
  templateUrl: './account-phone-dialog.component.html',
  styleUrls: ['./account-phone-dialog.component.scss']
})
export class AccountPhoneDialogComponent implements OnInit {
  accountPhones: any = [];
  filteredAccPhones: any = [];
  loading = true;
  searchAccountPhones = new FormControl();
  private destroy$ = new Subject<void>();

  constructor(
    public dialogRef: MatDialogRef<AccountPhoneDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private messagesService: MessagesService,
    private logger: LoggerService,
  ) { }

  ngOnInit(): void {
    this.initiate();
    this.searchAccountPhones.valueChanges
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

  initiate() {
    this.messagesService.getAccountPhones().subscribe({
      next: (res) => {
        this.accountPhones = res;
        this.filterAccPhones(this.searchAccountPhones.value);
        this.loading = false;
        this.calculateTotalUnread();
      },
      error: (err) => {
        this.logger.log(err);
        this.accountPhones = [];
        this.filteredAccPhones = [];
        this.loading = false
      }
    });
  }

  calculateTotalUnread() {
    this.data.totalUnread = 0
    for (const accountPhone of this.accountPhones) {
      this.data.totalUnread += accountPhone.unreadMessages;
    }
  }

  filterAccPhones(text: string) {
    if (!text) {
      this.filteredAccPhones = this.accountPhones;
      return;
    }
    try {
      text = text.replace(/[\(\)-]/g, '').toLowerCase().trim();
    } catch (error) {
      this.logger.log(error);
      text = '';
    }
    if (!text) {
      this.filteredAccPhones = this.accountPhones;
      return;
    }
    this.filteredAccPhones = this.accountPhones.filter((eachPhone: any) => ((eachPhone.accountPhone.indexOf(text) > -1) || (eachPhone.accountPhoneName.toLowerCase().indexOf(text) > -1)));
  }

  sortAccountPhones(sortEvent: any) {
    if (!this.filteredAccPhones.length) {
      return;
    }
    // sort the list with given column
    this.filteredAccPhones = [...this.filteredAccPhones.sort(this.dynamicSort(sortEvent.active, sortEvent.direction))];
    
  }

  accountPhoneSelected(accountPhone: any) {
    this.dialogRef.close(accountPhone);
  }

  dynamicSort(property: string, order: string) {
    let sort_order = 1;
    if (order === "desc") {
      sort_order = -1;
    }
    return (a: any, b: any) => {
      // a should come before b in the sorted order
      if (a[property] < b[property]) {
        return -1 * sort_order;
        // a should come after b in the sorted order
      } else if (a[property] > b[property]) {
        return 1 * sort_order;
        // a and b are the same
      } else {
        return 0 * sort_order;
      }
    }
  }

}
