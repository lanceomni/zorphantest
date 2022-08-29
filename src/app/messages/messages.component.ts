import { trigger, transition, animate, style } from '@angular/animations'
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Clipboard } from '@angular/cdk/clipboard';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { Component, HostListener, NgZone, OnInit, ViewChild } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged, filter, map, Observable, pairwise, shareReplay, Subject, Subscription, switchMap, takeUntil, tap, throttleTime } from 'rxjs';
import { SidenavService } from '../sidenav/sidenav.service';
import { MessagesService } from './messages.service';
import { FormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipInputEvent } from '@angular/material/chips';
import { DomSanitizer } from '@angular/platform-browser';
import { MessageSearchComponent } from '../message-search/message-search.component';
import { MatDialog } from '@angular/material/dialog';
import { PhonePipe } from '../pipes/phone.pipe';
import { MatMenuTrigger } from '@angular/material/menu';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { ContactDialogComponent } from '../contact-dialog/contact-dialog.component';
// import { MatSelect } from '@angular/material/select';
import { NotificationService } from '../notification.service';
import { NotificationPanelComponent } from '../notification-panel/notification-panel.component';
import { ImageViewerComponent } from '../image-viewer/image-viewer.component';
import { DraftMessagesComponent } from '../draft-messages/draft-messages.component';
import { ActivatedRoute, Router } from '@angular/router';
import { position } from 'caret-pos';
import { SettingsComponent } from '../settings/settings.component';
import { AccountPhoneDialogComponent } from '../account-phone-dialog/account-phone-dialog.component';
import { Title } from '@angular/platform-browser';
import { TagDialogComponent } from '../tag-dialog/tag-dialog.component';
import { environment } from 'src/environments/environment';
import { ResizeEvent } from 'angular-resizable-element';
import { LoggerService } from '../logger.service';
// import { TemplatesDialogComponent } from '../templates-dialog/templates-dialog.component';
// const sound = require('../../assets/new_message_track.mp3');
@Component({
  selector: 'app-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.scss'],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({transform: 'translateX(-100%)'}),
        animate('500ms ease-in', style({transform: 'translateX(0%)'}))
      ]),
      // transition(':leave', [
      //   animate('500ms ease-out', style({transform: 'translateX(-100%)'}))
      // ])
    ])
  ]
})
export class MessagesComponent implements OnInit {
  @ViewChild('contactScroller', {read: CdkVirtualScrollViewport, static: false}) contactScroller!: CdkVirtualScrollViewport;
  @ViewChild('messageScroller', {read: CdkVirtualScrollViewport, static: false}) messageScroller!: CdkVirtualScrollViewport;
  @ViewChild('contactMenuTrigger', { read: MatMenuTrigger, static: false}) contactMenuTrigger!: MatMenuTrigger;
  @ViewChild('messageMenuTrigger', { read: MatMenuTrigger, static: false}) messageMenuTrigger!: MatMenuTrigger;
  // @ViewChild('accPhoneSelect', { read: MatSelect, static: false}) accPhoneSelect!: MatSelect;
  
  contactSearch = new FormControl('');
  filterContact = new FormControl('');
  // searchAccPhone = new FormControl('');
  searchTemplates = new FormControl('');
  filteredContacts: any[] = [];
  contextContact: any;
  contextMessage: any;
  selectedAccountPhone: any;
  userPref: any = {};
  // sub: Subscription;
  subs: Subscription[] = [];
  signatureUpdateTimeout: any;
  otherNotifications: any[] =[];
  oldNote = '';
  filters = [
    'inbound',
    'outbound',
    'unread ',
    'failure'
  ];
  sortOptions = [
    'lastReceived',
    'lastSent',
    'unreadMessages'
  ];
  tags: any[] = [];
  signatureCopy = '';
  private destroy$ = new Subject<void>();
  isHandset$: Observable<boolean> = this.breakpointObserver.observe([Breakpoints.Handset])
    .pipe(
      map(result => result.matches),
      shareReplay()
    );
  isLarge$: Observable<boolean> = this.breakpointObserver.observe([Breakpoints.Medium, Breakpoints.Tablet, Breakpoints.Large, Breakpoints.XLarge])
    .pipe(
      map(result => result.matches),
      shareReplay()
    );
  page = {
    start: 0,
    limit: 30,
    search: '',
    sort: 'lastActivity',
    sortDirection: 'desc',
    filter: '',
    showTagged: true,
    showUntagged: true,
    tagFilter: '',
    // customTag: [],
    selectedTags: []
  };
  messagePage = {
    start: 0,
    limit: 30,
    search: '',
    sort: 'createdDate',
    sortDirection: 'desc',
  };
  contacts: any[] = [];
  messages: any[] = [];
  accountPhones: any = [];
  selectedContact: any;
  previousContact: any;
  loadingContacts = false;
  loadingMessages = false;
  searchingContacts = true;
  composeList: any[] = [];
  messageScrolledSub!: Subscription;
  contactScrolledSub!: Subscription;
  composedMessage: any = {
    attachments: [],
    urls: []
  };
  // filteredAccPhones: any = [];
  outGoingMsg = {
    message: '',
    scheduleDt: '',
    groupGuid: ''
  };
  contactMenuPosition = {
    x: '',
    y: ''
  };
  messageMenuPosition = {
    x: '',
    y: ''
  };
  userTyping = false;
  idleTimer!: number;
  loggedInUser : any;
  maintenanceTimer!: number;
  reportStatusTimer!: number;
  titleTimer!: number;
  showDetaislpanel = true;
  separatorKeysCodes = [13, 9, 188];
  templates: any = [];
  filteredTemplates: any = [];
  previousTextPosition: any;
  totalUnread = 0;
  showEmojiList = false;
  isTabInBackground: boolean = false;
  titleMessage: string = environment.appName;
  printOptions: any = {
    frmDt: '',
    toDt: '',
    saveType:'csv'
  };
  msgLmits: { cnt: number; msg: string; } = {
    cnt: 0,
    msg: ''
  };

  constructor(
    private breakpointObserver: BreakpointObserver,
    private sidenavService: SidenavService,
    private messagesService: MessagesService,
    private notificationService: NotificationService,
    private snackbar: MatSnackBar,
    private sanitizer: DomSanitizer,
    private dialog: MatDialog,
    private zone: NgZone,
    private phonePipe: PhonePipe,
    private clipboard: Clipboard,
    private route: ActivatedRoute,
    private router: Router,
    private logger: LoggerService,
    private titleService: Title
  ) { }

