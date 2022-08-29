import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { LoggerService } from '../logger.service';
import { SidenavService } from '../sidenav/sidenav.service';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss']
})
export class AuthComponent implements OnInit {

  reqInprogress = false;
  askCode = false;
  user = {
    userName: '',
    password: '',
    twoFactorCode: '',
    newPassword: '',
    reNewPassword: '',
    resetCode: '',
    stayLoggedIn: false
  }
  hideLoginForm = false;
  hideForgotPass = true;
  hideResetForm = true;

  constructor(
    private sidenavService: SidenavService,
    private authService: AuthService,
    private snackbar: MatSnackBar,
    private router: Router,
    private logger: LoggerService
  ) { }

  ngOnInit(): void {
    this.sidenavService.close();
    this.checkLogin();
  }

  checkLogin() {
    if (this.authService.isAuthenticated()) {
      this.router.navigateByUrl('/messages');
    }
  }

  signIn(user: any) {
    if (!user || !user.userName || !user.password) {
      this.snackbar.open('Email and password are required');
      return;
    }
    this.reqInprogress = true;
    this.authService.login(user).subscribe({
      next: (res) => {
        this.reqInprogress = false;
        this.router.navigateByUrl('/messages');
      },
      error: (err) => {
        this.logger.log(err);
        this.reqInprogress = false;
        if(err.error === 'Two factor auth needed') {
          this.askCode = true;
          return;
        };
        this.snackbar.open(err.error || 'Login failed');
      }
    })
  }

  // forgot password

  showForgotPass() {
    this.hideForgotPass = false;
    this.hideLoginForm = true;
    this.hideResetForm = true;
  }

  showLoginForm() {
    this.hideForgotPass = true;
    this.hideLoginForm = false;
    this.hideResetForm = true;
  }

  requestResetCode(user: any) {
    if (!user || !user.userName) {
      this.snackbar.open('Email is required');
      return;
    }
    this.reqInprogress = true;
    const data = {
      userName: user.userName,
      password: '',
      twoFactorCode: ''
    }
    this.authService.resetPassword(data).subscribe({
      next: (res) => {
        this.reqInprogress = false;
        this.hideForgotPass = true;
        this.hideLoginForm = true;
        this.hideResetForm = false;
      },
      error: (err) => {
        this.logger.log(err);
        this.reqInprogress = false;
        this.snackbar.open(err.error || 'Login failed');
      }
    })
  }

  resetPassword(user: any) {
    if (!user || !user.resetCode || !user.newPassword || !user.reNewPassword) {
      this.snackbar.open('Code and Password are required');
      return;
    }
    if (user.newPassword !== user.reNewPassword) {
      this.snackbar.open('Passwords did not match');
      return;
    }
    this.reqInprogress = true;
    const data = {
      userName: user.userName,
      password: user.newPassword,
      twoFactorCode: user.resetCode,
    }
    this.authService.resetPassword(data).subscribe({
      next: (res) => {
        this.hideLoginForm = false;
        this.hideForgotPass = true;
        this.hideResetForm = true;
        this.reqInprogress = false;
        this.snackbar.open('Password updated successfully. Please login with your new password');
      },
      error: (err) => {
        this.logger.log(err);
        this.reqInprogress = false;
        this.snackbar.open(err.error || 'Unknown Exception');
      }
    })
  }


}
