import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

type Student = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly cycle: string;
  readonly department: string;
  readonly group: string;
  readonly status: 'Active' | 'Pending' | 'Suspended';
  readonly variant: 'success' | 'warning' | 'error';
  readonly avatar: string;
};

@Component({
  selector: 'app-student-details-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div class="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
          <div class="flex items-start justify-between">
            <h2 class="text-xl font-semibold text-principalText">Student Details</h2>
            <button
              type="button"
              (click)="onClose()"
              class="text-secondaryText transition hover:text-principalText"
              aria-label="Close modal"
            >
              <i class="fa-solid fa-xmark text-lg" aria-hidden="true"></i>
            </button>
          </div>

          @if (student(); as s) {
            <div class="mt-6 space-y-4">
              <div class="flex items-center gap-3">
                <span
                  class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary"
                >
                  {{ s.avatar }}
                </span>
                <div>
                  <p class="font-semibold text-principalText">{{ s.name }}</p>
                  <p class="text-sm text-secondaryText">{{ s.email }}</p>
                </div>
              </div>

              <div class="space-y-2 border-t border-line pt-4">
                <div>
                  <span class="text-sm text-secondaryText">Student ID</span>
                  <p class="font-medium text-principalText">{{ s.id }}</p>
                </div>
                <div>
                  <span class="text-sm text-secondaryText">Cycle</span>
                  <p class="font-medium text-principalText">{{ s.cycle }}</p>
                </div>
                <div>
                  <span class="text-sm text-secondaryText">Department</span>
                  <p class="font-medium text-principalText">{{ s.department }}</p>
                </div>
                <div>
                  <span class="text-sm text-secondaryText">Group</span>
                  <p class="font-medium text-principalText">{{ s.group }}</p>
                </div>
                <div>
                  <span class="text-sm text-secondaryText">Status</span>
                  <p class="mt-1 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                    {{ s.status }}
                  </p>
                </div>
              </div>

              <div class="flex gap-2 border-t border-line pt-4">
                <button
                  type="button"
                  class="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-strong"
                >
                  Edit
                </button>
                <button
                  type="button"
                  (click)="onClose()"
                  class="flex-1 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-principalText transition hover:bg-surface-subtle"
                >
                  Close
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class StudentDetailsModal {
  readonly open = input<boolean>(false);
  readonly student = input<Student | null>(null);
  readonly closed = output<void>();

  onClose(): void {
    this.closed.emit();
  }
}
