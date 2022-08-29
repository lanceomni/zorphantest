import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { LoggerService } from '../logger.service';
import { MessagesService } from '../messages/messages.service';

@Component({
  selector: 'app-draft-messages',
  templateUrl: './draft-messages.component.html',
  styleUrls: ['./draft-messages.component.scss']
})
export class DraftMessagesComponent implements OnInit {
  drafts: any[] = [];
  loading = true;

  constructor(
    public dialogRef: MatDialogRef<DraftMessagesComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private messagesService: MessagesService,
    private logger: LoggerService,
    private snackbar: MatSnackBar,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.getDrafts();
  }

  getDrafts() {
    this.messagesService.getDraftList(this.data.accountPhone.accountPhone).subscribe({
      next: (res) => {
        this.drafts = res;
        this.loading = false;
      },
      error: (err) => {
        this.logger.log(err);
        this.loading = false;
      }
    })
  }

  toggleContacts(draft: any) {
    draft.showContacts ? draft.showContacts = false : draft.showContacts = true;
  }

  editDraft(draft: any) {
    this.dialogRef.close(draft);
    // const messagePage = {
    //   start: 0,
    //   limit: 30,
    //   search: '',
    //   sort: 'createdDate',
    //   sortDirection: 'desc',
    // };
    // this.messagesService.getMessages(this.data.accountPhone.accountPhone, draft.phoneNumbers[0], messagePage, draft.messageId).subscribe({
    //   next: (res) => {
    //     this.logger.log(res);
    //   },
    //   error: (err) => {
    //     this.logger.log(err);
    //   }
    // })
  }

  deleteDraft(draft: any) {
    const confirmRef = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete', message: 'Are you sure to delete?' }
    });
    confirmRef.afterClosed().subscribe((result: any) => {
      if (result) {
        // delete message
        this.messagesService.deleteDraftMessage(this.data.accountPhone.accountPhone, draft.groupGuid).subscribe({
          next: (res) => {
            // remove it from list
            this.removeFrmList(draft);
          },
          error: (err) => {
            this.logger.log(err);
            this.snackbar.open(err.error || 'Unknown exception');
          }
        })
      }
    })
  }

  removeFrmList(draft: any) {
    if (!draft) {
      return;
    }
    const matchIdx = this.drafts.findIndex((eachDraft: any) => eachDraft.messageId === draft.messageId);
    if (matchIdx > -1) {
      this.drafts.splice(matchIdx, 1);
    }
  }

}
