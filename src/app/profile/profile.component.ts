import { Component, OnInit, Inject } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { AuthService } from '../auth/auth.service';
import { LoggerService } from '../logger.service';
import { MessagesService } from '../messages/messages.service';

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
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})

export class ProfileComponent implements OnInit {
  userFormGroup!: FormGroup;
  resetFormGroup!: FormGroup;
  timeZones: any = [];
  currentIndex = 0;
  showUpdatePassword = false;

  constructor(
    public dialogRef: MatDialogRef<ProfileComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder,
    private messagesService: MessagesService,
    private logger: LoggerService,
    private snackbar: MatSnackBar,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.getOwnDetails();
    this.getTimeZoneNames();
    this.userFormGroup = this.fb.group({
      firstName: [this.data.user.firstName || '', Validators.required],
      lastName: [this.data.user.lastName || '', Validators.required],
      email: [{value: this.data.user.email || '', disabled: true}, [Validators.required, Validators.email]],
      mobileNumber: [this.data.user.mobileNumber || '', [Validators.required, ValidatePhone]],
      userName: [this.data.user.userName || '', Validators.required],
      password: [''],
      rPassword: [''],
      isAdmin: [this.data.user.isAdmin ? true : false],
      timeZoneName: [this.data.user.timeZoneName || '', Validators.required],
      title: [this.data.user.title || ''],
    });
    this.resetFormGroup = this.fb.group({
      cPassword: ['', Validators.required],
      nPassword: ['', Validators.required],
      rePassword: ['', Validators.required],
    })
    if (this.data.user && !this.data.user.id) {
      this.userFormGroup.get('email')?.enable();
      this.userFormGroup.get('password')?.addValidators([Validators.required]);
      this.userFormGroup.get('rPassword')?.addValidators([Validators.required]);
    }
  }

  getOwnDetails() {
    this.messagesService.getUserData().subscribe({
      next: (res) => {
        if (this.data.user && this.data.user.id && this.data.user.id === res.id) {
          this.showUpdatePassword = true;
        } else {
          this.showUpdatePassword = false;
        }
      },
      error: (err) => {

      }
    })
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

  cleansePhoneNumber(phone: string) {
    if (!phone) {
      return ''
    }

    const cleansed = phone.replace(/\D/g, '');
    if (cleansed.length === 11) {
      return cleansed.slice(1);
    }
    return cleansed;
  }

  save(userForm: FormGroup) {
    if (this.data.user.id) {
      // save user details
      userForm.value.email = this.data.user.email;
      userForm.value.id = this.data.user.id;
      userForm.value.mobileNumber = this.cleansePhoneNumber(userForm.value.mobileNumber);
      if (!this.showUpdatePassword) {
        userForm.value.password = null;
      }
      if (this.showUpdatePassword && userForm.value.password) {
        userForm.value.password = userForm.value.password.trim() ? userForm.value.password.trim() : null;
      } else {
        userForm.value.password = null;
      }
      this.messagesService.updateUser(userForm.value).subscribe({
        next: (res) => {
          // close the dialog
          this.snackbar.open('Profile Updated');
          this.dialogRef.close(res);
        },
        error: (err) => {
          this.logger.log(err);
          this.snackbar.open(err.error || 'Unknown Exception');
        }
      })
    } else {
      // check if passwords match
      if (userForm.value.password !== userForm.value.rPassword) {
        this.snackbar.open('Passwords did not match');
        return;
      }
      userForm.value.mobileNumber = this.cleansePhoneNumber(userForm.value.mobileNumber);
      this.messagesService.createUser(userForm.value).subscribe({
        next: (res) => {
          this.dialogRef.close(res);
        },
        error: (err) => {
          this.logger.log(err);
          this.snackbar.open(err.error || 'Failed to create user');
        }
      })
    }
  }

  tabChanged(event: MatTabChangeEvent) {
    this.currentIndex = event.index;
  }

  resetPassword(resetForm: FormGroup) {
    this.logger.log(resetForm);
    if (resetForm.value.nPassword !== resetForm.value.rePassword) {
      this.snackbar.open('New Passwords did not match');
      return;
    }
    const data = {
      userName: this.data.user.email,
      oldPassword: resetForm.value.cPassword,
      password: resetForm.value.nPassword
    }
    this.authService.updatePassword(data).subscribe({
      next: (res) => {
      this.logger.log(res);
        this.snackbar.open('Password Updated');
      },
      error: (err) => {
        this.logger.log(err);
        this.snackbar.open(err.error || 'Unknown exception...');
      }
    })
  }

}
