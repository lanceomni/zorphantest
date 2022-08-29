import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeMode'
})
export class TimeModePipe implements PipeTransform {

  statusObj: any = {
    0: 'All Times',
    1: 'Office Hours',
    2: 'After Hours',
    3: 'Custom Time',
  };

  transform(value: any, ...args: any[]): any {
    if (value === null || value === undefined) {
      return `Unknown mode (${value})`;
    } else {
      const status = this.statusObj[value];
      if (status) {
        return status;
      } else {
        return `Unknown mode (${value})`;
      }
    }
  }

}
