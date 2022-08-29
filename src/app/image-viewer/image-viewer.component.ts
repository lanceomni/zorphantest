import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LoggerService } from '../logger.service';

@Component({
  selector: 'app-image-viewer',
  templateUrl: './image-viewer.component.html',
  styleUrls: ['./image-viewer.component.scss']
})
export class ImageViewerComponent implements OnInit {

  images: any[] = [];
  currentImage: any;
  curretnIndex: number = 0;
  constructor(
    public dialogRef: MatDialogRef<ImageViewerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private logger: LoggerService,
    private snackbar: MatSnackBar)
    {}

  ngOnInit(): void {
    this.images = this.data.message.attachments.filter((attachment: any) => attachment.mimeType.indexOf('image') > -1);
    if (!this.images.length) {
      this.snackbar.open('Either no images found or wrong mime type is mentioned');
      this.close();
      return;
    }
    if (this.data.imageIndx > -1 && this.data.imageIndx < this.images.length) {
      this.curretnIndex = this.data.imageIndx;
    }
    this.currentImage = this.images[this.curretnIndex];
  }

  moveImage(index: number) {
    if ((index > 0) && (this.curretnIndex < this.images.length - 1)) {
      this.curretnIndex++;
    } else if ((index < 0) && (this.curretnIndex > 0)) {
      this.curretnIndex--;
    }
    this.currentImage =  this.images[this.curretnIndex];
  }

  close() {
    this.dialogRef.close();
  }

}
