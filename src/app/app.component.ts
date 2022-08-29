import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { environment } from 'src/environments/environment';
environment
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = environment.appName;
  constructor(
    private titleService: Title,
  ) {
    this.titleService.setTitle(environment.appName);
  }
}
