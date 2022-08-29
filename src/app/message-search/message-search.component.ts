import { Component, Inject, NgZone, OnInit, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormControl } from '@angular/forms';
import { Clipboard } from '@angular/cdk/clipboard';
import { debounceTime, distinctUntilChanged, filter, map, pairwise, Subscription, switchMap, tap, throttleTime } from 'rxjs';
import { MessagesService } from '../messages/messages.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { MatMenuTrigger } from '@angular/material/menu';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { LoggerService } from '../logger.service';

@Component({
  selector: 'app-message-search',
  templateUrl: './message-search.component.html',
  styleUrls: ['./message-search.component.scss']
})
export class MessageSearchComponent implements OnInit {
  search = new FormControl('');
  @ViewChild('messageMenuTrigger', { read: MatMenuTrigger, static: false}) messageMenuTrigger!: MatMenuTrigger;
  @ViewChild('messageScroller', {read: CdkVirtualScrollViewport, static: false}) messageScroller!: CdkVirtualScrollViewport;
  messagePage = {
    start: 0,
    limit: 30,
    search: '',
    sort: 'createdDate',
    sortDirection: 'desc'
  };
  messages: any[] = [];
  searchActive = false;
  loadMoreActive = false;
  messageMenuPosition = {
    x: '',
    y: ''
  };
  messageScrolledSub!: Subscription;
  contextMessage: any;
  searchAccountPhone = false;

  constructor(
    public dialogRef: MatDialogRef<MessageSearchComponent>,
    private messagesService: MessagesService,
    private snackbar: MatSnackBar,
    private dialog: MatDialog,
    private clipboard: Clipboard,
    private zone: NgZone,
    private logger: LoggerService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  ngOnInit(): void {
    this.search.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        tap(() => {
          this.messages = [];
          this.searchActive = true;
        }),
        switchMap((value) => {
          if (value === null || value === undefined || value === '') {
            this.searchActive = false;
            return [];
          }
          if (!value.trim()) {
            this.searchActive = false;
            return [];
          }
          this.messagePage.start = 0;
          this.messagePage.search = value;
          if (this.searchAccountPhone) {
            return this.messagesService.searchMessages(this.data.selectedAccountPhone.accountPhone, '', this.messagePage);
          }
          return this.messagesService.searchMessages(this.data.selectedAccountPhone.accountPhone, this.data.contact.phoneNumber, this.messagePage);
        })
      ).subscribe({
        next: (res: any) => {
          this.messages = [...res];
          this.searchActive = false;
        },
        error: (err) => {
          this.logger.log(err);
          this.messages = [];
          this.searchActive = false;
        }
      })
  }

  loadMoreMessages() {
    this.loadMoreActive = true;
    // this.messagePage.start += this.messagePage.limit;
    let phoneNumber = this.data.contact.phoneNumber;
    if (this.searchAccountPhone) {
      phoneNumber = '';
    }
    this.messagesService.searchMessages(this.data.selectedAccountPhone.accountPhone, phoneNumber, this.messagePage).subscribe({
      next: (res: any) => {
        if (res && res.length) {
          this.messagePage.start += res.length;
          this.messages = [...this.messages, ...res];
        }
        this.loadMoreActive = false;
      },
      error: (err) => {
        this.loadMoreActive = false;
        this.logger.log(err);
      }
    })
  }

  openMessageMenu(event: any, message: any) {
    event.preventDefault();
    this.messageMenuPosition.x = event.clientX + 'px';
    this.messageMenuPosition.y = event.clientY + 'px';
    this.messageMenuTrigger._openedBy = 'mouse';
    this.contextMessage = {message};
    setTimeout(() => {
      this.messageMenuTrigger.openMenu();
    }, 0);
  }

  confirmDelete(message: any) {
    const confirmRef = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete', message: 'Are you sure to delete?' }
    });
    confirmRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteMessage(message);
      }
    })
  }

  deleteMessage(message: any) {
    this.logger.log(message, 'delete message');
  }

  forwardMsg(message: any) {
    // close dialog and execute forward;
    this.dialogRef.close({action: 'forward', message});
  }

  copyText(text: string) {
    if (!text) {
      this.snackbar.open('No text selected');
      return;
    }
    const pending = this.clipboard.beginCopy(text);
    let remainingAttempts = 3;
    const attempt = () => {
      const result = pending.copy();
      if (!result && --remainingAttempts) {
        setTimeout(attempt);
      } else {
        // Remember to destroy when you're done!
        pending.destroy();
        this.snackbar.open('Copied!');
      }
    };
    attempt();
  }

  viewConversation(message: any) {
    this.messagesService.getMessagePosition(this.data.selectedAccountPhone.accountPhone, message.phoneNumber, message.messageId, this.messagePage).subscribe({
      next: (res) => {
        this.dialogRef.close({action: 'viewConversation', message, position: res});
      },
      error: (err) => {
        this.logger.log(err);
        this.snackbar.open("Failed to fecth conversation. Try again...");
      }
    })
  }

  actOnMessage(message: any, action: string) {
    switch (action) {
      case 'read':
        this.messagesService.markMessage(this.data.selectedAccountPhone.accountPhone, message.phoneNumber, message.messageId, message.isRead ? false : true).subscribe({
          next: (res) => {
            this.snackbar.open(`Done. Message marked as read`);
          },
          error: (err) => {
            this.logger.log(err);
            this.snackbar.open('Failed to update try again');
          }
        })
        break;
      case 'delete':
        this.confirmDelete(message);
        break;
      case 'forward':
        this.forwardMsg(message);
        break;
      case 'copyMessage':
        this.copyText(message.messageBody);
        break;
      case 'viewConversation':
        this.viewConversation(message);
        break;
    }
  }

  searchUpdated() {
    if (!this.search.value) {
      return;
    }
    let phoneNumber = this.data.contact.phoneNumber;
    if (this.searchAccountPhone) {
      phoneNumber = '';
    }
    this.messages = [];
    this.searchActive = true;
    this.messagePage.start = 0;
    this.messagesService.searchMessages(this.data.selectedAccountPhone.accountPhone, phoneNumber, this.messagePage).subscribe({
      next: (res: any) => {
        this.messages = [...res];
        this.searchActive = false;
      },
      error: (err) => {
        this.logger.log(err);
        this.messages = [];
        this.searchActive = false;
      }
    })
  }

  ngAfterViewInit() {
    this.messageScrolledSub = this.messageScroller.elementScrolled().pipe(
      map(() => this.messageScroller.measureScrollOffset('bottom')),
      pairwise(),
      filter(([y1, y2]) => (y2 < y1) && (y2 < 150)),
      throttleTime(500)
    ).subscribe({
      next: () => {
        this.zone.run(() => {
          this.loadMoreMessages();
        });
      }
    })
  }

  ngOnDestroy() {
    if (this.messageScrolledSub) {
      this.messageScrolledSub.unsubscribe();
    }
  }

}
