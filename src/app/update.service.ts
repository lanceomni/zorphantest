import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SwUpdate } from '@angular/service-worker';

@Injectable({
  providedIn: 'root'
})
export class UpdateService {

  constructor(
    private swUpdate: SwUpdate,
    private snackBar: MatSnackBar,
  ) {
    setTimeout(() => {
      this.checkForUpdates();
      this.updateClient();
    }, 3000);
    this.swUpdate.unrecoverable.subscribe(event => {
      const snackRef = this.snackBar.open('An error occured that we cannot recover from. Please reload page', 'Reload');
      snackRef
        .onAction()
        .subscribe(() => {
          window.location.reload();
        })
    })
  }

  updateClient() {
    if (!this.swUpdate.isEnabled) {
      console.log('No Update available');
      return;
    }
    this.swUpdate.versionUpdates.subscribe(evt => {
      if (evt.type === 'VERSION_DETECTED') {
        const snack = this.snackBar.open('Update Available', 'Reload', { duration: undefined});
        snack
          .onAction()
          .subscribe(() => {
            window.location.reload();
          });
      } else if (evt.type === 'VERSION_INSTALLATION_FAILED') {
        console.log('Failed to install latest version ', evt);
      }
    });
  }

  checkForUpdates() {
    setInterval(() => {
      this.swUpdate.checkForUpdate().then((result) => {
        // update checked
      });
    }, 120000);
  }

  
}
