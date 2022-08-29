import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged, Subject, switchMap, takeUntil } from 'rxjs';
import { AdminSettingsComponent } from '../admin-settings/admin-settings.component';
import { LoggerService } from '../logger.service';
import { MessagesService } from '../messages/messages.service';
import { ProfileComponent } from '../profile/profile.component';
import { SidenavService } from '../sidenav/sidenav.service';

@Component({
  selector: 'app-accounts',
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.scss']
})
export class AccountsComponent implements OnInit {
  accounts: any = [];
  // filteredAccounts: any = [];
  searchAccounts = new FormControl('');
  private destroy$ = new Subject<void>();
  isSmall$ = this.sidenavService.isSmall$;
  page = {
    search: ''
  }
  isAdmin = false;

  constructor(
    private sidenavService: SidenavService,
    private messagesService: MessagesService,
    private dialog: MatDialog,
    private snackbar: MatSnackBar,
    private logger: LoggerService
  ) { }

  ngOnInit(): void {
    this.sidenavService.shrinkSidenav();
    this.getUserData();
    this.getAccounts();
    this.searchAccounts.valueChanges
    .pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(text => this.messagesService.getAccounts(this.cleanText(text))),
      takeUntil(this.destroy$),
    ).subscribe(
      result => {
        this.accounts = result;
      }
    )
  }

  cleanText(text: string) {
    if (!text) {
      return text;
    }
    text = text.replace(/[\(\)-]/g, '').toLowerCase().trim();
    this.page.search = text;
    return text;
  }

  toggleSideNav($event: any) {
    this.sidenavService.toggle();
  }

  getAccounts() {
    this.messagesService.getAccounts(this.page.search).subscribe({
      next: (res) => {
        this.accounts = res;
        // this.filterAccounts(this.searchAccounts.value);
      },
      error: (err) => {
        this.logger.log(err);
      }
    })
  }

  getUserData() {
    this.messagesService.getUserData().subscribe({
      next: (res) => {
        if (res.isAdmin) {
          this.isAdmin = true;
        }
      },
      error: (err) => {
        this.isAdmin = false;
      }
    })
  }

  // filterAccounts(text: string) {
  //   if (!text) {
  //     this.filteredAccounts = this.accounts;
  //   }
  //   text = text.toLowerCase();
  //   this.filteredAccounts = this.accounts.filter((eachAccount: any) => eachAccount.accountName.toLowerCase().indexOf(text) > -1);
  // }

  openAccountDialoag(account?: any) {
    const settingsRef = this.dialog.open(AdminSettingsComponent, {
      data: {
        title: account? 'Edit Account' : 'New Account',
        account,
        isAdmin: this.isAdmin
      },
      width: '100%',
      minHeight: 'calc(100vh - 90px)',
      height: 'auto',
      closeOnNavigation: true,
      disableClose: true
    });
    settingsRef.afterClosed().subscribe((result: any) => {
      this.getAccounts();
    });
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
        this.snackbar.open('User created');
      }
    })
  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }

}
