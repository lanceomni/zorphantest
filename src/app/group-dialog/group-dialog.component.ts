import { Component, Inject, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { LoggerService } from '../logger.service';
import { MessagesService } from '../messages/messages.service';
import { PhonePipe } from '../pipes/phone.pipe';

interface Group {
  id: string | number,
  contacts: any [],
  name: string
}

@Component({
  selector: 'app-group-dialog',
  templateUrl: './group-dialog.component.html',
  styleUrls: ['./group-dialog.component.scss']
})

export class GroupDialogComponent implements OnInit {
  
  composeList: any[] = [];
  filterContact = new FormControl('');
  private destroy$ = new Subject<void>();
  filteredContacts: any[] = [];
  searchingContacts = false;
  userPref: any = {};
  group: Group = {
    name: '',
    contacts: [],
    id: ''
  };

  constructor(
    private messagesService: MessagesService,
    private phonePipe: PhonePipe,
    private snackbar: MatSnackBar,
    public dialogRef: MatDialogRef<GroupDialogComponent>,
    private logger: LoggerService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  ngOnInit(): void {
    if (this.data.accountPhone) {
      this.userPref.accountPhone =  this.data.accountPhone;
    }
    if (this.data.group) {
      this.group.name = this.data.group.groupName;
      this.group.id = this.data.group.id;
      this.getGroupContacts();
    }
    this.filterContact.valueChanges
    .pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
      tap(() => {
        this.filteredContacts = [];
        this.searchingContacts = true;
      }),
      switchMap((value) => {
        if (value === null || value === undefined || value === '') {
          return [];
        }
        const sPage = {
          start: 0,
          limit: 30,
          search: value,
          sort: 'contact1',
          sortDirection: 'asc'
        };
        return this.messagesService.searchContacts(this.userPref.accountPhone.accountPhone, sPage);
      })
    ).subscribe({
      next: (res: any) => {
        this.filteredContacts = res;
        this.searchingContacts = false;
      },
      error: (err) => {
        this.logger.log(err);
        this.filteredContacts = [];
        this.searchingContacts = false;
      }
    });
  }

  checkDuplicate(arr: any[], contact: any, keyName: string) {

  }

  saveGroup() {
    const data = {
      groupName: this.group.name ? this.group.name.trim() : '',
      contacts: this.group.contacts
    }
    if (!data.groupName) {
      this.snackbar.open('No group name provided');
      return;
    }
    if (data.groupName.indexOf(' ') > -1) {
      this.snackbar.open('Space not allowed in group name');
      return;
    }
    for (const contact of this.composeList) {
      const match = data.contacts.find(eachContact => eachContact.contactId === contact.contactId);
      if (!match) {
        data.contacts.push(contact);
      }
    }
    this.messagesService.saveGroup(this.userPref.accountPhone.accountPhone, data).subscribe({
      next: (res) => {
        this.snackbar.open('Done');
        this.dialogRef.close(res);
      },
      error: (err) => {
        this.logger.log(err);
      }
    })
  }

  getGroupContacts() {
    this.messagesService.getGroupContacts(this.userPref.accountPhone.accountPhone, this.data.group.id).subscribe({
      next: (res) => {
        if (res) {
          this.group.contacts = res.contacts;
        }
      },
      error: (err) => {
        this.group.contacts = [];
      }
    })
  }

  remove(data: any) {
    const idx = this.composeList.findIndex(eachContact => eachContact.phoneNumber ===  data.phoneNumber);
    if (idx > -1) {
      this.composeList.splice(idx, 1);
    }
  }

  removeFromGroup(contact: any) {
    const idx = this.group.contacts.findIndex(eachContact => eachContact.contactId ===  contact.contactId);
    if (idx > -1) {
      this.group.contacts.splice(idx, 1);
    }
  }

  addToComposeList(event: MatChipInputEvent) {
    event.chipInput!.clear();
    this.filterContact.setValue(null);
    const ele = document.getElementById('composeInput') as HTMLInputElement;
    ele.value = '';
  }

  selectedComposeContact(event: MatAutocompleteSelectedEvent) {
    const selected = event.option.value;
    const idx = this.composeList.findIndex((eachContact: any) => eachContact.phoneNumber ===  selected.phoneNumber);
    if (idx === -1) {
      this.composeList.push(event.option.value);
    }
    this.filterContact.setValue(null);
    const ele = document.getElementById('composeInput') as HTMLInputElement;
    ele.value = '';
  }

  prepContactResult(contact: any) {
    return `${contact.contact1} ${contact.contact2} (${this.phonePipe.transform(contact.phoneNumber)})`
  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }

}
