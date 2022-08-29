import { HttpClient } from '@angular/common/http';
import { EventEmitter, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, map, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { NotificationService } from '../notification.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  userName = '';
  public authChanged$: EventEmitter<any>;
  sessionExpired = true;
  attendancePromise: any;
  constructor(
    private http: HttpClient,
    private notificationService: NotificationService,
  ) {
    this.authChanged$ = new EventEmitter();
    try {
      const user: any = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
      if (user && user.userName) {
        this.userName = user.userName;
        this.sessionExpired = false;
        if (this.attendancePromise) {
          clearInterval(this.attendancePromise);
        }
        this.attendancePromise = setInterval(() => {
          this.attendance();
        }, 120000);
        this.authChanged$.emit(this.userName);
        this.notificationService.startConnection();
      } else {
        this.retireCache();
      }
    } catch (error) {
      this.userName = '';
    }
  }

  login(data: any) {
    return this.http.post(`${environment.rootUrl}/User/Login`, data)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        this.userName = resp.userName;
        this.sessionExpired = false;
        localStorage.setItem('loggedInUser', JSON.stringify(resp));
        this.authChanged$.emit(this.userName);
        this.notificationService.startConnection();
        return resp;
      }))
  }

  resetPassword(data: any) {
    return this.http.post(`${environment.rootUrl}/User/ResetPassword`, data)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  updatePassword(data: any) {
    return this.http.post(`${environment.rootUrl}/User/UpdatePassword`, data)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  isAuthenticated() {
    if (this.userName && !this.sessionExpired) {
      return true;
    } else {
      return false;
    }
  }

  attendance(initialLoad?: boolean) {
    this.http.get(`${environment.rootUrl}/User/Hello`).subscribe({
      next: (res) => {
        this.sessionExpired = false;
      }, error: (err) => {
        console.log(err);
        if (err.status && err.status === 401) {
          this.sessionExpired = true;
        }
      }
    });
    // this.checkUpdates(initialLoad);
  }

  // checkUpdates(initialLoad?: boolean) {
  //   this.getVersion().subscribe({
  //     next: (res) => {
  //       const localVersion = localStorage.getItem('appVersion');
  //       if (!localVersion || initialLoad) {
  //         localStorage.setItem('appVersion', res.version);
  //       } else if (localVersion && localVersion !== res.version) {
  //         const snackBarRef = this.snackBar.open('New update available', 'Update', { duration: undefined });
  //         snackBarRef.onAction().subscribe(() => {
  //           // update the localstorage item and refresh the webpage.
  //           localStorage.setItem('appVersion', res.version);
  //           setTimeout(() => {
  //             location.reload();
  //           }, 0);
  //         });
  //       }
  //     },
  //     error: (err) => {
  //       console.log(err);
  //     }
  //   })
  // }

  // getVersion() {
  //   return this.http.get(`${location.origin}/assets/version.json`)
  //     .pipe(catchError((err) => {
  //       return throwError(() => err);
  //     }), map((resp: any) => {
  //       return resp;
  //   }));
  // }

  logout() {
    return this.http.get(`${environment.rootUrl}/User/Logout`)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map(resp => {
        this.retireCache();
        return resp;
      }))
  }

  retireCache() {
    localStorage.removeItem('loggedInUser');
    this.notificationService.disconnect();
    if (this.attendancePromise) {
      clearInterval(this.attendancePromise);
    }
    this.userName = '';
    this.sessionExpired = true;
  }
}
