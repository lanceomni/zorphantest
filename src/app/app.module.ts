import { NgModule } from '@angular/core';
import { BrowserModule, Title } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ContactsComponent } from './contacts/contacts.component';
import { MessagesComponent } from './messages/messages.component';
import { LayoutModule } from '@angular/cdk/layout';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatRippleModule } from '@angular/material/core';
import {MatRadioModule} from '@angular/material/radio';
import {MatMenuModule} from '@angular/material/menu';
import {MatTabsModule} from '@angular/material/tabs';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSnackBarModule, MAT_SNACK_BAR_DEFAULT_OPTIONS} from '@angular/material/snack-bar';
import {MatSelectModule} from '@angular/material/select';
import {MatCardModule} from '@angular/material/card';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatSortModule} from '@angular/material/sort';
import {MatChipsModule} from '@angular/material/chips';
import {MatDialogModule} from '@angular/material/dialog';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatStepperModule} from '@angular/material/stepper';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatExpansionModule} from '@angular/material/expansion';
import {TextFieldModule} from '@angular/cdk/text-field';
import {ClipboardModule} from '@angular/cdk/clipboard';
import { LoadingBarHttpClientModule } from '@ngx-loading-bar/http-client';
import { PickerModule } from '@ctrl/ngx-emoji-mart';

import { SidenavComponent } from './sidenav/sidenav.component';
import { SettingsComponent } from './settings/settings.component';
import { ProfileComponent } from './profile/profile.component';
import { AuthComponent } from './auth/auth.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './auth/auth.interceptor';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { ReversePipe } from './pipes/reverse.pipe';
import { PhonePipe } from './pipes/phone.pipe';
import { ContactDialogComponent } from './contact-dialog/contact-dialog.component';
import { SafeHtmlPipe } from './pipes/safe-html.pipe';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';
import { NgxMatDatetimePickerModule, NgxMatNativeDateModule, NgxMatTimepickerModule } from '@angular-material-components/datetime-picker';
import { MessageSearchComponent } from './message-search/message-search.component';
import { HighlightTextPipe } from './pipes/highlight-text.pipe';
import { TimeModePipe } from './pipes/time-mode.pipe';
import { NotificationPanelComponent } from './notification-panel/notification-panel.component';
import { ImageViewerComponent } from './image-viewer/image-viewer.component';
import { GroupDialogComponent } from './group-dialog/group-dialog.component';
import { DraftMessagesComponent } from './draft-messages/draft-messages.component';
import { TimeAgoPipe } from './time-ago.pipe';
import { DatePipe } from '@angular/common';
import { AccountPhoneDialogComponent } from './account-phone-dialog/account-phone-dialog.component';
import { TemplatesDialogComponent } from './templates-dialog/templates-dialog.component';
import { TemplatesComponent } from './templates/templates.component';
import { AdminSettingsComponent } from './admin-settings/admin-settings.component';
import { AccountsComponent } from './accounts/accounts.component';
import { ResponderComponent } from './responder/responder.component';
import { AfterHrsDialogComponent } from './after-hrs-dialog/after-hrs-dialog.component';
import { ResponderDialogComponent } from './responder-dialog/responder-dialog.component';
import { TagDialogComponent } from './tag-dialog/tag-dialog.component';
import { ResizableModule } from 'angular-resizable-element';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import {PlatformModule} from '@angular/cdk/platform';

@NgModule({
  declarations: [
    AppComponent,
    ContactsComponent,
    MessagesComponent,
    SidenavComponent,
    SettingsComponent,
    ProfileComponent,
    AuthComponent,
    ReversePipe,
    PhonePipe,
    ContactDialogComponent,
    ConfirmDialogComponent,
    SafeHtmlPipe,
    MessageSearchComponent,
    HighlightTextPipe,
    TimeModePipe,
    NotificationPanelComponent,
    ImageViewerComponent,
    GroupDialogComponent,
    DraftMessagesComponent,
    TimeAgoPipe,
    AccountPhoneDialogComponent,
    TemplatesDialogComponent,
    TemplatesComponent,
    AdminSettingsComponent,
    AccountsComponent,
    ResponderComponent,
    AfterHrsDialogComponent,
    ResponderDialogComponent,
    TagDialogComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    LoadingBarHttpClientModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    LayoutModule,
    MatToolbarModule,
    MatButtonModule,
    MatSidenavModule,
    MatIconModule,
    MatListModule,
    MatTooltipModule,
    MatInputModule,
    MatFormFieldModule,
    MatRippleModule,
    MatSnackBarModule,
    MatMenuModule,
    MatStepperModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatSelectModule,
    MatCardModule,
    MatAutocompleteModule,
    MatChipsModule,
    TextFieldModule,
    MatDialogModule,
    ScrollingModule,
    ClipboardModule,
    MatRadioModule,
    MatSortModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    NgxMatDatetimePickerModule,
    NgxMatNativeDateModule,
    NgxMatTimepickerModule,
    PickerModule,
    ResizableModule,
    MatExpansionModule,
    PlatformModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    })
  ],
  providers: [
    {provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: {duration: 5000, verticalPosition: 'top'}},
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    PhonePipe,
    DatePipe,
    Title
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
