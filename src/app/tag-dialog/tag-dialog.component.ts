import { Component, Inject, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { LoggerService } from '../logger.service';
import { MessagesService } from '../messages/messages.service';


@Component({
  selector: 'app-tag-dialog',
  templateUrl: './tag-dialog.component.html',
  styleUrls: ['./tag-dialog.component.scss']
})
export class TagDialogComponent implements OnInit {
  tags: any[] = [];
  assignedTags: string[] = [];
  newTag: string = '';
  inProgress: boolean = false;
  showManageTags = false;
  constructor(
    public dialogRef: MatDialogRef<TagDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private messagesService: MessagesService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private logger: LoggerService
  ) { }

  ngOnInit(): void {
    if (this.data.contact && this.data.contact.tags) {
      this.assignedTags = this.data.contact.tags.split(' ');
    };
    this.getAllTags(this.data.accountPhone.accountPhone);
  }

  getAllTags(accountPhone: string | number) {
    this.messagesService.getAccountPhoneTags(accountPhone).subscribe({
      next: (res) => {
        this.tags = res;
      },
      error: (err) => {
        this.logger.log(err);
      }
    })
  }

  saveTag(accountPhone: string | number, tag: string) {
    if (!tag) {
      this.snackBar.open('Invalid Tag');
      return;
    }
    // remove spaces and add '@' if not present
    tag = tag.trim().replace(/ +/g,'');
    if (!tag) {
      this.snackBar.open('Invalid Tag');
      return;
    }
    if (tag[0] !== '@') {
      tag = '@' + tag;
    }
    this.messagesService.addAccountPhoneTag(accountPhone, tag).subscribe({
      next: (res) => {
        this.newTag = '';
        this.tags = res;
      },
      error: (err) => {
        this.logger.log(err);
      }
    })
  }

  confirmDeleteTag(accountPhone: string | number, tag: string) {
    const confirmRef = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Remove', message: 'Are you sure to remove tag?' }
    });
    confirmRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.deleteTag(accountPhone, tag);
      }
    })
  }

  deleteTag(accountPhone: string | number, tag: string) {
    if (!tag) {
      return;
    }
    this.messagesService.deleteAccountPhoneTag(accountPhone, tag).subscribe({
      next: (res) => {
        this.tags = res;
        const matchIdx = this.assignedTags.findIndex(eachTag => eachTag === tag);
        if (matchIdx > -1) {
          this.assignedTags.splice(matchIdx, 1);
        }
      },
      error: (err) => {
        this.logger.log(err);
        this.snackBar.open(err.error || 'Failed to remove. try again');
      }
    })
  }

  contactTagSelected(event: any) {
    // find what has changed and then trigger tag or untag
    this.compareCurrentTags(event.value);
  }

  compareCurrentTags(tagList: string[]) {
    let serverList = [];
    if (this.data.contact.tags) {
      serverList = this.data.contact.tags.split(' ');
    }
    const addList = [];
    const removeList = [];

    // prep add list
    for (const eachTag of tagList) {
      if (!serverList.includes(eachTag)) {
        // add tag to contact
        addList.push(eachTag);
        this.tagContact(this.data.accountPhone.accountPhone, this.data.contact.phoneNumber, eachTag);
      }
    }
    for (const eachTag of serverList) {
      if (!tagList.includes(eachTag)) {
          // untag from contact
        removeList.push(eachTag);
        this.unTagContact(this.data.accountPhone.accountPhone, this.data.contact.phoneNumber, eachTag);
      }
    }
  }

  tagContact(accountPhone: string | number, contactPhone: string | number, tag: string) {
    this.inProgress = true;
    this.messagesService.tagContact(accountPhone, contactPhone, tag).subscribe({
      next: (res) => {
        this.data.contact.tags = this.assignedTags.join(' ');
        this.inProgress = false;
      },
      error: (err) => {
        this.logger.log(err);
        this.inProgress = false;
      }
    })
  }

  unTagContact(accountPhone: string | number, contactPhone: string | number, tag: string) {
    this.inProgress = true;
    this.messagesService.unTagContact(accountPhone, contactPhone, tag).subscribe({
      next :(res) => {
        this.data.contact.tags = this.assignedTags.join(' ');
        this.inProgress = false;
      },
      error: (err) => {
        this.logger.log(err);
        this.inProgress = false;
      }
    })
  }

  toggleManage() {
    this.showManageTags = !this.showManageTags;
  }

}
