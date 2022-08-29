import { Component, ViewChild } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable, Subject } from 'rxjs';
import { map, shareReplay, takeUntil } from 'rxjs/operators';
import { MatSidenav } from '@angular/material/sidenav';
import { SidenavService } from './sidenav.service';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../auth/auth.service';
// import { NotificationService } from '../notification.service';
import { DraftMessagesComponent } from '../draft-messages/draft-messages.component';
import { MatDialog } from '@angular/material/dialog';
import { SettingsComponent } from '../settings/settings.component';
import { AdminSettingsComponent } from '../admin-settings/admin-settings.component';
import { ProfileComponent } from '../profile/profile.component';
import { environment } from 'src/environments/environment';
import { UpdateService } from '../update.service';
import { LoggerService } from '../logger.service';

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss']
})
export class SidenavComponent {
  @ViewChild('drawer') public sidenav!: MatSidenav;
  isExpanded = false;
  activeMenuClass = 'lightMenuActive';
  loggedInUser: any;
  selectedAccountPhone: any;
  mobile = false;
  appName = environment.appName;
  private destroy$ = new Subject<void>();

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

  constructor(
    private breakpointObserver: BreakpointObserver,
    private sidenavService: SidenavService,
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog,
    private updateService: UpdateService,
    private logger: LoggerService
    // private notificationService: NotificationService
  ) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.checkUser();
      }
    });
    // this.isHandset$.pipe(
    //   takeUntil(this.destroy$)
    // ).subscribe({
    //   next: (result) => {
    //     this.mobile = result;
    //     if (result) {
    //       setTimeout(() => {
    //         this.sidenav.close()
    //       }, 0);
    //     } else {
    //       setTimeout(() => {
    //         this.shrinkNav();
    //       }, 0);
    //     }
    //   }
    // })
  }

  ngOnInit() {
    this.sidenavService.shrinkSideNav$.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => this.shrinkNav()
    })
    this.sidenavService.toggleSideNav$.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => this.toggleSideNav()
    })
    this.checkUser();
    this.authService.authChanged$.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (userName: string) => {
        this.checkUser();
      }
    })
  }

  expandSideNav(drawer: any) {
    if (this.isExpanded) {
      this.isExpanded = false;
      drawer._elementRef.nativeElement.style.minWidth = 'unset';
    } else {
      this.isExpanded = true;
      drawer._elementRef.nativeElement.style.minWidth = '14rem';
    }
  }

  toggleSideNav() {
    this.isExpanded = true;
    this.sidenav.toggle();
  }

  checkUser() {
    try {
      const user = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
      if (user && user.userName) {
        // user logged in 
        this.loggedInUser = user;
        this.loggedInUser.userName = this.loggedInUser.userName.trim();
      }
    } catch (error) {
      this.loggedInUser = null;
    }
  }

  shrinkNav() {
    if (window.innerWidth > 500) {
      const ele = document.getElementById('drawer');
      if (ele) {
        ele.style.minWidth = 'unset';
      }
      this.sidenav.open();
      setTimeout(() => {
        this.isExpanded = false;
      }, 0);
    } else {
      this.sidenav.close();
      setTimeout(() => {
        this.isExpanded = false;
      }, 0);
    }
  }

  manageProfile() {
    // get the profile data
    this.sidenavService.getUserData().subscribe({
      next: (res) => {
        // open profile dialog
        this.openProfile(res);
      },
      error: (err) => {
        this.logger.log(err);
      }
    })
  }

  openProfile(userData: any) {
    const profileRef = this.dialog.open(ProfileComponent, {
      data: {
        title: 'Update Profile',
        user: userData
      },
      closeOnNavigation: true,
      minWidth: '40%',
      disableClose: true
    });
    // profileRef.afterClosed().subscribe(result => {
    //   if (result) {
    //     this.snackbar.open('User created');
    //   }
    // })
  }

  logout() {
    this.authService.logout().subscribe({
      next: (res) => {
        this.router.navigateByUrl('/auth');
      },
      error: (err) => {
        this.logger.log(err);
      }
    })
  }

  openScheduledDrafts() {
    try {
      const userPref = JSON.parse(localStorage.getItem('userPref') || '{}');
      if (userPref && userPref.accountPhone) {
        this.selectedAccountPhone = userPref.accountPhone;
      }
    } catch (error) {
      
    }
    if (this.selectedAccountPhone.accountPhone) {
      const draftRef = this.dialog.open(DraftMessagesComponent, {
        data: {
          title: 'Scheduled Messages',
          accountPhone: this.selectedAccountPhone
        },
        width: '100%',
        minHeight: 'calc(100vh - 90px)',
        height : 'auto'
      });
      draftRef.afterClosed().subscribe(result => {
        if(result) {
          this.router.navigate(
            ['/messages'],
            {
              queryParams: {editMessage: result.messageId, phoneNumber: result.messageContactPhone}
            })
        }
      });
    }
  }

  openSettings() {
    const screenWidth = window.innerWidth;
    let prop: any = {
      data: {
        title: 'User Preferences',
        accountPhone: this.selectedAccountPhone
      },
      width: '100%',
      maxWidth: '50vw',
      minHeight: 'calc(100vh - 90px)',
      height : 'auto',
      closeOnNavigation: true,
      disableClose: true
    };
    if (screenWidth < 500) {
      prop = {
        data: {
          title: 'User Preferences',
          accountPhone: this.selectedAccountPhone
        },
        width: '100vw',
        maxWidth: '100vw',
        minHeight: 'calc(100vh - 90px)',
        height : 'auto',
        closeOnNavigation: true,
        disableClose: true
      }
    }
    const settingsRef = this.dialog.open(SettingsComponent, prop);
  }

  openAdminSettings() {
    const settingsRef = this.dialog.open(AdminSettingsComponent, {
      data: {
        title: 'Admin',
      },
      width: '100%',
      minHeight: 'calc(100vh - 90px)',
      height : 'auto',
      closeOnNavigation: true,
      // disableClose: true
    });
  }

  ngAfterViewInit() {
    this.sidenavService.setsidenav(this.sidenav);
    setTimeout(() => {
      this.authService.attendance(true);
    }, 1000);
  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }

}
