import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  imports: [],
  template: `<p>dashboard works!</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard { }
