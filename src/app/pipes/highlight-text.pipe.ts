import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'highlightText'
})
export class HighlightTextPipe implements PipeTransform {

  transform(value: string, searchText: string): unknown {
    if (!searchText) { return value; }
    if (searchText[0] === '#') {
      const re = new RegExp(searchText.slice(1), 'gi');
      return value.replace(re, "<mark>$&</mark>");
    } else {
      const re = new RegExp(searchText, 'gi');
      return value.replace(re, "<mark>$&</mark>");
    }
  }

}
