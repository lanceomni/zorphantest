import { Component, HostListener, Inject, OnInit, ViewChild } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MessagesService } from '../messages/messages.service';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ProfileComponent } from '../profile/profile.component';
import { MatStepper } from '@angular/material/stepper';
import { LoggerService } from '../logger.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-admin-settings',
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.scss']
})
export class AdminSettingsComponent implements OnInit {
  @ViewChild('stepper') private stepper!: MatStepper;

  accountFormGroup!: FormGroup;
  accountPhones: any = [];
  globalUsers: any = [];
  accountUsers: any = [];
  providers: any = [];
  accountStepComplete = false;
  phoneStepComplete = false;
  userStepComplete = false;
  selectedUser: any = undefined;
  lookupEmail = '';
  oldAccName = '';
  timeZones: any = [];

  constructor(
    public dialogRef: MatDialogRef<AdminSettingsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private messagesService: MessagesService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private logger: LoggerService,
    
  ) { }

  ngOnInit(): void {
    this.oldAccName = this.data.account? this.data.account.accountName : '';
    this.accountFormGroup = this.fb.group({
      accountName: [this.data.account? this.data.account.accountName : '', Validators.required],
    });
    if (this.data.account) {
      this.accountStepComplete = true;
      // get accountPhone
      this.getAccountPhones(this.data.account.id);
      // get account users.
      this.getAccountUsers(this.data.account.id);
      // get account settings if any
    }
    // get global users
    // this.getAllUsers();
    this.getProviders();
    this.getTimeZoneNames();
  }

  getAllUsers() {
    this.messagesService.getAllUsers().subscribe({
      next: (res) => {
        this.globalUsers = res;
      },
      error: (err) => {
        this.logger.log(err);
      }
    })
  }

  getProviders() {
    this.messagesService.getProviders().subscribe({
      next: (res) => {
        this.providers = res;
      },
      error: (err) => {
        this.logger.log(err);
      }
    })
  }

  getProviderNames(id: number): string {
    if (!this.providers || !this.providers.length) {
      return '';
    }
    const match = this.providers.find((eachProvider: any) => eachProvider.id === id);
    if (match) {
      return match.providerName;
    } else {
      return '';
    }
  }

  getAccountUsers(accountId: string) {
    this.messagesService.getAccountUsers(accountId).subscribe({
      next: (res) => {
        for (const eachRes of res) {
          eachRes.oldVal = JSON.stringify(eachRes);
        }
        this.accountUsers = res;
        this.userStepComplete = true;
      },
      error : (err) => {
        this.logger.log(err);
      }
    })
  }

  getAccountPhones(accountId: string) {
    this.messagesService.getAccountPhone(accountId).subscribe({
      next: (res) => {
        this.accountPhones = res;
        if (res && res.length) {
          this.phoneStepComplete = true;
        }
      },
      error: (err) => {
        this.logger.log(err);
      }
    })
  }

  addNewAccountPhone() {
    this.accountPhones.unshift({
      accountPhone: '',
      edit: true,
      oldAccountPhone: ''
    });
  }

  editPhone(phone: any) {
    phone.original = JSON.stringify(phone);
    // phone.oldAccountPhone = `${phone.accountPhone}`;
    // phone.oldProviderId = phone.providerId.valueOf();
    // read credentialjson and produce result
    try {
      const credentials = JSON.parse(phone.credentialsJson);
      const fields = this.getRequiredfields(phone.providerId);
      for (const field of fields) {
        phone[phone.providerId + field] = credentials[field];
      }
    } catch (error) {
      this.logger.log(error);
      this.snackBar.open('Failed to parse saved credentials');
    }
    phone.edit = true;
  }

  revertPhone(phone: any, idx: number) {
    if (!phone.original) {
      // just remove from the list
      this.accountPhones.splice(idx, 1);
      return;
    }
    // phone.accountPhone = `${phone.oldAccountPhone}`;
    // phone.providerId = phone.oldProviderId.valueOf();
    const original = JSON.parse(phone.original);
    for (const key in original) {
      if (Object.prototype.hasOwnProperty.call(original, key)) {
        phone[key] = original[key];
      }
    }
    phone.original = '';
    phone.edit = false;
  }

  getTimeZoneNames() {
    this.messagesService.getTimeZones().subscribe({
      next: (res) => {
        this.timeZones = res;
      },
      error: (err) => {
        this.logger.log(err);
      }
    })
  }

