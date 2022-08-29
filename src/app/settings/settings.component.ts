import { Component, HostListener, Inject, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
// import { Observable } from 'rxjs';
import { MessagesService } from '../messages/messages.service';
// import { SidenavService } from '../sidenav/sidenav.service';
// import { ComponentCanDeactivate } from '../auth/pending-changes.guard';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { environment } from 'src/environments/environment';
import { SwPush } from '@angular/service-worker';
import { Platform } from '@angular/cdk/platform';
import { LoggerService } from '../logger.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {

  userPref = {
    enterIsSend: true,
    signature: '',
    signatureOn: true,
    showLastMessage: true,
    twoFactorEnabled: false,
    hideTagFilter: false
  }
  userDataCopy: any = {
    enterIsSend: true,
    signature: '',
    signatureOn: true,
    showLastMessage: true,
    twoFactorEnabled: false,
    hideTagFilter: false
  }
  appName = environment.appName;
  unsavedChanges = false;
  readonly vapidPubKey = 'BI30ck8O9AZPVZiTiGOMksuONSLHkzOnKw7pz7zff_i51VcWIA5KcYSn1DJOMPzpv9TmLlkrGKmWjw_50Cd9Vek';
  notificationSupported: boolean = false;
  previousSubs: any = [];
  subPending: boolean = false;
  constructor(
    public dialogRef: MatDialogRef<SettingsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private messagesService: MessagesService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private swPush: SwPush,
    private platform: Platform,
    private logger: LoggerService
    // private sidenavService: SidenavService
  ) { }

  ngOnInit(): void {
    this.getUserSettings();
    this.getPreviousSubs();
    // this.sidenavService.shrinkSidenav();
  }

  // @HostListener('window:resize', ['$event'])
  // onResize(event: any) {
  //   this.pageResized();
  // }

  // @HostListener('window:beforeunload')
  // canDeactivate(): Observable<boolean> | boolean {
  //   return !this.unsavedChanges;
  // }

  // pageResized() {
  //   this.sidenavService.shrinkSidenav();
  // }

  getUserSettings() {
    this.messagesService.getUserData().subscribe({
      next: (res) => {
        this.userPref = res;
        this.userDataCopy = {...res};
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
        this.snackBar.open('Failed to get user data');
      }
    })
  }

  saveUserSettings() {
    this.messagesService.saveUserSettings(this.userPref).subscribe({
      next: (res) => {
        this.unsavedChanges = false;
        this.snackBar.open('Done');
        this.dialogRef.close();
        this.messagesService.settingsUpdateNotification(res);
        try {
          const localSettings = JSON.parse(localStorage.getItem('userPref') || '');
          if (localSettings) {
            if (this.userPref.hideTagFilter) {
              localSettings.hideTagFilter = true;
            } else {
              localSettings.hideTagFilter = false;
            }
            localStorage.setItem('userPref', JSON.stringify(localSettings));
          }
        } catch (error) {
          
        }
      }, 
      error: (err) => {
        this.logger.log(err);
        this.snackBar.open('Failed to update user settings');
      }
    })
  }

  textUpdate(key: string, val: string) {
    const previousVal = this.userDataCopy[key]
    if (previousVal !== val) {
      this.settingsUpdated();
    }
  }

  settingsUpdated() {
    this.unsavedChanges = true;
  }

  subscribe() {
    // ask for name of device 
    const confirmRef = this.dialog.open(ConfirmDialogComponent, {
      data: { 
        title: 'Device Description',
        inputName: `Description`,
        inputHint: `Helps you identify which device(s) have active notifications`,
        cancelLable: 'Cancel',
        successLabel: 'Save'
      }
    });
    confirmRef.afterClosed().subscribe((result: any) => {
      if (result) {
        if (result === false) {
          return;
        }
        let name = result.trim();
        if (!name) {
          this.snackBar.open('Please provide description to identify you subscriptions');
          return;
        }
        // add app and platform info to name
        // like appname - platform - browser - user given description
        let osName = '';
        let browser = '';
        if (this.platform.ANDROID) {
          osName = 'android';
        } else if (this.platform.IOS) {
          osName = 'ios';
        }
        if (this.platform.EDGE) {
          browser = 'edge';
        } else if (this.platform.BLINK) {
          browser = 'chrome';
        } else if (this.platform.SAFARI) {
          browser = 'safari';
        } else if (this.platform.FIREFOX) {
          browser = 'firefox';
        }
        name = `${environment.appName}-${osName} ${browser}-${name}`;
        this.subPending = true;
        this.swPush.requestSubscription({
          serverPublicKey: this.vapidPubKey
        })
          .then((sub) => {
            // store the sub to server.
            const subJsString = JSON.parse(JSON.stringify(sub));
            const data = {
              description: name,
              IsAPNS: false,
              details: {
                pushEndpoint: subJsString.endpoint,
                p256dh: subJsString.keys.p256dh,
                auth: subJsString.keys.auth
              }
            }
            this.messagesService.saveSub(data).subscribe({
              next: (res) => {
                this.subPending = false;
                this.getPreviousSubs();
                this.snackBar.open('Subscribed');
              },
              error: (err) => {
                this.logger.log(err);
                this.subPending = false;
              }
            })
          })
          .catch(err => {
            this.subPending = false;
            this.snackBar.open('Failed to subscribe');
            this.logger.log('sub error', err);
            // display message to user
          });
      }
    })
  }

  confirmUnSub(sub: any) {
    // confirm and unsubscribe
    const confirmRef = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Warning', message: `Remove subscription for "${sub.description}"` }
    });
    confirmRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.unsubscribe(sub);
      }
    })
  }

  unsubscribe(sub: any) {
    this.messagesService.removeSub(sub.id).subscribe({
      next: (res) => {
        // get all subs
        this.getPreviousSubs();
        this.snackBar.open('Unsubscribed');
      },
      error: (err) => {
        this.snackBar.open(err.message || 'Failed to remove subscription try again');
      }
    })
  }

  close() {
    if (this.unsavedChanges) {
      const confirmRef = this.dialog.open(ConfirmDialogComponent, {
        data: { title: 'Warning', message: 'unsaved changes will be lost, still close it?', showSave: true }
      });
      confirmRef.afterClosed().subscribe((result: any) => {
        if (result) {
          if (result === 'save') {
            this.saveUserSettings();
            return;
          }
          this.dialogRef.close();
        }
      })
    } else {
      this.dialogRef.close();
    }
  }

  getPreviousSubs() {
    this.messagesService.getSubs().subscribe({
      next: (res) => {
        this.previousSubs = res;
      },
      error: (err) => {
        this.logger.log(err);
      }
    })
  }

  checkPermission() {
    if ('Notification' in window) {
      // API supported
      this.notificationSupported = true;
    } else {
      // API not supported
      this.notificationSupported = true;
    }
  }

  ngAfterViewInit() {
    // check if user is already subscribed
    setTimeout(() => {
      this.checkPermission();
    }, 10);
  }

}
