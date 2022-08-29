import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AccountsComponent } from './accounts/accounts.component';
import { AuthComponent } from './auth/auth.component';
import { AuthGuard } from './auth/auth.guard';
// import { PendingChangesGuard } from './auth/pending-changes.guard';
import { ContactsComponent } from './contacts/contacts.component';
import { MessagesComponent } from './messages/messages.component';
import { ResponderComponent } from './responder/responder.component';
// import { SettingsComponent } from './settings/settings.component';
import { TemplatesComponent } from './templates/templates.component';

const routes: Routes = [
  {
    path: 'contacts',
    component: ContactsComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'messages',
    component: MessagesComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'templates',
    component: TemplatesComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'accounts',
    component: AccountsComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'responder',
    component: ResponderComponent,
    canActivate: [AuthGuard]
  },
  // {
  //   path: 'settings',
  //   component: SettingsComponent,
  //   canActivate: [AuthGuard],
  //   canDeactivate: [PendingChangesGuard]
  // },
  {
    path: 'auth',
    component: AuthComponent,
  },
  { path: '', redirectTo: '/messages', pathMatch: 'full' },
  { path: '**', redirectTo: '/messages' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