  saveAccountPhone(phone: any) {
    // validate phone before save
    const phoneNumber = this.isValidphoneNumber(phone.accountPhone);
    if (!phoneNumber) {
      this.snackBar.open('Invalid Phone Number');
      return;
    }
    if (phone.optInRequired && (!phone.optInMessage || !phone.optInResponse || !phone.optInMessage.trim() || !phone.optInResponse.trim())) {
      this.snackBar.open('Opt In Message and Response are required');
      return;
    }
    // prep credentialsjson
    const fields = this.getRequiredfields(phone.providerId);
    const credentials: any = {};
    let valid = true;
    for (const field of fields) {
      if (phone[phone.providerId + field]) {
        credentials[field] = phone[phone.providerId + field];
      } else {
        valid = false;
        break;
      }
    }
    if (!valid) {
      this.snackBar.open('All provider details are required');
      return;
    }
    phone.accountPhone = phoneNumber;
    phone.credentialsJson = JSON.stringify(credentials);
    this.messagesService.addUpdateAccountPhone(this.data.account.id, phone).subscribe({
      next: (res) => {
        phone.edit = false;
        phone.friendlyName = res.friendlyName;
        phone.providerName = res.providerName;
        phone.oldAccountPhone = `${phone.accountPhone}`;
        this.phoneStepComplete = true;
        // move to next step
      },
      error: (err) => {
        this.logger.log(err);
        this.snackBar.open(err.error || 'Failed to add/update account phone..');
      }
    })
  }

  isValidphoneNumber(phone: string) {
    if (!phone) {
      return '';
    }
    phone = phone.toString().replace(/[^0-9]/g, '');
    if (!phone) {
      return '';
    }
    if (phone.length === 11 && phone[0] === '1') {
      phone = phone.slice(1);
    }
    if (phone.length !== 10 || !/^(?:[2-9]\d{2}?|[2-9]\d{2})[2-9]\d{2}?\d{4}$/.test(phone)) {
      return '';
    }
    return phone;
  }

  // users
  userSelected(event: any) {
    const newUser = event.value;
    // check if already present
    if (!newUser) {
      return;
    }
    const match = this.accountUsers.find(((eachUser: any) => eachUser.id === newUser.id));
    if (match) {
      this.snackBar.open('User already exists');
      return;
    }
    // addUser
    this.snackBar.open('Adding user...');
    newUser.userId = newUser.id;
    newUser.accountId = this.data.account.id;
    newUser.canManage = false;
    newUser.canRead = true;
    newUser.canSendNew = false;
    newUser.canReply = false;
    newUser.canSendMMS = false;
    newUser.canDeleteMessage = false;
    newUser.canDeleteConversation = false;
    newUser.canUpdateContact = false;
    newUser.canSendToGroup = false;
    this.messagesService.addUpdateUser(newUser).subscribe({
      next: (res) => {
        this.accountUsers.push(newUser);
        this.userStepComplete = true;
        this.selectedUser = undefined;
        this.snackBar.open('Done');
        // clear selection
      },
      error : (err) => {
        this.logger.log(err);
        this.selectedUser = undefined;
        this.snackBar.open(err.error || 'Failed to add user');
      }
    })
  }

  // globalUserSelected(event: any) {
  //   const match = this.globalUsers.find((globalUser: any) => globalUser.email === event.source.value);
  //   if (match) {
  //     this.userSelected({value: match});
  //   }
  // }

  updateAccountUser(user: any) {
    this.messagesService.addUpdateUser(user).subscribe({
      next: (res) => {
        user.oldVal = JSON.stringify(res);
        user.dirty = false;
      },
      error : (err) => {
        this.logger.log(err);
        this.snackBar.open(err.error || 'Failed to add user');
      }
    })
  }

  permissionUpdated(user: any) {
    if (!user.oldVal) {
      user.oldVal = JSON.stringify(user);
    }
    setTimeout(() => {
      const oldVal = JSON.parse(user.oldVal);
      let dirty = false;
      for (const key in user) {
        if (Object.prototype.hasOwnProperty.call(user, key)) {
          if (key !== 'dirty' && key !== 'oldVal' && user[key] !== oldVal[key]) {
            dirty = true;
            break;
          }
        }
      }
      user.dirty = dirty;
    }, 10);
  }

  removeAccountUser(user: any) {
    this.messagesService.removeAccountUser(user).subscribe({
      next: (res) => {
        const matchIdx = this.accountUsers.findIndex((eachUser: any) => eachUser.id === user.id);
        if (matchIdx > -1) {
          this.accountUsers.splice(matchIdx, 1);
        }
      },
      error: (err) => {
        this.logger.log(err);
        this.snackBar.open(err.error || 'Failed to remove user');
      }
    })
  }

