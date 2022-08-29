import { Component, OnInit, Inject, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MessagesService } from '../messages/messages.service';
import { position } from 'caret-pos';
import { map, Observable, shareReplay, Subject, takeUntil } from 'rxjs';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { LoggerService } from '../logger.service';

@Component({
  selector: 'app-templates-dialog',
  templateUrl: './templates-dialog.component.html',
  styleUrls: ['./templates-dialog.component.scss']
})
export class TemplatesDialogComponent implements OnInit {
  accountPhones: any = [];
  templateForm = this.fb.group({
    templateName: ['', Validators.required],
    templateText: ['', Validators.required],
    isPublic: [''],
    accountPhoneFilter: [''],
  });
  showEmojiList = false;
  previousTextPosition: any;
  private destroy$ = new Subject<void>();
  isLarge$: Observable<boolean> = this.breakpointObserver.observe([Breakpoints.Medium, Breakpoints.Tablet, Breakpoints.Large, Breakpoints.XLarge])
    .pipe(
      map(result => result.matches),
      shareReplay()
    );
    msgLmits: { cnt: number; msg: string; } = {
      cnt: 0,
      msg: ''
    };
  // accountId!: string | number;

  constructor(
    public dialogRef: MatDialogRef<TemplatesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private messagesService: MessagesService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private breakpointObserver : BreakpointObserver,
    private logger: LoggerService
  ) { }

  ngOnInit(): void {
    if (this.data.accountPhones) {
      this.accountPhones = this.data.accountPhones
    } else {
      this.getAccountPhones();
    }
    if (this.data.template) {
      this.templateForm.get('templateName')?.setValue(this.data.template.templateName);
      this.templateForm.get('templateText')?.setValue(this.data.template.templateText);
      this.templateForm.get('isPublic')?.setValue(this.data.template.isPublic);
      if (this.data.template.accountPhoneFilter) {
        const valArr = this.data.template.accountPhoneFilter.split(',');
        this.templateForm.get('accountPhoneFilter')?.setValue(valArr);
      }
      this.charCount(this.data.template.templateText);
    }
    this.templateForm.get('templateText')?.valueChanges
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe(
        {
          next: (val) => {
            this.charCount(val);
          }
        }
      )
  }

  @HostListener('click', ['$event'])
  onClick($event: any) {
    // this.logger.log($event);
    if (this.showEmojiList) {
      this.showEmojiList = false;
    }
  }

  getAccountPhones() {
    this.messagesService.getAccountPhones().subscribe({
      next: (res) => {
        this.accountPhones = res;
      },
      error: () => {
        this.accountPhones = [];
      }
    })
  }

  toggleEmojiList(event: any) {
    event.stopPropagation();
    this.showEmojiList = !this.showEmojiList;
  }

  addEmoji(event: any) {
    const input = document.getElementById('templateBox') as HTMLElement;
    const pos = position(input);
    this.previousTextPosition = pos;
    this.insertText(event.emoji.native);
  }

  insertText(text: string) {
    let newPos = text.length;
    let newText = '';
    const currentText = this.templateForm.get('templateText')?.value;
    if (this.previousTextPosition && this.previousTextPosition.pos) {
      newText = currentText.slice(0, this.previousTextPosition.pos) + text + currentText.slice(this.previousTextPosition.pos);
      newPos = this.previousTextPosition.pos + text.length;
    } else {
      newText = text + currentText;
      newPos = text.length;
    }
    this.templateForm.get('templateText')?.setValue(newText);
    const input = document.getElementById('templateBox') as HTMLElement;
    setTimeout(() => {
      input.focus();
      position(input, newPos);
    }, 100);
  }

  pauseEmojiClose(event: any) {
    event.stopPropagation();
  }

  backgroundImageFn(set: string, sheetSize: number) {
    return "assets/img/emoji_sheet_32.png";
  };

  charCount(text: string): any {
    const details: any = {
      cnt: 0,
      msg: ''
    };
    if (!text) {
      this.msgLmits = details;
      return details;
    }
    const strArr = text.split(/\r\n|\r|\n/);
    if (strArr.length) {
      details.cnt = text.length + (strArr.length -1);
    } else {
      details.cnt = text.length;
    };
    if (details.cnt > 600) {
      details.msg = 'Max character limit exceeded';
    } else if (details.cnt > 480) {
      details.msg = 'This message will use 4 message credits';
    } else if (details.cnt > 320) {
      details.msg = 'This message will use 3 message credits';
    } else if (details.cnt > 160) {
      details.msg = 'This message will use 2 message credits';
    }
    this.msgLmits = details;
    return details;
  }

  saveTemplate(form: FormGroup) {
    if (!form.valid) {
      return;
    }
    if (form.value.templateText.length > 600) {
      this.snackBar.open('Max length on a template message is 600 characters');
      return;
    }
    if (this.data.template.templateId || this.data.template.templateId === 0) {
      // update template
      const template = {
        templateId: this.data.template.templateId,
        templateName: form.value.templateName,
        templateText: form.value.templateText,
        isPublic: form.value.isPublic ? true : false,
        accountPhoneFilter: form.value.accountPhoneFilter ? form.value.accountPhoneFilter.join(',') : '',
        isDeleted: false
      }
      this.messagesService.updateTemplate(this.data.accountId, template).subscribe({
        next: (res) => {
          this.dialogRef.close(res);
        },
        error: (err) => {
          this.logger.log(err);
          this.snackBar.open(err.error || 'Unknown exception.');
        }
      })
    } else {
      // add new template
      const template = {
        templateName: form.value.templateName,
        templateText: form.value.templateText,
        isPublic: form.value.isPublic ? true : false,
        accountPhoneFilter: form.value.accountPhoneFilter ? form.value.accountPhoneFilter.join(',') : '',
      }
      this.messagesService.addTemplate(this.data.accountId, template).subscribe({
        next: (res) => {
          this.dialogRef.close(res);
        },
        error: (err) => {
          this.logger.log(err);
          this.snackBar.open(err.error || 'Unknown exception.');
        }
      })
    }

  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }
}
