import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { LoggerService } from '../logger.service';
import { MessagesService } from '../messages/messages.service';
import { SidenavService } from '../sidenav/sidenav.service';
import { TemplatesDialogComponent } from '../templates-dialog/templates-dialog.component';

@Component({
  selector: 'app-templates',
  templateUrl: './templates.component.html',
  styleUrls: ['./templates.component.scss']
})
export class TemplatesComponent implements OnInit {
  templates: any = [];
  accountPhones: any = [];
  filteredTemplates: any = [];
  selectedAccountPhone: any;
  searchTemplates = new FormControl('');
  private destroy$ = new Subject<void>();
  isSmall$ = this.sidenavService.isSmall$;
  user: any = {};
  userPref: any;

  constructor(
    private messagesService: MessagesService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private sidenavService: SidenavService,
    private logger: LoggerService
  ) { }

  ngOnInit(): void {
    this.getAccountPhones();
    this.sidenavService.shrinkSidenav();
    this.searchTemplates.valueChanges
    .pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(
      text => {
      this.filterTemplates(text) ;
      }
    )
  }

  getAccountPhones() {
    this.messagesService.getAccountPhones().subscribe({
      next: (res) => {
        this.accountPhones = res;
        // this.filterAccPhones('');
        if (!this.selectedAccountPhone) {
          try {
            const userPref = JSON.parse(localStorage.getItem('userPref') || '{}');
            if (userPref && userPref.accountPhone) {
              this.userPref = userPref;
              const match = this.accountPhones.find((eachAccountPhone: any) => eachAccountPhone.accountPhone === userPref.accountPhone.accountPhone);
              if (match) {
                this.selectedAccountPhone = match;
              } else {
                this.selectedAccountPhone = res[0];
              }
            } else {
              this.selectedAccountPhone = res[0];
            }
          } catch (error) {
            this.selectedAccountPhone = res[0];
          }
          try {
            const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
            if (loggedInUser && loggedInUser.id) {
              this.user = loggedInUser;
            }
          } catch (error) {
            this.logger.log(error);
            // logout once and ask to login again.
          }
        }
        this.getSavedTemplates();
      },
      error: (err) => {
        this.logger.log(err);
      }
    })
  }

  accPhoneChanged() {
    this.templates = [];
    this.userPref.accountPhone = this.selectedAccountPhone;
    localStorage.setItem('userPref', JSON.stringify(this.userPref));
    this.getAccountPhones();
  }

  toggleSideNav($event: any) {
    this.sidenavService.toggle();
  }

  getSavedTemplates() {
    this.templates = [];
    this.filteredTemplates = [];
    this.messagesService.getTemplates(this.selectedAccountPhone.accountId, this.selectedAccountPhone.accountPhone).subscribe({
      next: (res) => {
        if (res && res.length) {
          res = this.groupTemplates(res);
          this.templates = res;
          this.filteredTemplates = res;
        }
      },
      error: (err) => {
        this.templates = [];
        this.filteredTemplates = [];
        this.logger.log(err);
      }
    })
  }

  filterTemplates(text: string) {
    if (!text) {
      this.filteredTemplates = this.templates;
    }
    this.filteredTemplates = this.templates.filter((eachTemplate: any) => (eachTemplate.templateName.toLowerCase().indexOf(text.toLowerCase()) > -1) || (eachTemplate.templateText.toLowerCase().indexOf(text.toLowerCase()) > -1));
  }

  openTemplateDialog(template: any) {
    const templateDialogRef = this.dialog.open(TemplatesDialogComponent, {
      data: { 
        title: template ?  'Edit Template' : 'Add Template',
        template,
        accountPhones: this.accountPhones,
        accountId: this.selectedAccountPhone.accountId
      },
      minWidth: '50vw',
      closeOnNavigation: true
    });
    templateDialogRef.afterClosed().subscribe(result => {
      if (result) {
        // check and update templates list
        this.updateTemplateList(result);
      }
    }) 
  }

  confirmDelete(template: any) {
    const confirmRef = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete', message: `Are you sure to delete template - "${template.templateName}"?` }
    });
    confirmRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteTemplate(template);
      }
    })
  }

  deleteTemplate(template: any) {
    template.isDeleted = true;
    this.messagesService.updateTemplate(this.selectedAccountPhone.accountId, template).subscribe({
      next: (res) => {
        // remove from list
        this.snackBar.open('Done');
        const matchIdx = this.templates.findIndex((eachTemplate: any) => eachTemplate.templateId === template.templateId);
        if (matchIdx > -1) {
          this.templates.splice(matchIdx, 1);
        }
      },
      error: (err) => {
        this.logger.log(err);
        this.snackBar.open(err.error || "Failed to delete template");
      }
    })
  }

  updateTemplateList(template: any) {
    const matchIdx = this.templates.findIndex((eachTemplate: any) => eachTemplate.templateId === template.templateId);
    if (matchIdx > -1) {
      this.templates[matchIdx] = template;
    } else {
      this.templates.push(template);
    }
  }

  accPhoneCompareFn(c1: any, c2: any): boolean {
    return c1 && c2 ? c1.accountPhoneId === c2.accountPhoneId : c1 === c2;
  }

  groupTemplates(templates: any) {
    return templates.sort((a: any, b: any) => Number(b.isPublic) - Number(a.isPublic));
  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }

}
