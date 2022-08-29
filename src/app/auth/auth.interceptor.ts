import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private router: Router,
    private authService: AuthService
  ) { }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (request.url) {
      request = request.clone({
        withCredentials: true
      });
    }
    return next.handle(request).pipe(tap({
      error: (err: any) => {
        if (err instanceof HttpErrorResponse) {
          if (err.status === 401) {
            this.authService.retireCache();
            this.router.navigateByUrl('/auth');
          }
        }
      }
    }));
  }
}
