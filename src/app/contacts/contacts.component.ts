import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { Component, HostListener, NgZone, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuTrigger } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Sort } from '@angular/material/sort';
// import { PhonePipe } from '../pipes/phone.pipe';
import { map, pairwise, filter, throttleTime, Observable, shareReplay, debounceTime, distinctUntilChanged, takeUntil, Subject, tap, switchMap } from 'rxjs';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { ContactDialogComponent } from '../contact-dialog/contact-dialog.component';
import { MessagesService } from '../messages/messages.service';
import { SidenavService } from '../sidenav/sidenav.service';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { GroupDialogComponent } from '../group-dialog/group-dialog.component';
import { LoggerService } from '../logger.service';

@Component({
  selector: 'app-contacts',
  templateUrl: './contacts.component.html',
  styleUrls: ['./contacts.component.scss']
})
export class ContactsComponent implements OnInit {
  @ViewChild('contactScroller', {read: CdkVirtualScrollViewport, static: false}) contactScroller!: CdkVirtualScrollViewport;
  @ViewChild('contactMenuTrigger', { read: MatMenuTrigger, static: false}) contactMenuTrigger!: MatMenuTrigger;
  searchAccPhone = new FormControl('');
  searchContacts = new FormControl('');
  searchGroups = new FormControl('');
  filterContact = new FormControl('');
  contactMenuPosition = {
    x: '',
    y: ''
  };
  contextContact: any;
  isLarge$: Observable<boolean> = this.breakpointObserver.observe([Breakpoints.Large, Breakpoints.XLarge, Breakpoints.Medium])
    .pipe(
      map(result => result.matches),
      shareReplay()
    );
  isSmall$ = this.sidenavService.isSmall$;
  
  page = {
    start: 0,
    limit: 50,
    search: '',
    sort: 'contact1',
    sortDirection: 'asc',
    filter: '',
    showTagged: true,
    showUntagged: true
  };
  contacts: any[] = [];
  loadingContacts = false;
  filteredAccPhones: any[] = [];
  accountPhones: any[] = [];
  selectedAccountPhone: any = {};
  userPref: any = {};
  allGroups: any[] = [];
  filteredGroups: any[] = [];
  private destroy$ = new Subject<void>();
  composeList: any[] = [];
  

  constructor(
    private messagesService: MessagesService,
    private snackbar: MatSnackBar,
    private sidenavService: SidenavService,
    private zone: NgZone,
    private breakpointObserver: BreakpointObserver,
    private dialog: MatDialog,
    // private phonePipe: PhonePipe,
    private clipboard: Clipboard,
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
    this.searchContacts.valueChanges
    .pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(
      text => {
        this.page.search = text;
        this.page.start = 0;
        this.contacts = [];
        this.getAccountContacts(this.selectedAccountPhone.accountPhone);
      }
    )
    this.searchGroups.valueChanges
    .pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(
      text => {
        this.filterGroups(text);
      }
    )
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.pageResized();
  }

  pageResized() {
    this.sidenavService.shrinkSidenav();
  }

  filterAccPhones(text: string) {
    if (!text) {
      this.filteredAccPhones = this.accountPhones;
    }
    this.filteredAccPhones = this.accountPhones.filter((eachPhone: any) => eachPhone.accountPhone.indexOf(text) > -1);
  }

  toggleSideNav($event: any) {
    this.sidenavService.toggle();
  }

  accPhoneChanged() {
    this.contacts = [];
    this.page.start = 0;
    this.getAccountContacts(this.selectedAccountPhone.accountPhone);
    this.userPref.accountPhone = this.selectedAccountPhone;
    localStorage.setItem('userPref', JSON.stringify(this.userPref));
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
        this.getAccountContacts(this.selectedAccountPhone.accountPhone);
      },
      error: (err) => {
        this.logger.log(err);
        this.snackbar.open('Error fetching account phone numbers');
      }
    })
  }

  getAccountContacts(accountPhone: string | number) {
    this.loadingContacts = true;
    this.messagesService.getContacts(accountPhone, this.page).subscribe({
      next: (res) => {
        this.contacts = [...this.contacts, ...res]
        this.loadingContacts = false;
        if (res) {
          this.page.start += res.length;
        }
      },
      error: (err) => {
        this.logger.log(err);
        this.loadingContacts = false;
        this.snackbar.open('Error in fetching contacts');
      }
    })
  }

  openContact(contact ?: any) {
    const contactRef = this.dialog.open(ContactDialogComponent, {
      data: { 
        title: contact ? 'Edit Contact' : 'New Contact',
        contact,
        selectedAccountPhone: this.selectedAccountPhone
      },
      closeOnNavigation: true
    });
    contactRef.afterClosed().subscribe((result: any) => {
      if (result) {
        const matchIdx = this.contacts.findIndex(eachContact => eachContact.contactId === result.contactId);
        if (matchIdx > -1) {
          this.contacts.splice(matchIdx, 1, result);
        } else {
          this.contacts.unshift(result);
        }
        this.zone.run(() => {
          this.contacts = [...this.contacts];
        });
      }
    });
  }

  getId(idx: number, item: any) {
    return item.accountPhoneId;
  }

  openContactMenu(event: any, contact: any) {
    event.preventDefault();
    this.contactMenuPosition.x = event.clientX + 'px';
    this.contactMenuPosition.y = event.clientY + 'px';
    this.contactMenuTrigger._openedBy = 'mouse';
    this.contextContact = {contact};
    setTimeout(() => {
      this.contactMenuTrigger.openMenu();
    }, 0);
  }

  sortContacts(event: Sort) {
    if (event.active) {
      this.page.sort = event.active;
      this.page.sortDirection = event.direction || 'asc';
      this.page.start = 0;
      this.contacts = [];
      this.getAccountContacts(this.selectedAccountPhone.accountPhone);
    }
  }

  actOnContact(contact: any, action: string) {
    switch (action) {
      case 'delete':
        this.confirmDelete(contact);
        break;
      case 'block':
        this.blockContact(contact);
        break;
      case 'copyNumber':
        this.copyText(contact.phoneNumber);
        break;
      case 'viewContact':
        this.openContact(contact);
        break;
    }
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

  confirmDelete(data: any) {
    const confirmRef = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete', message: 'Are you sure to delete contact?' }
    });
    confirmRef.afterClosed().subscribe(result => {
      if (result) {
        // ask for deleting conversation
        const delMsgs = this.dialog.open(ConfirmDialogComponent, {
          data: { title: 'Delete', message: 'Do you want to delete messages as well?' }
        });
        delMsgs.afterClosed().subscribe(msgResult => {
          if (msgResult) {
            // delete contact as well
            this.deleteContact(data, true, true);
          } else {
            // just delete messages.
            this.deleteContact(data, false, true);
          }
        })
      }
    })
  }

  deleteContact(contact: any, deleteMessages: boolean, deleteContact: boolean) {
    this.messagesService.deleteContact(this.selectedAccountPhone.accountPhone, contact.phoneNumber, deleteMessages, deleteContact).subscribe({
      next: (res) => {
        const idx = this.contacts.findIndex(eachContact => eachContact.contactId === contact.contactId);
        if (idx > -1) {
          this.zone.run(() => {
            this.contacts.splice(idx, 1);
            this.contacts = [...this.contacts];
          });
        }
        this.snackbar.open('Done');
      },
      error: (err) => {
        this.logger.log(err);
        this.snackbar.open('Failed to delete');
      }
    })
  }

  blockContact(contact: any) {
    const flag = contact.blockIncoming ? false : true;
    this.messagesService.blockContact(this.selectedAccountPhone.accountPhone, contact.phoneNumber, flag).subscribe({
      next: (res) => {
        contact.blockIncoming = flag;
      },
      error: (err) => {
        this.logger.log(err);
      }
    })
  }

  // groups
  tabChanged(event: MatTabChangeEvent) {
    if (event.tab.textLabel === 'Groups') {
      this.filteredGroups = [];
      this.allGroups = [];
      this.getGroups();
      this.page.start = 0;
      this.contacts = [];
    } else if (event.tab.textLabel === 'Contacts') {
      this.getAccountContacts(this.selectedAccountPhone.accountPhone);
    }
    
  }

  getGroups() {
    this.messagesService.getGroupsList(this.selectedAccountPhone.accountPhone, '').subscribe({
      next: (res) => {
        this.allGroups = res;
        this.filterGroups(this.searchGroups.value);
      },
      error: (err) => {
        this.logger.log(err);
      }
    })
  }

  openGroup(group?: any) {
    const grpRef = this.dialog.open(GroupDialogComponent, {
      data: { 
        title: group ? 'Edit Group' : 'New Group',
        group,
        accountPhone: this.selectedAccountPhone
      },
      minHeight: '70vh',
      minWidth: '80%'
    });
    grpRef.afterClosed().subscribe(result => {
      if (result) {
        this.allGroups = [];
        this.getGroups();
      }
    })
  }

  deleteGroup(group: any){
    const confirmRef = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete', message: 'Are you sure to delete group?' }
    });
    confirmRef.afterClosed().subscribe(result => {
      if (result) {
        this.messagesService.deleteGroup(this.selectedAccountPhone.accountPhone, group.groupName).subscribe({
          next: (res) => {
            const matchIdx = this.allGroups.findIndex(eachGroup => eachGroup.id === group.id);
            if (matchIdx > -1) {
              this.allGroups.splice(matchIdx, 1);
            }
            this.filterGroups(this.searchGroups.value);
          },
          error: (err) => {
            this.logger.log(err);
            this.snackbar.open('Failed try again...');
          }
        })
      }
    })
  }

  sortGroups(event: Sort) {
    let sortDirection = 1;
    const keyName = event.active;
    if (event.direction === 'desc') {
      sortDirection = -1
    }
    this.filteredGroups.sort((a,b) => (a[keyName] > b[keyName]) ? 1 * sortDirection : ((b[keyName] > a[keyName]) ? -1 *sortDirection : 0))
  }

  filterGroups(text: string) {
    if (!text) {
      this.filteredGroups = [...this.allGroups];
      return;
    }
    this.filteredGroups = [...this.allGroups.filter(group => group.groupName.toLowerCase().indexOf(text.toLowerCase()) > -1)];
  }

  exportContacts() {
    this.messagesService.exportContacts(this.selectedAccountPhone.accountPhone).subscribe({
      next: (res) => {
        this.saveData(res, `${this.selectedAccountPhone.accountPhone}.csv`);
      },
      error: (err) => {
        this.logger.log(err);
        this.snackbar.open(err.message || 'Failed to downlaod contacts');
      }
    })
  }

  saveData(data: any, filename: string) {
    if (!data || !filename) {
      this.snackbar.open('No data', 'Close');
      return;
    }
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.setAttribute('style', 'display:none;');
    document.body.appendChild(a);
    a.href = url;
    a.download = filename;
    a.click();
    a.remove();
  }

  ngAfterViewInit() {
    this.contactScroller.elementScrolled().pipe(
      map(() => this.contactScroller.measureScrollOffset('bottom')),
      pairwise(),
      filter(([y1, y2]) => (y2 < y1) && (y2 < 150)),
      throttleTime(500)
    ).subscribe({
      next: () => {
        this.zone.run(() => {
          this.getAccountContacts(this.selectedAccountPhone.accountPhone);
        });
      }
    });
  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }

}
