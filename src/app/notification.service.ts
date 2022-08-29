import { Injectable } from '@angular/core';
import * as signalR from "@microsoft/signalr";
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private hubConnection!: signalR.HubConnection;
  private userName! : string;
  constructor() {
    this.checkUser();
    // this.startConnection();
  }

  checkUser() {
    try {
      const user = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
      if (user && user.userName) {
        this.userName = user.userName;
      } else {
        this.userName = '';
      }
    } catch (error) {
      this.userName = '';
    }
  }

  startConnection() {
    // return;
    this.checkUser();
    if (!this.userName || (this.hubConnection && this.hubConnection.state !== 'Disconnected')) {
      this.disconnect();
      return;
    }
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.rootUrl}/notification`)
      .withAutomaticReconnect()
      .build();
    this.hubConnection
      .start()
      .then(() => console.log('Connection started'))
      .catch(err => console.log('Error while starting connection: ' + err))
  }

  disconnect() {
    if (this.hubConnection && this.hubConnection.state !== 'Disconnected') {
      // console.log(this.hubConnection.state);
      console.log('disconnected');
      this.hubConnection.stop();
    }
  }

  newMessageReceived() {
    return new Observable((observer) => {
      this.hubConnection.on('NewMessage', (message) => {
        try {
          observer.next(message);
        } catch (error) {
          observer.error(error);
        }
      });
    });
  }

  messageViewed() {
    return new Observable((observer) => {
      this.hubConnection.on('MessageView', (message) => {
        try {
          observer.next(message);
        } catch (error) {
          observer.error(error);
        }
      });
    });
  }

  messageTyping() {
    return new Observable((observer) => {
      this.hubConnection.on('MessageType', (message) => {
        try {
          observer.next(message);
        } catch (error) {
          observer.error(error);
        }
      });
    });
  }

  MessageStopView() {
    return new Observable((observer) => {
      this.hubConnection.on('MessageStopView', (message) => {
        try {
          observer.next(message);
        } catch (error) {
          observer.error(error);
        }
      });
    });
  }

  MessageStopType() {
    return new Observable((observer) => {
      this.hubConnection.on('MessageStopType', (message) => {
        try {
          observer.next(message);
        } catch (error) {
          observer.error(error);
        }
      });
    });
  }

  contactDeleted() {
    return new Observable((observer) => {
      this.hubConnection.on('ContactDelete', (message) => {
        try {
          observer.next(message);
        } catch (error) {
          observer.error(error);
        }
      });
    });
  }

  contactEdit() {
    return new Observable((observer) => {
      this.hubConnection.on('ContactEdit', (message) => {
        try {
          observer.next(message);
        } catch (error) {
          observer.error(error);
        }
      });
    });
  }

  sendMessageView(accountPhone: string | number, contact: string | number, message: string,) {
    if (this.hubConnection) {
      this.hubConnection.send('sendMessageView', accountPhone, message, contact);
    }
  }

  sendMessageTyping(accountPhone: string | number, contact: string | number, message: string, ) {
    if (this.hubConnection) {
      this.hubConnection.send('sendMessageType', accountPhone, message, contact);
    }
  }

  sendStopMessageView(accountPhone: string | number, contact: string | number, message: string,) {
    if (this.hubConnection) {
      this.hubConnection.send('sendStopMessageView', accountPhone, message, contact);
    }
  }

  sendStopMessageTyping(accountPhone: string | number, contact: string | number, message: string, ) {
    if (this.hubConnection) {
      this.hubConnection.send('sendStopMessageType', accountPhone, message, contact);
    }
  }

  messageStatus() {
    return new Observable((observer) => {
      this.hubConnection.on('MessageStatus', (message) => {
        try {
          observer.next(message);
        } catch (error) {
          observer.error(error);
        }
      });
    });
  }

  messageRead() {
    return new Observable((observer) => {
      this.hubConnection.on('MessageRead', (message) => {
        try {
          observer.next(message);
        } catch (error) {
          observer.error(error);
        }
      });
    });
  }

  MessageDelete() {
    return new Observable((observer) => {
      this.hubConnection.on('MessageDelete', (message) => {
        try {
          observer.next(message);
        } catch (error) {
          observer.error(error);
        }
      });
    });
  }

  contactRead() {
    return new Observable((observer) => {
      this.hubConnection.on('ContactMarkAsRead', (message) => {
        try {
          observer.next(message);
        } catch (error) {
          observer.error(error);
        }
      });
    });
  }

  contactTagged() {
    return new Observable((observer) => {
      this.hubConnection.on('ContactTag', (message) => {
        try {
          observer.next(message);
        } catch (error) {
          observer.error(error);
        }
      });
    });
  }

  contactUnTagged() {
    return new Observable((observer) => {
      this.hubConnection.on('ContactUntag', (message) => {
        try {
          observer.next(message);
        } catch (error) {
          observer.error(error);
        }
      });
    });
  }

  tagAdded() {
    return new Observable((observer) => {
      this.hubConnection.on('TagAdded', (message) => {
        try {
          observer.next(message);
        } catch (error) {
          observer.error(error);
        }
      });
    });
  }

  tagDeleted() {
    return new Observable((observer) => {
      this.hubConnection.on('TagDeleted', (message) => {
        try {
          observer.next(message);
        } catch (error) {
          observer.error(error);
        }
      });
    });
  }






}
