import { Directive, TemplateRef, inject, input } from '@angular/core';

import { DataTableCellContext } from './data-table.types';

@Directive({
  selector: 'ng-template[appDataTableCell]',
})
export class DataTableCellDef<T = unknown> {
  readonly columnId = input.required<string>({ alias: 'appDataTableCell' });
  readonly template = inject(TemplateRef<DataTableCellContext<T>>);
}
