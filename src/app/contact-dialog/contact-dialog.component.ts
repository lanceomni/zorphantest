import { Component, Inject, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessagesService } from '../messages/messages.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { LoggerService } from '../logger.service';

export function ValidatePhone(control: AbstractControl) {
  let phone = control.value;
  if (!phone) {
    return null;
  }
  phone = phone.toString().replace(/[^0-9]/g, '');
  if (phone.length === 11 && phone[0] === '1') {
    phone = phone.slice(1);
  }
  if (phone.length !== 10 || !/^(?:[2-9]\d{2}?|[2-9]\d{2})[2-9]\d{2}?\d{4}$/.test(phone)) {
    return { invalidPhone: true };
  }
  return null;
}
@Component({
  selector: 'app-contact-dialog',
  templateUrl: './contact-dialog.component.html',
  styleUrls: ['./contact-dialog.component.scss']
})
export class ContactDialogComponent implements OnInit {

  contactForm = this.fb.group({
    contact1: [''],
    contact2: [''],
    phoneNumber: ['',  Validators.compose([Validators.required, ValidatePhone])],
    newContactPhone: ['', ValidatePhone],
    notes: [''],
    groupIds: ['']
  });
  allGroups: any[] = [];
  // userPref: any = {};
  
  constructor(
    public dialogRef: MatDialogRef<ContactDialogComponent>,
    private fb: FormBuilder,
    private messagesService: MessagesService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private logger: LoggerService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  ngOnInit(): void {
    this.getGroups();
  }

  initData() {
    if (this.data.contact) {
      this.contactForm.get('contact1')?.setValue(this.data.contact.contact1);
      this.contactForm.get('contact2')?.setValue(this.data.contact.contact2);
      this.contactForm.get('phoneNumber')?.setValue(this.data.contact.phoneNumber);
      this.contactForm.get('phoneNumber')?.disable({onlySelf: true});
      this.contactForm.get('notes')?.setValue(this.data.contact.notes);
      this.contactForm.get('groupIds')?.setValue(this.decodeGroupIds(this.data.contact.groups));
    } else {
      this.contactForm.get('newContactPhone')?.disable({onlySelf: true});
    }
  }

  getGroups() {
    this.messagesService.getGroupsList(this.data.selectedAccountPhone.accountPhone, '').subscribe({
      next: (res) => {
        this.allGroups = res;
        this.initData();
      },
      error: (err) => {
        this.logger.log(err);
        this.initData();
      }
    })
  }

  checkOverride() {
    const confirmRef = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Warning', message: 'Changing this contact number will result in merging messages with an existing number. Still update it?'}
    });
    confirmRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.saveContact(this.contactForm, true);
        // this.dialogRef.close();
      }
    })
  }

  numberCleanUp(phone: string) {
    phone = phone.replace(/[^0-9+]/g, '');
    (phone.length === 11 && phone[0] === '1')? phone = phone.slice(1) : phone = phone;
    return phone;
  }

  encodeGroupsString(groupIds: number[]): string | null {
    if (!this.allGroups || !this.allGroups.length) {
      return null;
    }
    if (!groupIds || !groupIds.length) {
      return '';
    }
    let groupStr = '';
    for (const group of this.allGroups) {
      if (groupIds.includes(group.id)) {
        groupStr = groupStr + '#' + group.groupName
      }
    }
    return groupStr;
  }

  decodeGroupIds(groupStr: string): number[] {
    if (!groupStr) {
      return [];
    }
    const grpSplit = groupStr.split('#');
    const groupIds = [];
    for (const group of this.allGroups) {
      if (grpSplit.includes(group.groupName)) {
        groupIds.push(group.id);
      }
    }
    return groupIds;
  }

  saveContact(form: FormGroup, override?: boolean) {
    if (this.data.contact && this.data.contact.contactId) {
      // check for permission
      if (!this.data.selectedAccountPhone.canUpdateContact) {
        this.snackBar.open(`No permission to update contact`, 'Close');
        return;
      }
      const data = {...form.value};
      data.phoneNumber = this.data.contact.phoneNumber;
      // prep groups string
      data.groups = this.encodeGroupsString(data.groupIds);
      if (form.value.newContactPhone) {
        const confirmRef = this.dialog.open(ConfirmDialogComponent, {
          data: { title: 'Warning', message: 'Do you REALLY want to change the number for this contact?'}
        });
        confirmRef.afterClosed().subscribe((result: any) => {
          if (result) {
            this.messagesService.updateContact(
              this.data.selectedAccountPhone.accountPhone,
              this.data.contact.phoneNumber,
              form.value.newContactPhone? this.numberCleanUp(form.value.newContactPhone) : '',
              override? override : false,
              data).subscribe({
            next: (res) => {
              this.data.contact.contact1 = res.contact1;
              this.data.contact.contact2 = res.contact2;
              this.data.contact.phoneNumber = res.phoneNumber;
              this.snackBar.open('Done');
              this.dialogRef.close(res);
            },
            error: (err) => {
              this.logger.log(err);
              if (err.error === 'Changing this contact number will result in merging messages with an existing number.') {
                this.checkOverride();
                return;
              }
              this.snackBar.open(err.error || 'Failed to update');
            }
          })    
          }
        })
      } else {
        this.messagesService.updateContact(
            this.data.selectedAccountPhone.accountPhone,
            this.data.contact.phoneNumber,
            form.value.newContactPhone? this.numberCleanUp(form.value.newContactPhone) : '',
            override? override : false,
            data).subscribe({
          next: (res) => {
            this.data.contact.contact1 = res.contact1;
            this.data.contact.contact2 = res.contact2;
            this.data.contact.phoneNumber = res.phoneNumber;
            this.snackBar.open('Done');
            this.dialogRef.close(res);
          },
          error: (err) => {
            this.logger.log(err);
            if (err.error === 'Changing this contact number will result in merging messages with an existing number.') {
              this.checkOverride();
              return;
            }
            this.snackBar.open(err.error || 'Failed to update');
          }
        })
      }
    } else {
      // new contact
      form.value.phoneNumber = this.numberCleanUp(form.value.phoneNumber);
      form.value.groups = this.encodeGroupsString(form.value.groupIds);
      this.messagesService.createNewContact(this.data.selectedAccountPhone.accountPhone, form.value).subscribe({
        next: (res) => {
          if (res && res.resultMessage === 'alreadyExists') {
            this.snackBar.open(res.resultMessage);
            return;
          }
          this.snackBar.open('Done');
          this.dialogRef.close(res);
        },
        error: (err) => {
          this.logger.log(err);
          this.snackBar.open('Failed to create');
        }
      })
    }
  }

}