  openUserProfile(user: any, cb: any) {
    const profileRef = this.dialog.open(ProfileComponent, {
      data: {
        title: 'Update User',
        user,
        isAdmin: this.data.isAdmin
      },
      closeOnNavigation: true,
      minWidth: '40%',
      disableClose: true
    });
    profileRef.afterClosed().subscribe(result => {
      if (result && cb) {
        cb(result);
      }
    })
  }

  getUserProfile(user: any) {
    if (!this.data.isAdmin) {
      return;
    }
    this.messagesService.getUserData(user.userId).subscribe({
      next: (res) => {
        this.openUserProfile(res, null);
      },
      error: (err) => {
        this.logger.log(err);
      }
    })
  }

  verifyUserEmail(email: string) {
    if (!email || !email.trim()) {
      this.snackBar.open('Invalid email');
      return;
    }
    const regExp = /^[a-z0-9][a-z0-9-_\.]+@([a-z]|[a-z0-9]?[a-z0-9-]+[a-z0-9])\.[a-z0-9]{2,10}(?:\.[a-z]{2,10})?$/;
    if (!regExp.test(email.toLowerCase().trim())) {
      this.snackBar.open('Invalid email');
      return;
    }
    // validate and make the request
    this.messagesService.getAllUsers(email.trim()).subscribe({
      next: (res) => {
        if (res && res.length) {
          // confirm to add..
          const confirmRef = this.dialog.open(ConfirmDialogComponent, {
            data: { title: 'Add User', message: `Existing user found with email "<b>${email}</b>". <br><br> <b>Add this user ?</b>` }
          });
          confirmRef.afterClosed().subscribe(result => {
            if (result) {
              this.userSelected({
                value: res[0]
              });
            }  
          })
        } else {
          // new user
          const confirmRef = this.dialog.open(ConfirmDialogComponent, {
            data: { title: 'Confirm', message: `No user found with email "<b>${email}</b>". <br><br> <b>Create a new user ?</b>` }
          });
          confirmRef.afterClosed().subscribe(result => {
            if (result) {
              this.openUserProfile({
                email: email.trim()
              }, (createdUser: any) => {
                this.userSelected({
                  value: createdUser
                });
              });
            }  
          })
        }
      },
      error: (err) => {
        this.logger.log(err);
      }
    })
  }

  openCreateUser() {
    const profileRef = this.dialog.open(ProfileComponent, {
      data: {
        title: 'Create User',
        user: {}
      },
      closeOnNavigation: true,
      minWidth: '40%',
      disableClose: true
    });
    profileRef.afterClosed().subscribe(result => {
      if (result) {
        this.globalUsers.push(result);
        // add this value to the account
        this.userSelected({value: result});
      }
    })
  }

  // account
  saveAccount(accountName: string) {
    if (!accountName || !accountName.trim()) {
      this.snackBar.open('Invalid Account Name');
      return;
    }
    accountName = accountName.trim();
    if (this.data.account && this.data.acco.id) {
      // update account
      const data = {
        accountName,
        id: this.data.account.id
      }
      this.messagesService.updateAccount(data).subscribe({
        next: (res) => {
          this.oldAccName = accountName;
          this.snackBar.open('Done');
        },
        error: (err) => {
          this.logger.log(err);
          this.snackBar.open(err.error || 'failed to update the account');
        }
      })
    } else {
      // create acocunt
      this.messagesService.createAccount(accountName).subscribe({
        next: (res) => {
          this.data.account = res;
          this.accountStepComplete = true;
          setTimeout(() => {
            this.stepper.next();
          }, 0);
        },
        error: (err) => {
          this.logger.log(err);
          this.snackBar.open(err.error || "Failed to create the account");
        }
      })
    }
  }

  // stepper
  nextStep(stepper: MatStepper) {
    if (stepper.selectedIndex === 0) {
      // check for accountId
      if (!this.accountStepComplete) {
        this.snackBar.open('Create an account to move forward');
        return;
      }
      stepper.next();
    } else if(stepper.selectedIndex === 1) {
      // check for valid accountphones.
        if (!this.phoneStepComplete) {
          this.snackBar.open('Add in a user to continue');
          return;
        }
        stepper.next();
    } else if(stepper.selectedIndex === 2) {
      // check for valid accountphones.
      if (!this.userStepComplete) {
        this.snackBar.open('Add in a user to continue');
        return;
      }
      stepper.next();
    }
  }

  getRequiredfields(providerId: string) {
    const match = this.providers.find((eachProvider: any) => eachProvider.id === providerId);
    if (match) {
      return match.requiredValues;
    }
    return [];
  }

  compareFn(c1: any, c2: any): boolean {
    return c1 && c2 ? c1.id === c2.id : c1 === c2;
  }

}
