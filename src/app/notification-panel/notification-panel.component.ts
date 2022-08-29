import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { LoggerService } from '../logger.service';
import { MessagesService } from '../messages/messages.service';

@Component({
  selector: 'app-notification-panel',
  templateUrl: './notification-panel.component.html',
  styleUrls: ['./notification-panel.component.scss']
})
export class NotificationPanelComponent implements OnInit {
  messagePage = {
    start: 0,
    limit: 30,
    search: '',
    sort: 'createdDate',
    sortDirection: 'asc'
  };

  constructor(
    public dialogRef: MatDialogRef<NotificationPanelComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private logger: LoggerService,
    private messagesService: MessagesService
  ) { }

  ngOnInit(): void {
    for (const notification of this.data.notifications) {
      notification.senderName = this.getSenderDetails(notification.sender);
    }
  }

  showReply(notification: any) {
    notification.reply = '';
    notification.showReply = true;
  }

  sendReply(notification: any) {
    if (notification.reply) {
      const msgBody = {
        MessageBody: notification.reply,
        ScheduledDate: new Date().toISOString(),
        Attachments: []
      }
      this.messagesService.sendMessage2(notification.sender, notification.message.phoneNumber, [], msgBody, [], []).subscribe({
        next: (res) => {
          this.removeNotificaiton(notification);
        },
        error: (err) => {
          this.logger.log(err);
        }
      })
    }
  }

  markAsRead(notification: any) {
    this.messagesService.markMessage(notification.sender, notification.message.phoneNumber, notification.message.messageId, true).subscribe({
      next: (res) => {
        this.removeNotificaiton(notification);
      },
      error: (err) => {
        this.logger.log(err);
      }
    })
  }

  removeNotificaiton(notification: any) {
    const idx = this.data.notifications.findIndex((eachNotification: any) => eachNotification.message.contactId === notification.message.contactId);
    if (idx > -1) {
      this.data.notifications.splice(idx, 1);
    }
  }

  viewConversation(notification: any) {
    this.messagesService.getMessagePosition(notification.sender, notification.message.phoneNumber, notification.message.messageId, this.messagePage).subscribe({
      next: (res) => {
        this.removeNotificaiton(notification);
        this.dialogRef.close({action: 'viewConversation', notification, position: res});
      },
      error: (err) => {
        this.logger.log(err);
      }
    })
  }

  getSenderDetails(phoneNumber: string) {
    if (!this.data.accountPhones || !this.data.accountPhones.length || !phoneNumber) {
      return '';
    }
    const match = this.data.accountPhones.find((eachAccount: any) => eachAccount.accountPhone === phoneNumber);
    if (match) {
      return match.accountPhoneName || '';
    } else {
      return '';
    }
  }

}