  ngOnInit(): void {
    this.sidenavService.shrinkSidenav();
    this.getAccountPhones();
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
        if (value.trim()[0] === '#') {
          // search for groups
          return this.messagesService.searchGroups(this.selectedAccountPhone.accountPhone, value.slice(1));
        } else {
          const sPage = {
            start: 0,
            limit: 30,
            search: value,
            sort: 'contact1',
            sortDirection: 'asc'
          };
          return this.messagesService.searchContacts(this.selectedAccountPhone.accountPhone, sPage);
        }
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
    this.getUserData();
    this.messagesService.settingsUpdated$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((data) => {
      // if already on remove the signature
      if (this.userPref.signatureOn) {
        this.toggleSignature(true);
      }
      this.getUserData(() => {
        if (this.userPref.signatureOn) {
          let pos = 0;
          this.outGoingMsg.message += `\n${this.userPref.signature}`;
          const idx = this.outGoingMsg.message.lastIndexOf(this.userPref.signature);
          pos = idx - 1;
          setTimeout(() => {
            const ele = document.getElementById('msgBox');
            if (ele) {
              ele.focus();
              position(ele, pos);
            }
          }, 0);
        }

      });
    })
    try {
      const val = localStorage.getItem('detailsPanePref');
      if (!val || val === 'true') {
        this.showDetaislpanel = true;
      } else {
        this.showDetaislpanel = false;
      }
    } catch (error) {
      
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.pageResized();
  }

  @HostListener('document:visibilitychange', ['$event'])
  visibilitychange() {
    this.checkHiddenDocument();
  }

  // @HostListener('click', ['$event.target'])
  // onClick(event: any) {
  //   if (this.showEmojiList) {
  //     this.showEmojiList = false;
  //   }
  // }

  @HostListener('window:keydown', ['$event'])
  keyEvent(event: KeyboardEvent) {
    if (event.key === 'n') {
      if ((event.metaKey || event.ctrlKey)) {
        this.newMessage();
        event.stopPropagation();
        event.preventDefault();
      }
    } else if (event.key === 'Escape') {
      this.showEmojiList = false;
    }
  }

  filterTemplates(text: string) {
    if (!text) {
      this.filteredTemplates = this.templates;
    }
    this.filteredTemplates = this.templates.filter((eachTemplate: any) => (eachTemplate.templateName.toLowerCase().indexOf(text.toLowerCase()) > -1) || (eachTemplate.templateText.toLowerCase().indexOf(text.toLowerCase()) > -1));
  }

  toggleSideNav($event: any) {
    this.sidenavService.toggle();
    $event.stopPropagation();
  }

  checkHiddenDocument() {
    if (document.hidden) {
      this.isTabInBackground = true;
      if (this.selectedAccountPhone.unreadMessages) {
        this.titleMessage = `${this.selectedAccountPhone.unreadMessages} Unread messages`;
        this.titleService.setTitle(`${this.selectedAccountPhone.unreadMessages} Unread messages`);
      }
      if (this.titleTimer) {
        clearInterval(this.titleTimer);
      }
      this.titleTimer = window.setInterval(() => {
        this.changeTitle();
      }, 3000);
    } else {
      this.isTabInBackground = false;
      this.titleService.setTitle(environment.appName);
      if (this.titleTimer) {
        clearInterval(this.titleTimer);
      }
    }
  }

  getUserData(cb ?: any) {
    this.messagesService.getUserData().subscribe({
      next: (res) => {
        if (res.signatureOn) {
          this.userPref.signatureOn = true;
        } else {
          this.userPref.signatureOn = false;
        }
        this.userPref.showLastMessage = res.showLastMessage;
        this.userPref.enterIsSend = res.enterIsSend;
        this.userPref.signature = res.signature || '';
        if (cb) {
          cb();
        }
        try {
          const localSettings = JSON.parse(localStorage.getItem('userPref') || '');
          if (localSettings) {
            if (localSettings.hideTagFilter) {
              this.userPref.hideTagFilter = true;
            } else {
              this.userPref.hideTagFilter = false;
            }
          }
        } catch (error) {
          this.logger.log(error);
          this.userPref.hideTagFilter = false;
        }
      },
      error: (err) => {
        this.logger.log(err);
      }
    })
  }

  saveUserData() {
    this.messagesService.saveUserSettings(this.userPref).subscribe({
      next: (res) => {
        this.snackbar.open('Updated');
      },
      error: (err) => {
        this.logger.log(err);
      }
    })
  }

  getAccountPhones() {
    this.loadingContacts = true;
    this.messagesService.getAccountPhones().subscribe({
      next: (res) => {
        this.accountPhones = res;
        // this.filterAccPhones('');
        try {
          const userPref = JSON.parse(localStorage.getItem('userPref') || '{}');
          if (userPref && userPref.accountPhone) {
            const match = this.accountPhones.find((eachAccountPhone: any) => eachAccountPhone.accountPhone === userPref.accountPhone.accountPhone);
            if (match) {
              this.selectedAccountPhone = match;
              this.userPref.accountPhone = match;
            } else {
              this.selectedAccountPhone = userPref.accountPhone;
              this.userPref.accountPhone = userPref.accountPhone;
            }
          } else {
            this.selectedAccountPhone = '';
          }
        } catch (error) {
          this.selectedAccountPhone = '';
        }
        let match = '';
        if (this.selectedAccountPhone && this.selectedAccountPhone.accountPhoneId) {
          match = res.find((eachPhone: any) => eachPhone.accountPhoneId === this.selectedAccountPhone.accountPhoneId);
        }
        if (!this.selectedAccountPhone || !match) {
          this.selectedAccountPhone = res[0];
        }
        this.getAccountContacts(this.selectedAccountPhone.accountPhone);
        this.getAccountTags(this.selectedAccountPhone.accountPhone);
        this.getDraftDetails();
        this.getSavedTemplates();
        this.calculateTotalUnread();
      },
      error: (err) => {
        this.logger.log(err);
        this.snackbar.open(err.status === 401? 'Session timed out' :'Error fetching account phone numbers');
      }
    })
  }

  updateAccountPhone() {
    this.messagesService.getAccountPhones().subscribe({
      next: (res) => {
        if (!this.selectedAccountPhone) {
          this.accountPhones = res;
          return;
        }
       const match = res.find((eachContact: any) => eachContact.accountPhoneId === this.selectedAccountPhone.accountPhoneId);
       if (match) {
        this.selectedAccountPhone.unreadMessages = match.unreadMessages;
       }
      },
      error: (err) => {
        this.logger.log(err);
      }
    })
  }

  calculateTotalUnread() {
    for (const accoutPhone of this.accountPhones) {
      this.totalUnread += accoutPhone.unreadMessages;
    }
  }

  // filterAccPhones(text: string) {
  //   if (!text) {
  //     this.filteredAccPhones = this.accountPhones;
  //     return;
  //   }
  //   try {
  //     text = text.replace(/[\(\)-]/g, '').toLowerCase().trim();
  //   } catch (error) {
  //     this.logger.log(error);
  //     text = '';
  //   }
  //   if (!text) {
  //     this.filteredAccPhones = this.accountPhones;
  //     return;
  //   }
  //   this.filteredAccPhones = this.accountPhones.filter((eachPhone: any) => ((eachPhone.accountPhone.indexOf(text) > -1) || (eachPhone.accountPhoneName.toLowerCase().indexOf(text) > -1)));
  // }

  // pickAccPhone() {
  //   this.accPhoneSelect.open();
  // }

  accPhoneChanged(cb?: any) {
    this.selectedContact = '';
    this.messages = [];
    this.contacts = [];
    this.page.start = 0;
    this.getAccountContacts(this.selectedAccountPhone.accountPhone);
    this.getAccountTags(this.selectedAccountPhone.accountPhone);
    this.getSavedTemplates();
    this.userPref.accountPhone = this.selectedAccountPhone;
    localStorage.setItem('userPref', JSON.stringify(this.userPref));
    this.updateBadge();
    if (cb) {
      setTimeout(() => {
        cb();
      }, 10);
    }
  }

  getAccountTags(accountPhone: string | number) {
    this.tags = [
      {
        id: -2,
        accountPhone: 123,
        tag: '@ IsTagged'
      },
      {
        id: -1,
        accountPhone: 1234,
        tag: '@ UnTagged'
      }
    ];
    this.messagesService.getAccountPhoneTags(accountPhone).subscribe({
      next: (res) => {
        this.tags = this.tags.concat(res);
      },
      error: (err) => {
        this.logger.log(err);
      }
    })
  }

  getAccountContacts(accountPhone: string | number) {
    this.loadingContacts = true;
    this.messagesService.getContacts(accountPhone, this.page).subscribe({
      next: (res) => {
        for (const eachContact of res) {
          const match = this.contacts.find(localContact => localContact.phoneNumber === eachContact.phoneNumber);
          if (!match) {
            this.contacts.push(eachContact);
          }
        }
        // this.contacts = [...this.contacts, ...res];
        this.contacts = [...this.contacts];
        this.loadingContacts = false;
        if (res) {
          this.page.start += res.length;
        }
      },
      error: (err) => {
        this.logger.log(err);
        this.loadingContacts = false;
      }
    })
  }

  contactSelected(contact: any) {
    this.showEmojiList = false;
    if (this.selectedContact && contact.contactId === this.selectedContact.contactId) {
      return;
    }
    if (this.userPref.signatureOn) {
      this.outGoingMsg.message = `\n${this.userPref.signature}`;
    } else {
      this.outGoingMsg.message = '';
    }
    if (contact.contactId === -1) {
      // new message
      return;
    }
    if (this.previousContact) {
      this.notificationService.sendStopMessageView(this.selectedAccountPhone.accountPhone, this.loggedInUser.userName, this.previousContact.phoneNumber);
    }
    this.selectedContact = contact;
    this.previousContact = contact;
    this.oldNote = this.selectedContact.notes || '';
    setTimeout(() => {
      const ele = document.getElementById('msgBox');
      if (ele) {
        ele.focus();
        position(ele, 0);
        this.notificationService.sendMessageView(this.selectedAccountPhone.accountPhone, this.loggedInUser.userName, this.selectedContact.phoneNumber);
        this.charCount(this.outGoingMsg.message);
      }
    }, 1);
    this.messagePage.start = 0;
    this.messages = [];
    setTimeout(() => {
      if (!this.messageScrolledSub) {
        this.messageScrolledSub = this.messageScroller.elementScrolled().pipe(
          map(() => this.messageScroller.measureScrollOffset('top')),
          pairwise(),
          filter(([y1, y2]) => (y2 < y1) && (y1 < 180)),
          throttleTime(500)
        ).subscribe({
          next: () => {
            this.zone.run(() => {
              this.getMessages(this.selectedContact.phoneNumber);
            });
          }
        })
      }
      // clear input box for out going message.
      this.getMessages(this.selectedContact.phoneNumber);
      this.isMultiActive(true);
      // call all read messages
      // if (contact.unreadMessages) {
      //   this.actOnContact(contact, 'read');
      // }
    }, 0);
  }

  getMessages(phoneNumber: string | number) {
    this.loadingMessages = true;
    this.messagesService.getMessages(this.selectedAccountPhone.accountPhone, phoneNumber, this.messagePage).subscribe({
      next: (res) => {
        this.loadingMessages = false;
        if (this.selectedContact.phoneNumber !== phoneNumber) {
          return;
        }
        this.messages = [...res.reverse().concat(this.messages)];
        // this.messages = [...res.concat(this.messages)];
        if (this.messagePage.start === 0) {
          setTimeout(() => {
            this.messageScroller.scrollTo({bottom: 0, behavior: 'auto'});
          }, 10);
          setTimeout(() => {
            this.messageScroller.scrollTo({bottom: 0, behavior: 'smooth'});
          }, 500);
        } else {
          if (res.length) {
            this.messageScroller.scrollToIndex(res.length);
          }
        }
        if (res) {
          this.messagePage.start += res.length;
        }
      },
      error: (err) => {
        this.loadingMessages = false;
        if (err.status === 403) {
          this.snackbar.open(err.error || "Failed to get messages", 'Close', {duration: 8000});
        }
        this.logger.log(err);
      }
    })
  }

  estimateMessageSize(message: any): number {
    // this.logger.log(message);
    return 82;
  }

  pageResized() {
    this.sidenavService.shrinkSidenav();
  }

  trackMsg(index: number, item: any) {
    return item.messageId;
  }

  // scrollToTop() {
  //   this.contactScroller.scrollToIndex(0);
  // }

  newMessage() {
    this.selectedContact = {
      phonNumber : '',
      contact1 : '',
      contact2 : '',
      contactId : -1
    }
    this.messages = [];
    this.contactSelected(this.selectedContact);
    setTimeout(() => {
      const ele = document.getElementById('composeInput');
      if (ele) {
        ele.focus();
      }
    }, 0);
  }

  messageBoxClicked() {
    this.showEmojiList = false;
    if (this.selectedContact && this.selectedContact.contactId === -1) {
      const sendTo = document.getElementById('composeInput') as HTMLInputElement;
      if (sendTo && sendTo.value) {
        this.addToComposeList({
          input: sendTo,
          value: sendTo.value
        })
      }
    }
  }

  addToComposeList(event: MatChipInputEvent) {
    const value = (event.value || '').trim();
    if (!value) {
      return;
    }
    if (value[0] === '#') {
      return;
    }
    if (value && this.isValidphoneNumber(value)) {
      const idx = this.composeList.findIndex(eachContact => eachContact.phoneNumber ===  value);
      if (idx === -1) {
        this.composeList.push({
          contact1: '',
          contact2: '',
          phoneNumber: event.value.replace(/[^0-9+]/g, '')
        })
      }
    } else {
      this.snackbar.open('Invalid Phone number', 'Close');
      return;
    }
    event.chipInput?.clear();
    this.filterContact.setValue(null);
    const ele = document.getElementById('composeInput') as HTMLInputElement;
    ele.value = '';
  }

  selectedComposeContact(event: MatAutocompleteSelectedEvent) {
    const selected = event.option.value;
    if (selected.contactId || selected.contactId === 0) {
      const idx = this.composeList.findIndex(eachContact => eachContact.phoneNumber ===  selected.phoneNumber);
      if (idx === -1) {
        this.composeList.push(event.option.value);
      }
    } else {
      // group selected
      const match = this.composeList.find(eachContact => eachContact.groupName === selected.groupName);
      if (!match) {
        this.composeList.push(event.option.value);
      }
    }
    this.filterContact.setValue(null);
    const ele = document.getElementById('composeInput') as HTMLInputElement;
    ele.value = '';
  }

  removeChip(data: any) {
    let idx = -1;
    if (data.id || data.id === 0) {
      idx = this.composeList.findIndex(eachContact => eachContact.id ===  data.id);
    } else {
      idx = this.composeList.findIndex(eachContact => eachContact.phoneNumber ===  data.phoneNumber);
    } 
    if (idx > -1) {
      this.composeList.splice(idx, 1);
    }
  }

  expandGroup(group: any, event: MouseEvent) {
    event.stopPropagation();
    this.messagesService.getGroupContacts(this.selectedAccountPhone.accountPhone, group.id).subscribe({
      next: (res) => {
        if (res && res.contacts) {
          for (const contact of res.contacts) {
            this.composeList.push(contact);
          }
          this.removeChip(group);
        }
      },
      error: (err) => {
        this.logger.log(err);
        this.snackbar.open('Failed to expand group');
      }
    })
  }

  isFileImage(file: File) {
    return file && file['type'].split('/')[0] === 'image';
  }

  fileSelected(event: Event) {
    const ele = event.target as HTMLInputElement;
    if (!this.isMultiActive() && this.composedMessage.attachments.length > 0) {
      ele.value = '';
      return;
    }
    if (ele.files && ele.files.length) {
      const files = ele.files;
      for (const eachFile of Array.from(files)) {
        if (this.isFileImage(eachFile)) {
          if (!this.composedMessage || !this.composedMessage.attachments) {
            this.composedMessage = {
              attachments: [],
              urls: []
            };
          }
          this.composedMessage.attachments.push(eachFile);
        }
      }
    }
    ele.value = '';
    this.charCount(this.outGoingMsg.message);
  }

  getPreview(file: File) {
    if (this.isFileImage(file)) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(URL.createObjectURL(file));
    } else {
      return null;
    }
  }

  removeAttachement(pickedFile: File) {
    const idx = this.composedMessage.attachments.findIndex((file: File) => file.name === pickedFile.name);
    if (idx > -1) {
      this.composedMessage.attachments.splice(idx, 1);
    }
    this.charCount(this.outGoingMsg.message);
  }

  removeAttachementUrl(forwardAttachment: any) {
    const idx = this.composedMessage.urls.findIndex((eachUrl: any) => eachUrl.id === forwardAttachment.id);
    if (idx > -1) {
      this.composedMessage.urls.splice(idx, 1);
    }
    this.charCount(this.outGoingMsg.message);
  }

  onPaste(event: any) {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    let blob = null;
    for (const item of items) {
      if (item.type.indexOf('image') === 0) {
        blob = item.getAsFile();
      }
    }
    if (blob) {
      if (!this.selectedAccountPhone.canSendMMS) {
        this.snackbar.open(`Sorry! You don't have access to MMS`, 'Close');
        return;
      }
      if (!this.composedMessage || !this.composedMessage.attachments || !this.composedMessage.attachments.length) {
        this.composedMessage = {
          attachments: [],
          urls: []
        };
      }
      if (!this.isMultiActive() && this.composedMessage.attachments.length > 0) {
        event.preventDefault();
        return;
      }
      this.composedMessage.attachments.push(blob);
      event.preventDefault();
    }
  }

  openMessageSearch() {
    const msgSearchRef = this.dialog.open(MessageSearchComponent, {
      data: {
        title: 'Message Search',
        contact: this.selectedContact,
        selectedAccountPhone: this.selectedAccountPhone
      },
      minHeight: '60vh',
      minWidth: '70%',
      closeOnNavigation: true
    });
    msgSearchRef.afterClosed().subscribe((result: any) => {
      if (result) {
        if (result.action === 'forward') {
          this.msgForward(result);
        } else if (result.action === 'viewConversation') {
          if (result.message.phoneNumber === this.selectedContact.phoneNumber) {
            this.viewConversation(result.message, result.position);
          } else {
            // find the contact in local list 
            const matchIdx = this.contacts.findIndex(eachContact => eachContact.phoneNumber === result.message.phoneNumber);
            if (matchIdx > -1) {
              // this.selectedContact = '';
              this.messages = [];
              // this.selectedContact = match;
              // get meessages and then view it
              this.contactSelected(this.contacts[matchIdx]);
              setTimeout(() => {
                this.contactScroller.scrollToIndex(matchIdx);
                this.viewConversation(result.message, result.position);
              }, 3000);
            } else {
              // if not present in current contacts list
              // fetch with search
              const lPage = {
                start: 0,
                limit: 30,
                search: result.message.phoneNumber,
                sort: 'lastActivity',
                sortDirection: 'desc',
                filter: ''
              }
              this.messagesService.getContacts(this.selectedAccountPhone.accountPhone, this.page).subscribe({
                next : (res) => {
                  if (res && res.length) {
                    this.contacts.unshift(res[0]);
                    // this.selectedContact = res[0];
                    this.messages = [];
                    this.contactSelected(res[0]);
                    setTimeout(() => {
                      this.contactScroller.scrollToIndex(0);
                      this.viewConversation(result.message, result.position);
                    }, 3000);
                  } else {
                    this.snackbar.open('Could not find the contact');
                  }
                }, 
                error: (err) => {
                  this.logger.log(err);
                  this.snackbar.open('Failed to open converstaion');
                }
              })
            }
          }
        }
      }
    });
  }
  

  prepContactResult(contact: any) {
    if (contact.contactId || contact.contactId === 0) {
      return `${contact.contact1} ${contact.contact2} (${this.phonePipe.transform(contact.phoneNumber)})`
    } else {
      return `${contact.groupName}`
    }
  }

  scrollToMSg(message: any) {
    const idx = this.messages.findIndex((eachMsg) => eachMsg.messageId === message.messageId);
    if (idx > -1) {
      this.messageScroller.scrollToIndex(idx);
    }
  }

  viewConversation(message: any, position: number) {
    if (position < this.messagePage.start) {
      this.scrollToMSg(message);
    } else {
      const limit = this.messagePage.limit*Math.ceil(position/this.messagePage.limit);
      const start = this.messagePage.limit*Math.floor(position/this.messagePage.limit);
      const messagePage = {
        start: 0,
        limit: limit,
        search: '',
        sort: 'contactId',
        sortDirection: 'asc'
      };
      this.messages = [];
      this.loadingMessages = true;
      this.messagesService.getMessages(this.selectedAccountPhone.accountPhone, this.selectedContact.phoneNumber, messagePage).subscribe({
        next: (res) => {
          this.loadingMessages = false;
          this.messages = [...res.reverse().concat(this.messages)];
          this.messagePage.start = start;
          setTimeout(() => {
            this.scrollToMSg(message);
          }, 0);
        }, 
        error: (err) => {
          this.loadingMessages = false;
          this.logger.log(err);
        }
      })
      
    }
    
    // get messages
    // find message position
    // scroll to message index
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

  openContact(contact: any) {
    const contactRef = this.dialog.open(ContactDialogComponent, {
      data: { 
        title: contact ? 'Edit Contact' : 'New Contact',
        contact,
        selectedAccountPhone: this.selectedAccountPhone
      },
      minWidth: '40vw',
      closeOnNavigation: true
    });
    // contactRef.afterClosed().subscribe((result: any) => {
    //   if (result && result.contactId) {
    //     this.logger.log(result);
    //   }
    // });
  }

  confirmDelete(data: any, deleteConversation: boolean) {
    const confirmRef = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete', message: 'Are you sure to delete?' }
    });
    confirmRef.afterClosed().subscribe(result => {
      if (result) {
        if (deleteConversation) {
          // ask for deleting conversation
          const delMsgs = this.dialog.open(ConfirmDialogComponent, {
            data: { title: 'Delete', message: 'Do you want to delete contact as well?'}
          });
          delMsgs.afterClosed().subscribe(msgResult => {
            if (msgResult) {
              // delete contact as well
              this.deleteContact(data, true, true);
            } else {
              // just delete messages.
              this.deleteContact(data, true, false);
            }
          })
        } else {
          this.deleteMessage(data);
        }
      }
    })
  }

  deleteContact(contact: any, deleteMessages: boolean, deleteContact: boolean) {
    this.messagesService.deleteContact(this.selectedAccountPhone.accountPhone, contact.phoneNumber, deleteMessages, deleteContact).subscribe({
      next: (res) => {
        if (deleteContact) {
          const idx = this.contacts.findIndex(eachContact => eachContact.contactId === contact.contactId);
          if (idx > -1) {
            this.zone.run(() => {
              this.contacts.splice(idx, 1);
              this.contacts = [...this.contacts];
              if (this.selectedContact.contactId === contact.contactId) {
                this.selectedContact = null;
              }
            });
          }
        } else if (this.selectedContact.contactId === contact.contactId) {
          this.messages = [];
          this.zone.run(() => {
            this.messages = [...this.messages];
          })
        }
        this.snackbar.open('Done');
      },
      error: (err) => {
        this.logger.log(err);
        this.snackbar.open('Failed to delete');
      }
    })
  }

  deleteMessage(message: any) {
    this.messagesService.deleteMessage(message.accountPhone, message.phoneNumber, message.messageId).subscribe({
      next: (res) => {
        const matchIdx = this.messages.findIndex(eachMessage => eachMessage.messageId === message.messageId);
        if (matchIdx > -1) {
          this.zone.run(() => {
            this.messages.splice(matchIdx, 1);
            this.messages = [...this.messages];
          });
        }
      },
      error: (err) => {
        this.logger.log(err);
        this.snackbar.open(err.error || 'Failed to delete');
      }
    });
  }

  replyFocused() {
    if (this.selectedContact && this.selectedContact.contactId !== -1) {
      this.actOnContact(this.selectedContact, 'read');
    }
  }

  actOnContact(contact: any, action: string) {
    switch (action) {
      case 'read':
        this.messagesService.markContactRead(this.selectedAccountPhone.accountPhone, contact.phoneNumber).subscribe({
          next: (res) => {
            if (res) {
              const match = this.contacts.find(eachContact => eachContact.contactId === res.contactId);
              if (match) {
                match.lastMessageBody = res.lastMessageBody;
                match.unreadMessages = res.unreadMessages;
              }
              if (this.selectedContact.contactId === res.contactId) {
                this.selectedContact.unreadMessages = 0;
                this.messages.forEach(message => {
                  message.isRead = true;
                });
              }
              this.updateAccountPhone();
              if (this.page.filter) {
                this.contactFilterUpdated();
              }
            }
          },
          error: (err) => {
            this.logger.log(err);
            this.snackbar.open('Failed to update try again');
          }
        })
        break;
      case 'delete':
        this.confirmDelete(contact, true);
        break;
      case 'copyNumber':
        this.copyText(contact.phoneNumber);
        break;
      case 'viewContact':
        this.openContact(contact);
        break;
      case 'block':
        this.blockContact(contact);
        break;
      case 'TagList':
        this.openTagList(contact);
        break;
    }
  }

  actOnMessage(message: any, action: string) {
    switch (action) {
      case 'read':
        const read = message.isRead ? false : true;
        this.messagesService.markMessage(this.selectedAccountPhone.accountPhone, this.selectedContact.phoneNumber, message.messageId, read).subscribe({
          next: (res) => {
            message.isRead = read;
            if (message.isRead) {
              (this.selectedAccountPhone.unreadMessages > 0) ? this.selectedAccountPhone.unreadMessages-- : this.selectedAccountPhone.unreadMessages = 0;
            } else {
              this.selectedAccountPhone.unreadMessages++;
            }
            // update the message read and unread count on contact
            // const match = this.messages.find(eachMessage => eachMessage.messageId === res.messageId);
            // if (match) {
            //   this.zone.run(() => {
            //     match.isRead = !match.isRead;
            //   });
            // }

            // update overall counts

            // this.snackbar.open(`Done. Message marked as read`);
          },
          error: (err) => {
            this.logger.log(err);
            this.snackbar.open('Failed to update try again');
          }
        })
        break;
      case 'delete':
        this.confirmDelete(message, false);
        break;
      case 'forward':
        this.msgForward(message);
        break;
      case 'copyMessage':
        this.copyText(message.messageBody);
        break;
    }
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

  openTagList(contact: any) {
    const tagRef = this.dialog.open(TagDialogComponent, {
      data: {
        title: 'Tags',
        accountPhone: this.selectedAccountPhone,
        contact
      },
      width: '60%',
      // minHeight: 'calc(100vh - 90px)',
      height : 'auto',
      closeOnNavigation: true,
      // disableClose: true
    });
    tagRef.afterClosed().subscribe(result => {
      this.getAccountTags(this.selectedAccountPhone.accountPhone);
    })
  }

  msgForward(message: any) {
    this.newMessage();
    setTimeout(() => {
      this.outGoingMsg.message = message.messageBody;
      if (!this.composedMessage) {
        this.composedMessage = {
          attachments: [],
          url: []
        };
      }
      if (message.attachments) {
        this.composedMessage.urls = message.attachments;
      }
      this.charCount(this.outGoingMsg.message);
    }, 0);
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

  cancelNewMsg() {
    this.messages = [];
    this.selectedContact = null;
    this.composeList = [];
    this.filterContact.setValue(null);
    const ele = document.getElementById('composeInput') as HTMLInputElement;
    ele.value = '';
    if (this.composedMessage && this.composedMessage.attachments && this.composedMessage.attachments.length) {
      this.composedMessage.attachments = [];
    }
    this.outGoingMsg = {
      message: '',
      scheduleDt: '',
      groupGuid: ''
    };
  }

  uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  getTimeString(date: any) {
    const dt = new Date(date);
    const m = (dt.getMonth() + 1).toString().padStart(2, '0');
    const y = dt.getFullYear();
    const d = dt.getDate().toString().padStart(2, '0');
    const time = dt.toTimeString();
    return `${y}-${m}-${d}T${time.slice(0, time.indexOf(' '))}`
  }

  prepMessage() {
    this.showEmojiList = false;
    if (this.disableSend()) {
      this.snackbar.open("No Message to send");
      return;
    }
    if (!this.selectedAccountPhone.canReply) {
      this.snackbar.open(`No Permission to reply`, 'Close');
      return;
    }
    if(this.selectedContact.contactId !== -1) {
      // reply mode
      // this.sendMessage2([this.selectedContact.phoneNumber], [], '', []);
      const contact = {
        contact1: this.selectedContact.contact1,
        contact2: this.selectedContact.contact2,
        phoneNumber: this.selectedContact.phoneNumber,
      }
      this.sendMessage2([contact], [], '', []);
      this.replyFocused();
    } else {
      // new message mode
      if (!this.composeList || !this.composeList.length) {
        return;
      }
      let groupGuid = '';
      // if (this.composeList && this.composeList.length > 1) {
      //   groupGuid = this.uuidv4();
      // }
      const recipients = [];
      const groupNames: string[] = [];
      for (const contact of this.composeList) {
        if (contact.phoneNumber && this.isValidphoneNumber(contact.phoneNumber)) {
          recipients.push({
            contact1: contact.contact1,
            contact2: contact.contact2,
            phoneNumber: contact.phoneNumber
          });
        } else if (contact.groupName) {
          groupNames.push(contact);
        }
      }
      if (groupNames && groupNames.length && !this.selectedAccountPhone.canSendToGroup) {
        this.snackbar.open('Sorry! No permission to send group message', 'Close');
        return;
      }
      const attachmentIds: string[] = [];
      if (this.composedMessage && this.composedMessage.urls && this.composedMessage.urls.length) {
        for (const attachment of this.composedMessage.urls) {
          attachmentIds.push(attachment.id);
        }
      }
      this.sendMessage2(recipients, attachmentIds, groupGuid, groupNames);
    }
  }


  sendMessage2(phoneNumbers: any[], attachmentIds: string[], groupGuid: string, groupNames: string[]) {
    let dtString = '';
    if (this.outGoingMsg.scheduleDt) {
      dtString = this.getTimeString(this.outGoingMsg.scheduleDt);
      // const isoStr = new Date(this.outGoingMsg.scheduleDt).toISOString();
      // dtString = isoStr.slice(0, isoStr.lastIndexOf('.'));
    }
    const msgObj = {
      MessageBody: this.outGoingMsg.message,
      ScheduledDate: dtString,
      GroupGuid: this.outGoingMsg.groupGuid
    }
    this.messagesService.sendMessage2(
      this.selectedAccountPhone.accountPhone,
      phoneNumbers, attachmentIds,
      msgObj,
      groupNames,
      this.composedMessage ? this.composedMessage.attachments : []
    ).subscribe({
      next: (res) => {
        if (res.length === 1) {
          if (this.selectedAccountPhone.accountPhone === res[0].accountPhone) {
            // move this to list
            if (this.selectedContact.contactId === res[0].contactId) {
              const match = this.messages.find(eachMessage => eachMessage.messageId === res[0].messageId);
              if (match) {
                match.isRead = res[0].isRead;
                match.transmissionState = res[0].transmissionState;
                match.deliveredDate = res[0].deliveredDate;
                if (dtString) {
                  match.scheduleDt = dtString;
                }
              } else {
                if (!res[0].createdDate) {
                  res[0].createdDate = new Date().toString();
                }
                this.zone.run(() => {
                  this.messages.push(res[0]);
                  this.messages = [...this.messages];
                })
              }
              setTimeout(() => {
                this.scrollToMSg(res[0]);
              }, 0);
            } else {
              // fetch contact and add to list
              this.updateContact(res[0]);
            }
          }
        } else {
          for (const eachRes of res) {
            this.updateContact(eachRes);
          }
        }
        if (this.userPref.signatureOn) {
          this.outGoingMsg.message = `\n${this.userPref.signature}`;
        } else {
          this.outGoingMsg.message = '';
        }
        this.outGoingMsg.scheduleDt = '';
        if (this.composedMessage) {
          this.composedMessage.attachments = [];
          this.composedMessage.urls = [];
        }
        if (this.selectedContact.contactId === -1) {
          this.selectedContact = null;
          // if sent to one person open that conversation
          setTimeout(() => {
            this.openFirstConversation();
          }, 0);
        }
        this.composeList = [];
        setTimeout(() => {
          const ele = document.getElementById('msgBox');
          if (ele) {
            ele.focus();
            position(ele, 0);
          }
        }, 0);
        setTimeout(() => {
          this.messageScroller.scrollTo({bottom: 0, behavior: 'smooth'});
        }, 100);
      },
      error: (err) => {
        this.logger.log(err);
      }
    })
  }

  openFirstConversation() {
    this.contactScroller.scrollToIndex(0);
    const contactEles: any = document.getElementsByClassName('contactCard');
    if (contactEles && contactEles.length) {
      contactEles[0].click();
    }
    
  }


  playNotificationSound(msg?: string) {
    if (this.isTabInBackground) {
      this.titleService.setTitle(`New message for ${msg}`);
    }
    const ele = document.getElementById('notifyAudio') as HTMLAudioElement;
    ele.play();
  }

  reloadMessages(contact: any) {
    this.messages = [];
    this.messagePage.start = 0;
    this.getMessages(contact.phoneNumber);
  }

  toggleSignature(alreadySaved ?: boolean) {
    if (!this.userPref.signature) {
      return;
    }
    let pos = 0;
    if (this.userPref.signatureOn) {
      this.userPref.signatureOn = false;
      // remove signature if found
      const idx = this.outGoingMsg.message.lastIndexOf(this.userPref.signature);
      if (idx > -1) {
        this.outGoingMsg.message = this.outGoingMsg.message.slice(0, idx).trim();
        pos = idx;
      }
    } else {
      this.userPref.signatureOn = true;
      this.outGoingMsg.message += `\n${this.userPref.signature}`;
      const idx = this.outGoingMsg.message.lastIndexOf(this.userPref.signature);
      pos = idx - 1 ;
    }
    setTimeout(() => {
      const ele = document.getElementById('msgBox');
      if (ele) {
        ele.focus();
        position(ele, pos);
      }
    }, 0);
    if (!alreadySaved) {
      this.saveUserData();
    }
    this.charCount(this.outGoingMsg.message);
    // localStorage.setItem('userPref', JSON.stringify(this.userPref))
  }

  getLatestdate(contact: any) {
    if (contact.lastReceived && contact.lastSent) {
      const receive = new Date(contact.lastReceived).getTime();
      const sent = new Date(contact.lastSent).getTime();
      if (receive >= sent) {
        return contact.lastReceived
      } else {
        return contact.lastSent;
      }
    } else {
      return contact.lastReceived || contact.lastSent || '';
    }
  }

  getMessageDetails(data: any) {
    const messagePage = {
      start: 0,
      limit: 30,
      search: '',
      sort: 'createdDate',
      sortDirection: 'desc',
    };
    this.messagesService.getMessages(data.message.accountPhone, data.message.phoneNumber, messagePage, data.message.messageId).subscribe({
      next: (res) => {
        const match = this.messages.find(eachMessage => eachMessage.messageId === data.message.messageId);
        if (match) {
          match.createdDate = res[0].createdDate;
          match.transmissionState = res[0].transmissionState;
        }
      },
      error: (err) => {
        this.logger.log(err);
      }
    })
  }

  getContactDetails(data: any, contact: any) {
    const page = {
      start: 0,
      limit: 30,
      search: '',
      sort: 'lastActivity',
      sortDirection: 'desc',
      filter: '',
      showTagged: true,
      showUntagged: true,
      tagFilter: ''
    };
    page.search = data.contact.phoneNumber;
    this.messagesService.getContacts(data.message.accountPhone || data.sender, page).subscribe({
      next: (res) => {
        if (!res) {
          return;
        }
        if (!contact) {
          const match = this.contacts.find((eachContact) => eachContact.phoneNumber === res[0].phoneNumber);
          if (!match) {
            this.contacts.unshift(res[0]);
          }
          this.contacts = [...this.contacts];
          setTimeout(() => {
            this.contacts = this.moveToTop(this.contacts, res[0].contactId, 'contactId');
            this.contactSelected(res[0]);
          }, 10);
          return;
        }
        contact.unreadMessages = res[0].unreadMessages;
        contact.lastReceived = res[0].lastReceived;
        contact.lastSent = res[0].lastSent;
        contact.hasError = res[0].hasError;
        contact.lastMessageBody = res[0].lastMessageBody;
      },
      error: (err) => {
        this.logger.log(err);
      }
    })
  }

  getDraftDetails() {
    this.route.queryParams.subscribe((params: any) => {
      // this.logger.log(params);
      if (params.editMessage) {
        this.messagesService.getDraftList(this.selectedAccountPhone.accountPhone, params.editMessage).subscribe({
          next: (res) => {
            if (res && res.length) {
              this.openScheduleNewMsg(res[0]);
            } else {
              this.snackbar.open('No message found with given Id');
            }
            this.router.navigate(['.'], {relativeTo: this.route, queryParams: {} });
          },
          error: (err) => {
            this.logger.log(err);
            this.snackbar.open(err.error || 'No message found with given Id');
          }
        })
      } else if (params.acc && params.phn) {
        // open a conversation from account phone.
        this.openConversation(params.acc, params.phn);
        this.router.navigate(['.'], {relativeTo: this.route, queryParams: {} });
      }
    })
  }

  openConversation(accountPhone: string, phoneNumber: string) {
    if (this.selectedAccountPhone.accountPhone === accountPhone) {
      this.openLinkedContact(accountPhone, phoneNumber);
    } else {
      // select new accountphone.
      const match = this.accountPhones.find((eachAcc: any) => eachAcc.accountPhone === accountPhone);
      if (match) {
        this.selectedAccountPhone = match;
        this.page = {
          start: 0,
          limit: 30,
          search: '',
          sort: 'lastActivity',
          sortDirection: 'desc',
          filter: '',
          showTagged: true,
          showUntagged: true,
          tagFilter: '',
          // customTag: [],
          selectedTags: []
        };
        this.accPhoneChanged(() => {
          this.openLinkedContact(accountPhone, phoneNumber);
        });
      } else {
        this.logger.log('Could not find account phone');
      }
    }
  }

  openLinkedContact(accountPhone: string | number, phoneNumber: string | number) {
    const match = this.contacts.find((eachContact: any) => eachContact.phoneNumber === phoneNumber);
      if (match) {
        // move contact to top place and then open it

        this.contactSelected(match);
      } else {
        // if not present get contact and open it
        const obj = {
          contact: {
            phoneNumber
          },
          message: {
            accountPhone
          }
        }
        this.getContactDetails(obj, null);
      }
  }

  openSettings(event?: MouseEvent ) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    const settingsRef = this.dialog.open(SettingsComponent, {
      data: {
        title: 'User preferences',
        accountPhone: this.selectedAccountPhone
      },
      width: '100%',
      minHeight: 'calc(100vh - 90px)',
      height : 'auto',
      closeOnNavigation: true,
      disableClose: true
    });
  }
  

  ngAfterViewInit() {
    this.contactScrolledSub = this.contactScroller.elementScrolled().pipe(
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
    this.contactSearch.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((term): void => {
        this.page.start = 0;
        this.page.search = term;
        this.contacts = [];
        this.contactScroller.scrollToIndex(0);
        this.getAccountContacts(this.selectedAccountPhone.accountPhone);
      });
    this.subscribeToNotifications();
    try {
      const user = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
      if (user && user.userName) {
        this.loggedInUser = user;
      }
    } catch (error) {
      this.loggedInUser = null;
    }
    if (this.maintenanceTimer) {
      clearInterval(this.maintenanceTimer);
    }
    if (this.reportStatusTimer) {
      clearInterval(this.reportStatusTimer);
    }
    this.maintenanceTimer = window.setInterval(() => {
      this.maintenance();
    }, 30000);
    this.reportStatusTimer = window.setInterval(() => {
      this.reportUserStatus();
    }, 10000);
    setTimeout(() => {
      this.setContactDivWidth();
    }, 10);
  }

  contactFilterUpdated() {
    this.page.start = 0;
    this.contacts = [];
    this.prepTagFilter();
    this.getAccountContacts(this.selectedAccountPhone.accountPhone);
  }

  prepTagFilter() {
    this.page.tagFilter = '';
    const tagFilter: string[] = [];
    this.page.showTagged = false;
    this.page.showUntagged = false;
    for (const tag of this.page.selectedTags) {
      if (tag === '@ IsTagged') {
        this.page.showTagged = true;
      } else if (tag === '@ UnTagged') {
        this.page.showUntagged = true;
      } else {
        tagFilter.push(tag);
      }
    }
    if (!tagFilter.length && !this.page.showTagged && !this.page.showUntagged) {
      // no extra tags
      this.page.showTagged = true;
      this.page.showUntagged = true;
    }
    if (tagFilter.length) {
      this.page.tagFilter = tagFilter.join(' ');
    }

    // if (this.page.selectedTags && this.page.selectedTags.length) {
    //   this.page.tagFilter = this.page.selectedTags.join(' ');
    // } else {
    //   this.page.tagFilter = '';
    // }
    // switch (this.page.customTag) {
    //   case 'All':
    //     this.page.showTagged = true;
    //     this.page.showUntagged = true;
    //     break;
    //   case 'Show Tagged':
    //     this.page.showTagged = true;
    //     this.page.showUntagged = false;
    //     break;
    //   case 'Show Untagged':
    //     this.page.showTagged = false;
    //     this.page.showUntagged = true;
    //     break;
    //   default:
    //     this.page.showTagged = true;
    //     this.page.showUntagged = true;
    //     break;
    // }
  }

  updateContact (data: any) {
    if (!data.contact) {
      if (data.message.contact) {
        data.contact = data.message.contact;
      } else {
        return;
      }
    }
    const match = this.contacts.find(eachContact => eachContact.contactId === data.contact.contactId);
    if (!data.message) {
      data.message = data;
    }
    if (match) {
      match.lastMessageBody = data.message.messageBody;
      match.lastReceived = data.contact.lastReceived;
      match.lastSent = data.contact.lastSent;
      match.unreadMessages = data.contact.unreadMessages;
      match.hasError = data.contact.hasError;
      // if (data.message.direction === 'in') {
      //   match.unreadMessages += 1;
      // }
      if (!data.contact.lastReceived || !data.contact.lastSent) {
        this.getContactDetails(data, match);
      }
      // Move this match to top of the list
      this.contacts = this.moveToTop(this.contacts, data.message.contactId, 'contactId');
    } else {
      if (data.contact.contactId) {
        this.contacts.unshift(data.contact);
      }
    }
    this.zone.run(() => {
      this.contacts = [...this.contacts];
    });
  }

  moveToTop(arr: any[], val: any, keyName: string) {
    if (!arr || !arr.length || !val || !keyName) {
      return arr;
    }
    for (let i = 0; i < arr.length; i++) {
      const ele = arr[i];
      if (ele[keyName] === val) {
        var matchItem = arr.splice(i, 1);
        arr.unshift(matchItem[0]);
        break;
      }
    }
    return arr;
  }

  handleNotification(type: string, data: any) {
    switch (type) {
      case 'newMessage':
        if (this.selectedAccountPhone && (data.sender === this.selectedAccountPhone.accountPhone)) {
          // present in selected account
          if (this.selectedContact && (this.selectedContact.contactId === data.message.contactId)) {
            // this.messages.push(data.message);
            if (data.message.direction === 'in') {
              this.messages.push(data.message);
              this.getMessageDetails(data);
              this.messages = [...this.messages];
              // this.selectedAccountPhone.unreadMessages += 1;
              setTimeout(() => {
                this.messageScroller.scrollTo({bottom: 0, behavior: 'smooth'});
              }, 100);
              this.updateBadge();
            } else {
              const match = this.messages.find(eachMessage => eachMessage.messageId === data.message.messageId);
              if (match) {
                match.isRead = data.message.isRead ? data.message.isRead : match.isRead;
                match.transmissionState = data.message.transmissionState ? data.message.transmissionState : match.transmissionState;
                match.deliveredDate = data.message.deliveredDate ? data.message.deliveredDate : match.deliveredDate;
                match.scheduleDt = data.message.scheduleDt ? data.message.scheduleDt : match.scheduleDt;
              } else {
                this.messages.push(data.message);
                this.getMessageDetails(data);
                this.messages = [...this.messages];
              }
            }
            
          }
          // find contact and update the last message and unread count
          this.updateContact(data);
          if (data.message.direction === 'in') {
            this.selectedAccountPhone.unreadMessages++;
            setTimeout(() => {
              this.playNotificationSound(this.selectedAccountPhone.accountPhoneName || data.sender);
            }, 0);
          }
        } else {
          // send it to global notification place
          if (data.message.direction === 'in') {
            const ele = document.getElementById('bell') as HTMLElement;
            this.zone.run(() => {
              // if (data.message.direction === 'in') {
              this.otherNotifications.unshift(data);
              this.shakeElement(ele);
              // }
            })
            // if (data.message.direction === 'in') {
            this.playNotificationSound(data.sender);
            // }
          }
        }
        break;
      case 'messageStatus':
        if (!data.contact) {
          data.contact = data.message.contact;
        }
        if (this.selectedAccountPhone && (data.sender === this.selectedAccountPhone.accountPhone)) {
          if (this.selectedContact && (this.selectedContact.contactId === data.contact.contactId)) {
            if (!this.messages.length) {
              this.messages.unshift(data.message);
              return;
            }
            const match = this.messages.find(eachMessage => eachMessage.messageId === data.message.messageId);
            if (match) {
              match.isRead = data.message.isRead ? data.message.isRead : match.isRead;
              match.transmissionState = data.message.transmissionState ? data.message.transmissionState : match.transmissionState;
              match.deliveredDate = data.message.deliveredDate ? data.message.deliveredDate : match.deliveredDate;
            } else {
              // no match Found so insert in messages list
              // insert only if it is latest message
              const topMsg = this.messages[0];
              if (topMsg && new Date(topMsg.createdDate).getTime() <= new Date(data.message.createdDate).getTime()) {
                this.messages.unshift(data.message);
              }
            }
          }
          this.updateContact(data);
          this.updateBadge();
        } else {

        }
        break;
      case 'messageView':
        if (this.selectedAccountPhone && (data.sender === this.selectedAccountPhone.accountPhone)) {
          for (const contact of this.contacts) {
            if (contact.phoneNumber === data.contact) {
              if (this.loggedInUser.userName === data.message) {
                return;
              }
              if (!contact.activeUsers || !contact.activeUsers.length) {
                contact.activeUsers = [];
                contact.activeUsers.push({
                  user: data.message,
                  time: new Date().getTime()
                });
              } else {
                const match = contact.activeUsers.find((user: any) => user.user === data.message);
                if (match) {
                  match.time = new Date().getTime();
                } else {
                  contact.activeUsers.push({
                    user: data.message,
                    time: new Date().getTime()
                  });
                }
              }
              this.zone.run(() => {});
              break;
            }
          }
        }
        break;
      case 'messageType':
        if (this.selectedAccountPhone && (data.sender === this.selectedAccountPhone.accountPhone)) {
          for (const contact of this.contacts) {
            if (contact.phoneNumber === data.contact) {
              if (this.loggedInUser.userName === data.message) {
                return;
              }
              if (!contact.typingUsers || !contact.typingUsers.length) {
                contact.typingUsers = [];
                contact.typingUsers.push({
                  user: data.message,
                  time: new Date().getTime()
                });
              } else {
                const match = contact.typingUsers.find((user: any) => user.user === data.message);
                if (match) {
                  match.time = new Date().getTime();
                } else {
                  contact.typingUsers.push({
                    user: data.message,
                    time: new Date().getTime()
                  });
                }
              }
              this.zone.run(() => {});
              break;
            }
          }
        }
        break;
      case 'messageStopType':
        if (this.selectedAccountPhone && (data.sender === this.selectedAccountPhone.accountPhone)) {
          for (const contact of this.contacts) {
            if (contact.phoneNumber === data.contact) {
              if (contact.typingUsers && contact.typingUsers.length) {
                const idx = contact.typingUsers.findIndex((eachUser: any) => eachUser.user === data.message);
                if (idx > -1) {
                  contact.typingUsers.splice(idx, 1);
                }
              }
              this.zone.run(() => {});
              break;
            }
          }
        }
        break;
      case 'messageStopView':
        if (this.selectedAccountPhone && (data.sender === this.selectedAccountPhone.accountPhone)) {
          for (const contact of this.contacts) {
            if (contact.phoneNumber === data.contact) {
              if (contact.activeUsers && contact.activeUsers.length) {
                const idx = contact.activeUsers.findIndex((eachUser: any) => eachUser.user === data.message);
                if (idx > -1) {
                  contact.activeUsers.splice(idx, 1);
                }
              }
              this.zone.run(() => {});
              break;
            }
          }
        }
        break;
      case 'messageDelete':
        if (this.selectedAccountPhone && (data.sender === this.selectedAccountPhone.accountPhone)) {
          if (this.selectedContact && (this.selectedContact.contactId === data.message.contactId)) {
            if (!this.messages.length) {
              return;
            }
            const matchIdx = this.messages.findIndex(eachMessage => eachMessage.messageId === data.message.messageId);
            if (matchIdx > -1) {
              this.zone.run(() => {
                this.messages.splice(matchIdx, 1);
                this.messages = [...this.messages];
              })
            }
          }
          this.updateContact(data);
        }
        break;
      case 'contactRead':
        if (this.selectedAccountPhone && data.sender === this.selectedAccountPhone.accountPhone) {
         this.selectedAccountPhone.unread = data.contact.unread; 
         this.updateContact(data);
         // update the overall counts
         this.updateAccountPhone();
         if (this.selectedContact && this.selectedContact.phoneNumber === data.contact.phoneNumber) {
          // mark all mesages read
          this.messages.forEach(message => {
            message.isRead = true;
          });
         }
         this.updateBadge();
        }
      break;
      case 'contactDeleted':
        if (this.selectedAccountPhone && (data.sender === this.selectedAccountPhone.accountPhone)) {
        //  remove contact
        // if current contact is the removed one then make it null
        const matchIdx = this.contacts.findIndex(eachContact => eachContact.contactId === data.contact.contactId);
        if (matchIdx > -1) {
          this.contacts.splice(matchIdx, 1);
          this.contacts = [...this.contacts];
        }
        if (this.selectedContact && (this.selectedContact.contactId === data.contact.contactId)) {
          this.selectedContact = null;
        }
        this.updateAccountPhone();
        this.updateBadge();
        }
      break;
      case 'contactEdit':
        if (this.selectedAccountPhone && (data.sender === this.selectedAccountPhone.accountPhone)) {
        // update contact information
        const matchIdx = this.contacts.findIndex(eachContact => eachContact.contactId === data.contact.contactId);
        if (matchIdx > -1) {
          this.contacts[matchIdx].contact1 = data.contact.contact1;
          this.contacts[matchIdx].contact2 = data.contact.contact2;
          this.contacts[matchIdx].phoneNumber = data.contact.phoneNumber;
          this.contacts[matchIdx].lastMessageBody = data.contact.lastMessageBody;
          this.contacts = [...this.contacts];
        }
        if (this.selectedContact && (this.selectedContact.contactId === data.contact.contactId)) {
          this.selectedContact.contact1 = data.contact.contact1;
          this.selectedContact.contact2 = data.contact.contact2;
          this.selectedContact.phoneNumber = data.contact.phoneNumber;
          this.selectedContact.lastMessageBody = data.contact.lastMessageBody;
          this.selectedContact.notes = data.contact.notes;
          this.selectedContact.groups = data.contact.groups;
          this.oldNote = data.contact.notes || '';
        }
        this.updateAccountPhone();
        }
      break;
    }
  }

  checkNoteKeys(event: KeyboardEvent, contact: any) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      this.saveNote(contact);
      event.stopPropagation();
      event.preventDefault();
    }
  }

  saveNote(contact: any) {
    const data = {
      contact1: contact.contact1,
      contact2: contact.contact2,
      phoneNumber: contact.phoneNumber,
      groups: null,
      notes: contact.notes,
    };
    this.messagesService.updateContact(this.selectedAccountPhone.accountPhone, contact.phoneNumber, '', false, data).subscribe({
      next: (res) => {
        this.oldNote = res.notes || '';
      },
      error: (err) => {
        this.logger.log(err);
        this.snackbar.open(err.error || 'Unknown exception...');
      }
    })
  }

  updateSignature($event: KeyboardEvent) {
    $event.stopPropagation();
    if (this.signatureUpdateTimeout) {
      clearTimeout(this.signatureUpdateTimeout);
    }
    this.signatureUpdateTimeout = setTimeout(() => {
      // localStorage.setItem('userPref', JSON.stringify(this.userPref));
      if (this.userPref.signatureOn) {
        this.toggleSignature();
        setTimeout(() => {
          this.userPref.signature = this.signatureCopy;
          this.toggleSignature();
          this.saveUserData();
        }, 0);
      } else {
        this.userPref.signature = this.signatureCopy;
        this.saveUserData();
      }
      this.charCount(this.outGoingMsg.message);
    }, 2000);
  }

  signatureOpened() {
    this.signatureCopy = this.userPref.signature;
    
  }

  shakeElement(ele: HTMLElement) {
    if (ele.classList.contains('shakeit')) {
      ele.classList.remove('shakeit');
    }
    setTimeout(() => {
      ele.classList.add('shakeit');
    }, 0);
  }

  openPendingNotifications() {
    const pendingRef = this.dialog.open(NotificationPanelComponent, {
      data: { 
        title: 'Notifications', 
        notifications: this.otherNotifications,
        selectedAccountPhone: this.selectedAccountPhone,
        selectedContact: this.selectedContact,
        accountPhones: this.accountPhones
      },
      minHeight: '70vh',
      minWidth: '70vw',
      closeOnNavigation: true
    });
    pendingRef.afterClosed().subscribe(result => {
      if (result) {
        if (result.action === 'viewConversation') {
          // change account selection.
          this.selectedAccountPhone = {
            accountPhone: result.notification.message.accountPhone,
            accountPhoneId: result.notification.message.accountPhoneId
          };
          this.openMessageFromNotification(result.notification, result.position);
        }
      }
    })
  }

  subscribeToNotifications() {
    this.subs.push(
      this.notificationService.newMessageReceived().subscribe({
        next: (res) => {
          this.logger.log('new message', res);
          this.handleNotification('newMessage', res);
        },
        error: (err) => {
          this.logger.log(err);
        }
      })
    );
    this.subs.push(
      this.notificationService.messageRead().subscribe({
        next: (res) => {
          this.logger.log('messageRead', res);
          this.updateAccountPhone();
          this.handleNotification('messageStatus', res);
        }, 
        error: (err) => {
          this.logger.log(err);
        }
      })
    );
    this.subs.push(
      this.notificationService.contactRead().subscribe({
        next: (res) => {
          this.logger.log('contactRead', res);
          this.handleNotification('contactRead', res);
        }, 
        error: (err) => {
          this.logger.log(err);
        }
      })
    );
    this.subs.push(
      this.notificationService.messageStatus().subscribe({
        next: (res) => {
          this.logger.log('messageStatus', res);
          this.handleNotification('messageStatus', res);
        }, 
        error: (err) => {
          this.logger.log(err);
        }
      })
    );
    this.subs.push(
      this.notificationService.messageViewed().subscribe({
        next: (res) => {
          // this.logger.log('Active message view', res);
          this.handleNotification('messageView', res);
        }, 
        error: (err) => {
          this.logger.log(err);
        }
      })
    );
    this.subs.push(
      this.notificationService.messageTyping().subscribe({
        next: (res) => {
          // this.logger.log('messagetyping', res);
          this.handleNotification('messageType', res);
        },
        error: (err) => {
          this.logger.log(err);
        }
      })
    );
    this.subs.push(
      this.notificationService.MessageStopView().subscribe({
        next: (res) => {
          this.handleNotification('messageStopView', res);
        }, 
        error: (err) => {
          this.logger.log(err);
        }
      })
    );
    this.subs.push(
      this.notificationService.MessageStopType().subscribe({
        next: (res) => {
          this.handleNotification('messageStopType', res);
        }, 
        error: (err) => {
          this.logger.log(err);
        }
      })
    );
    this.subs.push(
      this.notificationService.MessageDelete().subscribe({
        next: (res) => {
          this.logger.log('messageDelete', res);
          this.handleNotification('messageDelete', res);
        }, 
        error: (err) => {
          this.logger.log(err);
        }
      })
    );
    this.subs.push(
      this.notificationService.contactDeleted().subscribe({
        next: (res) => {
          this.logger.log('contactDeleted', res);
          this.handleNotification('contactDeleted', res);
        }, 
        error: (err) => {
          this.logger.log(err);
        }
      })
    );
    this.subs.push(
      this.notificationService.contactEdit().subscribe({
        next: (res) => {
          this.logger.log('contactEdit', res);
          this.handleNotification('contactEdit', res);
        },
        error: (err) => {
          this.logger.log(err);
        }
      })
    );
    this.subs.push(
      this.notificationService.contactTagged().subscribe({
        next: (res: any) => {
          this.logger.log('contactTagged', res);
          if (res.sender === this.selectedAccountPhone.accountPhone) {
            const matchIdx = this.contacts.findIndex(eachContcat => eachContcat.contactId === res.contact.contactId);
            if (matchIdx > -1) {
              this.contacts[matchIdx].tags = res.contact.tags;
            }
          }
        }, 
        error: (err) => {
          this.logger.log(err);
        }
      })
    );
    this.subs.push(
      this.notificationService.contactUnTagged().subscribe({
        next: (res: any) => {
          this.logger.log('contactUnTagged', res);
          if (res.sender === this.selectedAccountPhone.accountPhone) {
            const matchIdx = this.contacts.findIndex(eachContcat => eachContcat.contactId === res.contact.contactId);
            if (matchIdx > -1) {
              this.contacts[matchIdx].tags = res.contact.tags;
            }
          }
        }, 
        error: (err) => {
          this.logger.log(err);
        }
      })
    );
    this.subs.push(
      this.notificationService.tagAdded().subscribe({
        next: (res: any) => {
          this.logger.log('TagAdded', res);
          if (res.sender === this.selectedAccountPhone.accountPhone) {
            if (!this.tags.includes(res.message)) {
              this.tags.push(res.message);
            }
          }
        }, 
        error: (err) => {
          this.logger.log(err);
        }
      })
    );
    this.subs.push(
      this.notificationService.tagDeleted().subscribe({
        next: (res: any) => {
          this.logger.log('TagDeleted', res);
          if (res.sender === this.selectedAccountPhone.accountPhone) {
            const matchIdx = this.tags.findIndex(eachTag => eachTag === res.message);
            if (matchIdx > -1) {
              this.tags.splice(matchIdx, 1);
            }
            for (const contact of this.contacts) {
              if (contact.tags) {
                const tags = contact.tags.split(' ');
                if (tags && tags.length) {
                  const matchIdx = tags.findIndex((eachTag: any) => eachTag === res.message);
                  if (matchIdx > -1) {
                    tags.splice(matchIdx, 1);
                    contact.tags = tags.join(' ');
                  }
                }
              }
            }
          }
        }, 
        error: (err) => {
          this.logger.log(err);
        }
      })
    );

  }

  openMessageFromNotification(notification: any, positon: any) {
    this.selectedContact = '';
    this.messages = [];
    this.contacts = [];
    this.userPref.accountPhone = this.selectedAccountPhone;
    localStorage.setItem('userPref', JSON.stringify(this.userPref));
    
    this.loadingContacts = true;
    this.page.start = 0;
    this.messagesService.getContacts(this.selectedAccountPhone.accountPhone, this.page).subscribe({
      next: (res) => {
        this.contacts = [...this.contacts, ...res];
        this.loadingContacts = false;
        // find the notification contact
        const match = this.contacts.find(eachContact => eachContact.contactId === notification.contact.contactId);
        if (match) {
          this.selectedContact = match;
        } else {
          this.contacts.unshift(notification.contact);
          this.selectedContact = notification.contact;
        }
        this.viewConversation(notification.message, positon);
      }, 
      error: (err) => {
        this.logger.log(err);
        this.loadingContacts = false;
      }
    })
  }

  openImage(message: any, i?: number) {
    const imgRef = this.dialog.open(ImageViewerComponent, {
      data: { 
        title: 'Image viewer',
        message,
        imageIndx: i
      },
      minWidth: '100vw',
      minHeight: '100vh',
      height : 'auto',
      
    });
    imgRef.afterClosed().subscribe(result => {

    })
  }

  openDraftMessages() {
    const draftRef = this.dialog.open(DraftMessagesComponent, {
      data: { 
        title: 'Scheduled Messages',
        accountPhone: this.selectedAccountPhone
      },
      width: '100%',
      minHeight: 'calc(100vh - 90px)',
      height : 'auto',
      closeOnNavigation: true
    });
    draftRef.afterClosed().subscribe(result => {
      if(result) {
        this.openScheduleNewMsg(result);
      }
    });
  }

  openScheduleNewMsg(draft: any) {
    this.newMessage();
    this.composeList = [];
    setTimeout(() => {
      for (const phone of draft.phoneNumbers) {
        this.composeList.push(phone);
      }
      if (draft.groups && draft.groups.length) {
        for (const group of draft.groups) {
          this.composeList.push(group);
        }
      }
      this.outGoingMsg.message = draft.messageBody;
      this.outGoingMsg.scheduleDt = draft.scheduledDate || draft.scheduleDt;
      this.outGoingMsg.groupGuid = draft.groupGuid;
    }, 0);
  }

  activateIndicator(event: KeyboardEvent) {
    // send typing notification.
    if (!this.userTyping) {
      this.notificationService.sendMessageTyping(this.selectedAccountPhone.accountPhone, this.loggedInUser.userName, this.selectedContact.phoneNumber);
    }
    this.userTyping = true;
    this.idleCheck();
  }

  checkSend(event: KeyboardEvent) {
    if (this.userPref.enterIsSend) {
      if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey) {
        event.stopPropagation();
        event.preventDefault();
        this.prepMessage();
      } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        const input = document.getElementById('msgBox') as HTMLElement;
        const pos = position(input);
        this.outGoingMsg.message = this.outGoingMsg.message.slice(0, pos.pos) + '\n' + this.outGoingMsg.message.slice(pos.pos);
        setTimeout(() => {
          position(input, pos.pos + 1);
        }, 0);
      }
    } else {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.stopPropagation();
        event.preventDefault();
        this.prepMessage();
      }
    }
  }

  idleCheck() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    this.idleTimer = window.setTimeout(() => {
      this.userTyping = false;
      if (this.selectedContact && this.selectedAccountPhone) {
        this.notificationService.sendStopMessageTyping(this.selectedAccountPhone.accountPhone, this.loggedInUser.userName, this.selectedContact.phoneNumber);
      }
    }, 5000);
  }

  isStillActive(time: number) {
    const currentTime = new Date().getTime();
    const future = new Date(time).getTime() + (10 * 1000);
    return currentTime < future;
  }

  displayAsScheduled(message: any) {
    // return message.direction !== 'in' && message.scheduleDt && message.transmissionState === 'not sent';
    return message.direction !== 'in' && message.scheduleDt;
  }

  prepUsers(userList: any) {
    const finalUsers = [];
    for (const user of userList) {
      if (this.isStillActive(user.time)) {
        finalUsers.push(user);
      }
    }
    return finalUsers;
  }

  maintenance() {
    for (const contact of this.contacts) {
      if (contact.activeUsers && contact.activeUsers.length) {
        // this.logger.log(contact.activeUsers);
        contact.activeUsers = [...this.prepUsers(contact.activeUsers)];
        // this.logger.log(contact.activeUsers);
      }
      if (contact.typingUsers && contact.typingUsers.length) {
        contact.typingUsers = [...this.prepUsers(contact.typingUsers)];
      }
    }
    this.updateBadge();
  }
  
  updateBadge() {
    if ("setAppBadge" in navigator && "clearAppBadge" in navigator) {
      if (this.selectedAccountPhone && this.selectedAccountPhone.unreadMessages) {
        // update the 
        (navigator as any).setAppBadge(this.selectedAccountPhone.unreadMessages).catch((error: any) => {
          //Do something with the error.
          this.logger.log(error);
        });
      } else {
        (navigator as any).clearAppBadge().catch((error: any) => {
          // Do something with the error.
          this.logger.log(error);
        });
      }
    }
  }

  reportUserStatus() {
    // current 
    if (this.selectedContact && this.selectedContact.phoneNumber) {
      this.notificationService.sendMessageView(this.selectedAccountPhone.accountPhone, this.loggedInUser.userName, this.selectedContact.phoneNumber);
    }
    if (this.userTyping && this.selectedContact && this.selectedContact.phoneNumber) {
      this.notificationService.sendMessageTyping(this.selectedAccountPhone.accountPhone, this.loggedInUser.userName, this.selectedContact.phoneNumber);
    }
  }

  changeTitle() {
    if (this.isTabInBackground) {
      if (this.selectedAccountPhone.unreadMessages) {
        if (this.titleMessage === `${this.selectedAccountPhone.unreadMessages} Unread messages`) {
          this.titleMessage = environment.appName;
        } else {
          this.titleMessage = `${this.selectedAccountPhone.unreadMessages} Unread messages`;
        }
      } else {
        this.titleMessage = environment.appName;
      }
      this.titleService.setTitle(this.titleMessage);
    }
  }

  isValidphoneNumber(phone: string) {
    phone = phone.toString().replace(/[^0-9]/g, '');
    if (phone.length === 11 && phone[0] === '1') {
      phone = phone.slice(1);
    }
    if (phone.length !== 10 || !/^(?:[2-9]\d{2}?|[2-9]\d{2})[2-9]\d{2}?\d{4}$/.test(phone)) {
      return false;
    }
    return true;
  }

  openAccountPhoneDialog() {
    const accDialogRef = this.dialog.open(AccountPhoneDialogComponent, {
      data: { 
        title: 'Account phone',
        totalUnread: this.totalUnread
      },
      minWidth: '70vw',
      closeOnNavigation: true
    });
    accDialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.selectedAccountPhone = result;
        this.page = {
          start: 0,
          limit: 30,
          search: '',
          sort: 'lastActivity',
          sortDirection: 'desc',
          filter: '',
          showTagged: true,
          showUntagged: true,
          tagFilter: '',
          // customTag: [],
          selectedTags: []
        };
        this.contactSearch.setValue('', {emitEvent: false});
        this.accPhoneChanged();
      }
    })
  }

  // templates
  getSavedTemplates() {
    this.templates = [];
    this.filteredTemplates = [];
    this.messagesService.getTemplates(this.selectedAccountPhone.accountId, this.selectedAccountPhone.accountPhone).subscribe({
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
    const input = document.getElementById('msgBox') as HTMLElement;
    const pos = position(input);
    this.previousTextPosition = pos;
  }

  templateSelected(template: any) {
    if (!template || ! template.templateText) {
      return;
    }
    this.insertText(template.templateText);
  }

  toggleEmojiLIst(event: any) {
    event.stopPropagation();
    this.showEmojiList = !this.showEmojiList;
  }

  backgroundImageFn(set: string, sheetSize: number) {
    return "assets/img/emoji_sheet_32.png";
  };

  addEmoji(event: any) {
    const input = document.getElementById('msgBox') as HTMLElement;
    const pos = position(input);
    this.previousTextPosition = pos;
    this.insertText(event.emoji.native);
  }

  insertText(text: string) {
    let newPos = text.length;
    if (this.previousTextPosition && this.previousTextPosition.pos) {
      this.outGoingMsg.message = this.outGoingMsg.message.slice(0, this.previousTextPosition.pos) + text + this.outGoingMsg.message.slice(this.previousTextPosition.pos);
      newPos = this.previousTextPosition.pos + text.length;
    } else {
      this.outGoingMsg.message = text + this.outGoingMsg.message;
      newPos = text.length;
    }
    const input = document.getElementById('msgBox') as HTMLElement;
    setTimeout(() => {
      input.focus();
      position(input, newPos);
      this.charCount(this.outGoingMsg.message);
    }, 100);
  }

  downloadConversation() {
    if (!this.printOptions.frmDt || !this.printOptions.toDt || !this.printOptions.saveType) {
      this.snackbar.open('Invalid options');
      return;
    }
    // get only the selected date
    const options = {
      frmDt: this.dateString(this.printOptions.startDate),
      toDt: this.dateString(this.printOptions.endDate),
      saveType: this.printOptions.saveType
    }
    this.messagesService.downloadConversation(this.selectedAccountPhone.accountPhone, this.selectedContact.phoneNumber, options).subscribe({
      next: (res) => {
        const filename = `${this.selectedContact.phoneNumber}.${this.printOptions.saveType}`;
        this.saveData(res, filename);
      },
      error: (err) => {
        this.logger.log(err);
      }
    })
  }

  displayDates() {
    setTimeout(() => {
      this.printOptions.startDate = this.dateString(this.printOptions.frmDt);
      this.printOptions.endDate = this.dateString(this.printOptions.toDt);
    }, 0);
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

  dateString(date: Date | string): string {
    if (!date) {
      return '';
    }
    const dt = new Date(date);
    const dtString = `${dt.getMonth()+1}/${dt.getDate()}/${dt.getFullYear()}`
    return dtString;
  }

  disableSend(): boolean {
    if (!this.selectedAccountPhone.canReply || (!this.composedMessage.attachments.length && !this.composedMessage.urls.length)) {
      if (this.userPref.signatureOn && this.outGoingMsg.message && this.outGoingMsg.message) {
        // check if only signature is present and disable send
        return (this.outGoingMsg.message.trim() === this.userPref.signature.trim()) || (this.msgLmits.cnt > 600);
      } else if (this.msgLmits.cnt > 600) {
        return true;
      } else if (!this.outGoingMsg.message) {
        return true;
      } else {
        return false;
      }
    } else if (this.msgLmits.cnt > 600) {
      return true;
    }
    return false;
  }

  setResizeHandle() {
    const contactsEle = document.getElementsByClassName('contacts');
    if (contactsEle && contactsEle.length) {
      const ele = contactsEle[0] as HTMLDivElement;
      const setPosition = ele.offsetWidth;
      const handleEle = document.getElementById('resizeHandle') as HTMLDivElement;
      if (handleEle) {
        handleEle.style.left = `${setPosition}px`;
      }
    }
  }

  setContactDivWidth() {
    const previousWidth = localStorage.getItem('contactDivWidth');
    if (!previousWidth) {
      this.setResizeHandle();
      return;
    }
    const contactsDiv = document.getElementsByClassName('contacts');
    if (contactsDiv && contactsDiv.length) {
      const ele = contactsDiv[0] as HTMLDivElement;
      ele.style.width = previousWidth;
    }
    this.setResizeHandle();
  }

  contactDivResized(event: ResizeEvent) {
    const contactsDiv = document.getElementsByClassName('contacts');
    if (contactsDiv && contactsDiv.length) {
      const ele = contactsDiv[0] as HTMLDivElement;
      // check to make sure the width is not out of boundaries
      // should be min 30% and max of 40%
      const divRatio = event.rectangle.width! / window.innerWidth;
      let width = event.rectangle.width;
      if (divRatio < 0.21) {
        // make a min width number
        width = 0.21 * window.innerWidth;
      } else if (divRatio > 0.40) {
        // make a max width number
        width = 0.40 * window.innerWidth;
      }
      ele.style.width = `${width}px`;
      localStorage.setItem('contactDivWidth', ele.style.width.toString());
      setTimeout(() => {
        this.setResizeHandle();
      }, 10);
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
    } else if (this.composedMessage.urls.length || this.composedMessage.attachments.length) {
      details.msg = 'This MMS will use 4 message credits';
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

  toggleDetailsPane() {
    this.showDetaislpanel = !this.showDetaislpanel;
    localStorage.setItem('detailsPanePref', this.showDetaislpanel.toString());
  }

  isMultiActive(set?: boolean): boolean {
    const isAllowed = this.selectedAccountPhone && this.selectedAccountPhone.providerId !== 2;
    if (!set) {
      return isAllowed;
    }
    const ele = document.getElementById('fileSelector') as HTMLElement;
    if (ele) {
      if (isAllowed) {
        ele.setAttribute('multiple', 'multiple');
      } else {
        ele.removeAttribute('multiple');
      }
    }
    return isAllowed;
  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
    if (this.messageScrolledSub) {
      this.messageScrolledSub.unsubscribe();
    }
    if (this.contactScrolledSub) {
      this.contactScrolledSub.unsubscribe();
    }
    this.subs.forEach((eachSub: Subscription) => {
      if (eachSub) {
        eachSub.unsubscribe();
      }
    });
    if (this.maintenanceTimer) {
      clearInterval(this.maintenanceTimer);
    }
    if (this.reportStatusTimer) {
      clearInterval(this.reportStatusTimer);
    }
    if (this.titleTimer) {
      clearInterval(this.titleTimer);
    }
  }

}
