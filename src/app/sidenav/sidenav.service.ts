import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { EventEmitter, Injectable } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay, catchError, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SidenavService {
  public shrinkSideNav$: EventEmitter<any>;
  public toggleSideNav$: EventEmitter<any>;
  public isSmall$: Observable<boolean> = this.breakpointObserver.observe([Breakpoints.Small, Breakpoints.XSmall])
    .pipe(
      map(result => result.matches),
      shareReplay()
    );
  
  constructor(
    private breakpointObserver: BreakpointObserver,
    private http: HttpClient
  ) {
    this.shrinkSideNav$ = new EventEmitter();
    this.toggleSideNav$ = new EventEmitter();
   }

  private sidenav!: MatSidenav;

  public setsidenav(sidenav: MatSidenav) {
    this.sidenav = sidenav;
  }

  public open() {
    return this.sidenav.open();
  }

  public close() {
    return this.sidenav.close();
  }

  public toggle(): void {
    // this.sidenav.toggle();
    this.toggleSideNav$.emit();
  }

  public shrinkSidenav () {
    this.shrinkSideNav$.emit();
  }

  getUserData() {
    return this.http.get(`${environment.rootUrl}/User/UserData`)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }
}
