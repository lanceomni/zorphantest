import { HttpClient, HttpParams } from '@angular/common/http';
import { EventEmitter, Injectable } from '@angular/core';
import { catchError, map, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
environment
@Injectable({
  providedIn: 'root'
})
export class MessagesService {
  
  public settingsUpdated$: EventEmitter<any>;

  constructor(
    private http: HttpClient,
    ) {
    this.settingsUpdated$ = new EventEmitter();
   }

  getAccountPhones() {
    return this.http.get(`${environment.rootUrl}/User/GetAccountPhones`)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  // contacts
  getContacts(accountPhone: string | number, page: any) {
    let params = new HttpParams()
      .set('start', `${page.start}`)
      .set('limit', `${page.limit}`)
      // .set('search', `${page.search}`)
      .set('sortDirection', `${page.sortDirection}`)
      .set('sort', `${page.sort}`)
      .set('showTagged', page.showTagged)
      .set('showUntagged', page.showUntagged)
      ;

    if (page.search) {
      params = params.append('search', `${page.search}`);
    }
    if (page.filter) {
      params = params.append('filter', `${page.filter}`);
    }
    if (page.tagFilter) {
      params = params.append('tagFilter', `${page.tagFilter}`);
    }

    return this.http.get(`${environment.rootUrl}/Contact/${accountPhone}/GetContactList`, { params })
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  searchContacts(accountPhone: string | number, page: any) {
    let params = new HttpParams()
      .set('start', `${page.start}`)
      .set('limit', `${page.limit}`)
      // .set('search', `${page.search}`)
      .set('sortDirection', `${page.sortDirection}`)
      // .set('sort', `${page.sort}`);
      .set('sort', `contactId`);

    if (page.search) {
      params = params.append('search', `${page.search}`);
    }

    return this.http.get(`${environment.rootUrl}/Contact/${accountPhone}/GetContactList`, { params });
  }

  markContactRead(accountPhone: string, contactPhone: string) {
    return this.http.put(`${environment.rootUrl}/Contact/${accountPhone}/MarkAsRead/${contactPhone}`, {})
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  updateContact(accountPhone: string, contactPhone: string, newContactPhone: string, newContactPhoneOverride: boolean, contact: any) {
    let url = `${environment.rootUrl}/Contact/${accountPhone}/Update/${contactPhone}`;
    if (newContactPhone) {
      url = `${environment.rootUrl}/Contact/${accountPhone}/Update/${contactPhone}?newContactPhone=${newContactPhone}&newContactPhoneOverride=${newContactPhoneOverride}`
    }
    return this.http.put(url, contact)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  deleteContact(accountPhone: string, contactPhone: string, deleteMessages: boolean, deleteContact: boolean) {
    const params = new HttpParams()
      .set('deleteMessages', `${deleteMessages}`)
      .set('deleteContact', `${deleteContact}`);
    return this.http.delete(`${environment.rootUrl}/Contact/${accountPhone}/Delete/${contactPhone}`, { params })
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  blockContact(accountPhone: string, contactPhone: string, flag: boolean) {
    return this.http.post(`${environment.rootUrl}/Contact/${accountPhone}/Block/${contactPhone}/${flag}`, {})
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  createNewContact(accountPhone: string, contact: any) {
    return this.http.post(`${environment.rootUrl}/Contact/${accountPhone}/Create`, contact)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  // Messages api calls

  getMessages(accountPhone: string, phoneNumber: string | number, messagePage: any, messageId ?: string) {
    let params = new HttpParams()
      .set('start', `${messagePage.start}`)
      .set('limit', `${messagePage.limit}`)
      .set('sortDirection', `${messagePage.sortDirection}`)
      .set('sort', `${messagePage.sort}`);

    if (messagePage.search) {
      params = params.append('search', `${messagePage.search}`);
    }
    if (messageId) {
      params = params.append('messageId', `${messageId}`);
    }
    return this.http.get(`${environment.rootUrl}/Message/${accountPhone}/${phoneNumber}/GetMessageList`, { params })
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  // searchMessages(accountPhone: string, phoneNumber: string | number, messagePage: any) {
  //   let params = new HttpParams()
  //     .set('start', `${messagePage.start}`)
  //     .set('limit', `${messagePage.limit}`)
  //     .set('sortDirection', `${messagePage.sortDirection}`)
  //     .set('sort', `${messagePage.sort}`);

  //   if (messagePage.search) {
  //     params = params.append('search', `${messagePage.search}`);
  //   }
  //   return this.http.get(`${environment.rootUrl}/Message/${accountPhone}/${phoneNumber}/GetMessageList`, { params });
  // }

  searchMessages(accountPhone: string, phoneNumber: string | number, messagePage: any) {
    let params = new HttpParams()
      .set('start', `${messagePage.start}`)
      .set('limit', `${messagePage.limit}`)
      .set('sortDirection', `${messagePage.sortDirection}`)
      .set('sort', `${messagePage.sort}`);

    if (messagePage.search) {
      params = params.append('search', `${messagePage.search}`);
    }
    if (phoneNumber) {
      params = params.append('contactPhone', `${phoneNumber}`);
    }

    return this.http.get(`${environment.rootUrl}/Message/${accountPhone}/Search`, { params });
  }

  sendMessage2(accountPhone: string, phoneNumbers: any[], attachmentIds: string[], messageObj: any, groupNames: string[], files : File[]) {
    const formData = new FormData();
    formData.append('PhoneNumberJson', JSON.stringify(phoneNumbers));
    if (attachmentIds && attachmentIds.length) {
      for (const attachmentId of attachmentIds) {
        formData.append('AttachmentIds', attachmentId);
      }
    }
    if (groupNames && groupNames.length) {
      formData.append('GroupNameJson', JSON.stringify(groupNames));
    }
    for (const key in messageObj) {
      if (messageObj.hasOwnProperty(key)) {
        formData.append(key, messageObj[key]);
      }
    }
    if (files && files.length) {
      for (const file of files) {
        formData.append('AttachmentFiles', file);
      }
    }
    
    return this.http.post(`${environment.rootUrl}/Message/${accountPhone}/SendMessage2`, formData)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  markMessage(accountPhone: string, phoneNumber: string, messageId: string, isRead: boolean) {
    return this.http.put(`${environment.rootUrl}/Message/${accountPhone}/${phoneNumber}/ToggleReadFlag/${messageId}/${isRead}`, {})
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  getMessagePosition(accountPhone: string, phoneNumber: string, messageId: string, messagePage: any) {
    let params = new HttpParams()
      .set('messageId', `${messageId}`)
      .set('sortDirection', `${messagePage.sortDirection}`)
      .set('sort', `${messagePage.sort}`);

    return this.http.get(`${environment.rootUrl}/Message/${accountPhone}/${phoneNumber}/GetMessagePosition`, {params})
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  deleteMessage(accountPhone: string, contactPhone: string, messageId: string) {
    return this.http.post(`${environment.rootUrl}/Message/${accountPhone}/${contactPhone}/Delete/${messageId}`, {})
    .pipe(catchError((err: any) => {
      return throwError(() => err);
    }), map((resp: any) => {
      return resp;
    }))
  }

  // settings

  getUserData(userId?: string | number) {
    let params = new HttpParams();
    if (userId) {
      params = params.append('requestedUserId', userId)
    }
    return this.http.get(`${environment.rootUrl}/User/UserData`, {params})
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  saveUserSettings(userData: any) {
    return this.http.post(`${environment.rootUrl}/User/UserData`, userData)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  // groups 
  getGroupsList(accountPhone: string | number, search: string) {
    const params = new HttpParams()
      .set('search', `${search}`);
    return this.http.get(`${environment.rootUrl}/Group/${accountPhone}/GetGroupList`, {params})
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  searchGroups(accountPhone: string | number, search: string) {
    const params = new HttpParams()
      .set('search', `${search}`);
      return this.http.get(`${environment.rootUrl}/Group/${accountPhone}/GetGroupList`, {params});
  }

  saveGroup(accountPhone: string | number, groupData: any) {
    return this.http.post(`${environment.rootUrl}/Group/${accountPhone}/AddUpdateGroup`, groupData)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  deleteGroup(accountPhone: string | number, groupName: any) {
    return this.http.post(`${environment.rootUrl}/Group/${accountPhone}/DeleteGroup/${groupName}`, {})
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  getGroupContacts(accountPhone: string | number, groupId: string | number) {
    return this.http.get(`${environment.rootUrl}/Group/${accountPhone}/GetGroup/${groupId}`)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  // get scheduled messages
  getDraftList(accountPhone: string, messageId ?: string) {
    let params = new HttpParams();
    if (messageId) {
      params = params.append('messageId', `${messageId}`);
    }
    return this.http.get(`${environment.rootUrl}/Message/${accountPhone}/GetMessageDraftList`, {params})
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  pauseDraftMessage(accountPhone: string, groupGuid: string) {
    return this.http.post(`${environment.rootUrl}/Message/${accountPhone}/MessageDraftPause/${groupGuid}`, {})
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  deleteDraftMessage(accountPhone: string, groupGuid: string) {
    return this.http.post(`${environment.rootUrl}/Message/${accountPhone}/MessageDraftDelete/${groupGuid}`, {})
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  settingsUpdateNotification(settings: any) {
    this.settingsUpdated$.emit(settings);
  }

  // templates
  getTemplates(accountId: string | number, accountPhone: string | number) {
    return this.http.get(`${environment.rootUrl}/Account/${accountId}/GetTemplates/${accountPhone}`)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  addTemplate(accountId: string | number, template: any) {
    return this.http.post(`${environment.rootUrl}/Account/${accountId}/AddTemplate`, template)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  updateTemplate(accountId: string | number, template: any) {
    return this.http.post(`${environment.rootUrl}/Account/${accountId}/UpdateTemplate`, template)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  // accounts
  getAccounts(search?: string) {
    let params = new HttpParams();
    if (search) {
      params = params.append('search', search);
    }
    return this.http.get(`${environment.rootUrl}/Account`, {params})
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  createAccount(accountName: string) {
    return this.http.post(`${environment.rootUrl}/Account/Create`, {accountName})
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  updateAccount(account: any) {
    return this.http.post(`${environment.rootUrl}/Account/Create`, {account})
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  addUpdateAccountPhone(accountId: string, data: any) {
    return this.http.post(`${environment.rootUrl}/Account/${accountId}/AddUpdateAccountPhone`, data)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  getAccountUsers(accountId: string) {
    return this.http.get(`${environment.rootUrl}/Account/${accountId}/GetUsers`)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  getAccountPhone(accountId: string) {
    return this.http.get(`${environment.rootUrl}/Account/${accountId}/GetAccountPhone`)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  // users

  getAllUsers(text?: string) {
    let params = new HttpParams();
    if (text) {
      params = params.append('email', text);
    }
    return this.http.get(`${environment.rootUrl}/User/UserList`, {params})
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  addUpdateUser(user: any) {
    return this.http.post(`${environment.rootUrl}/Account/AddUpdateUser`, user)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
    }
    
  removeAccountUser(user: any) {
    return this.http.post(`${environment.rootUrl}/Account/DeleteUser`, user)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  createUser(user: any) {
    return this.http.post(`${environment.rootUrl}/User/CreateUser`, user)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  updateUser(user: any) {
    return this.http.post(`${environment.rootUrl}/User/UpdateUser`, user)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  // timeZones
  
  getTimeZones() {
    return this.http.get(`${environment.rootUrl}/TimeZone/GetTimeZones`)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  // providers

  getProviders() {
    return this.http.get(`${environment.rootUrl}/Provider`)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  // responders
  getAutoResponders(accountId: string, accountPhone: string) {
    return this.http.get(`${environment.rootUrl}/Account/${accountId}/GetAutoResponders/${accountPhone}`)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  updateAutoResponder(accountId: string, accountPhone: string, responder: any) {
    return this.http.post(`${environment.rootUrl}/Account/${accountId}/UpdateAutoResponder/${accountPhone}`, responder)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  addAutoResponder(accountId: string, accountPhone: string, responder: any) {
    return this.http.post(`${environment.rootUrl}/Account/${accountId}/AddAutoResponder/${accountPhone}`, responder)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  // after hours
  getAfterHours() {
    
  }

  // Tags
  getAccountPhoneTags(accountPhone: string | number) {
    return this.http.get(`${environment.rootUrl}/Account/${accountPhone}/TagsGet`)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  addAccountPhoneTag(accountPhone: string | number, tag: string) {
    return this.http.post(`${environment.rootUrl}/Account/${accountPhone}/TagAdd/${tag}`, {})
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  deleteAccountPhoneTag(accountPhone: string | number, tag: string) {
    return this.http.post(`${environment.rootUrl}/Account/${accountPhone}/TagDelete/${tag}`, {})
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  tagContact(accountPhone: string | number, contactPhone: string | number, tag: string) {
    return this.http.post(`${environment.rootUrl}/Contact/${accountPhone}/Tag/${contactPhone}/${tag}`, {})
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  unTagContact(accountPhone: string | number, contactPhone: string | number, tag: string) {
    return this.http.post(`${environment.rootUrl}/Contact/${accountPhone}/Untag/${contactPhone}/${tag}`, {})
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  downloadConversation(accountPhone: string | number, contactPhone: string | number, printOptions: any) {
    let params = new HttpParams()
      .set('startDt', `${printOptions.frmDt}`)
      .set('endDt', `${printOptions.toDt}`)
      .set('format', `${printOptions.saveType}`);
    return this.http.get(`${environment.rootUrl}/Contact/${accountPhone}/Print/${contactPhone}`, {params, responseType: 'arraybuffer'})
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  exportContacts(accountPhone: string | number) {
    return this.http.get(`${environment.rootUrl}/Account/${accountPhone}/ExportContacts`, {responseType: 'arraybuffer'})
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  saveSub(data: any) {
    return this.http.post(`${environment.rootUrl}/User/RegisterPush`, data)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  removeSub(subId: string | number) {
    return this.http.post(`${environment.rootUrl}/User/UnregisterPush/${subId}`, {})
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }

  getSubs() {
    return this.http.get(`${environment.rootUrl}/User/GetPushNotifications`)
      .pipe(catchError((err: any) => {
        return throwError(() => err);
      }), map((resp: any) => {
        return resp;
      }))
  }



}
