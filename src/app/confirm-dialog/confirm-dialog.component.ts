import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss']
})
export class ConfirmDialogComponent implements OnInit {
  inputVal = '';
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
    ) { }


  ngOnInit() {
  }

  save() {
    this.dialogRef.close('save');
  }

  close(val: boolean) {
    if (this.data.message) {
      this.dialogRef.close(val);
    } else {
      if (val) {
        if (!this.inputVal) {
          this.snackBar.open(`${this.data.inputName} is required`);
          return;
        }
        this.dialogRef.close(this.inputVal);
      } else {
        this.dialogRef.close(val);
      }
    }
  }

}

