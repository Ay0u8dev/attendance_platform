import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { IconButton } from '../../../shared/components/button/icon-button';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { Modal } from '../../../shared/components/modal/modal';
import { DropdownFilter, type DropdownOption } from '../../../shared/components/dropdown-filter/dropdown-filter';
import { StudentDetailsModal } from './components/student-details-modal';

type StudentStatus = 'Active' | 'Pending' | 'Suspended';
type StudentStatusVariant = 'success' | 'warning' | 'error';

type Student = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly cycle: string;
  readonly department: string;
  readonly group: string;
  readonly status: StudentStatus;
  readonly variant: StudentStatusVariant;
  readonly avatar: string;
};

@Component({
  selector: 'app-students-page',
  imports: [CommonModule, ReactiveFormsModule, IconButton, StatusBadge, StudentDetailsModal, Modal, DropdownFilter],
  template: `
    <section class="space-y-5">
      <!-- Filters card -->
      <div
        class="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card md:flex-row md:items-center md:justify-between"
      >
        <div class="relative flex-1">
          <i
            class="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden="true"
          ></i>
          <input
            type="search"
            [value]="searchQuery()"
            (input)="onSearch($event)"
            placeholder="Search students by name, email or ID..."
            aria-label="Search students"
            class="w-full rounded-xl border border-line bg-surface-subtle py-2.5 pl-11 pr-4 text-sm text-principalText placeholder:text-muted transition focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <app-dropdown-filter
            label="Cycle"
            identifier="cycle-filter"
            [options]="cycleOptions()"
            [value]="selectedCycle()"
            iconClass="fa-solid fa-graduation-cap"
            iconBackgroundClass="bg-blue-100"
            (filterChange)="onCycleFilterChange($event)"
          ></app-dropdown-filter>

          <app-dropdown-filter
            label="Group"
            identifier="group-filter"
            [options]="groupOptions()"
            [value]="selectedGroup()"
            iconClass="fa-solid fa-users"
            iconBackgroundClass="bg-purple-100"
            (filterChange)="onGroupFilterChange($event)"
          ></app-dropdown-filter>

          <app-dropdown-filter
            label="Status"
            identifier="status-filter"
            [options]="statusOptions()"
            [value]="selectedStatus()"
            iconClass="fa-solid fa-circle-exclamation"
            iconBackgroundClass="bg-yellow-100"
            (filterChange)="onStatusFilterChange($event)"
          ></app-dropdown-filter>
        </div>
      </div>

      <!-- Counter + actions -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-secondaryText">Showing {{ filteredStudents().length }} students</p>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-principalText transition-colors duration-200 hover:border-primary-soft hover:bg-primary-soft"
          >
            <i class="fa-regular fa-file-excel" aria-hidden="true"></i>
            Import Excel
          </button>
          <button
            type="button"
            (click)="openAddStudentModal()"
            class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-strong hover:shadow-card-strong"
          >
            <i class="fa-solid fa-plus" aria-hidden="true"></i>
            Add Student
          </button>
        </div>
      </div>

      <!-- Table card -->
      <article class="rounded-2xl border border-line bg-surface shadow-card">
        <div class="hidden overflow-hidden lg:block">
          <div
            class="grid grid-cols-[1.4fr_1.4fr_0.8fr_1fr_0.9fr_0.8fr_0.8fr] bg-surface-subtle px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted"
          >
            <span>Name</span>
            <span>Email</span>
            <span>Cycle</span>
            <span>Department</span>
            <span>Group</span>
            <span>Status</span>
            <span class="text-right">Actions</span>
          </div>

          @for (student of pagedStudents(); track student.id) {
            <div
              class="grid grid-cols-[1.4fr_1.4fr_0.8fr_1fr_0.9fr_0.8fr_0.8fr] items-center border-t border-line px-6 py-4 text-sm"
            >
              <div class="flex min-w-0 items-center gap-3">
                <span
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary"
                  aria-hidden="true"
                >
                  {{ student.avatar }}
                </span>
                <span class="truncate font-medium text-principalText">{{ student.name }}</span>
              </div>
              <span class="truncate text-secondaryText">{{ student.email }}</span>
              <span class="text-principalText">{{ student.cycle }}</span>
              <span class="text-principalText">{{ student.department }}</span>
              <span class="text-principalText">{{ student.group }}</span>
              <div>
                <app-status-badge
                  [label]="student.status"
                  [variant]="student.variant"
                ></app-status-badge>
              </div>
              <div class="flex justify-end gap-1.5">
                <app-icon-button
                  icon="fa-regular fa-eye"
                  [label]="'Voir ' + student.name"
                  tone="secondary"
                  size="sm"
                  (click)="openDetails(student)"
                ></app-icon-button>
                <app-icon-button
                  icon="fa-regular fa-pen-to-square"
                  [label]="'Éditer ' + student.name"
                  tone="primary"
                  size="sm"
                ></app-icon-button>
                <app-icon-button
                  icon="fa-regular fa-trash-can"
                  [label]="'Supprimer ' + student.name"
                  tone="danger"
                  size="sm"
                ></app-icon-button>
              </div>
            </div>
          }
        </div>

        <!-- Mobile / tablet stacked list -->
        <div class="space-y-3 p-4 lg:hidden">
          @for (student of pagedStudents(); track student.id) {
            <div class="rounded-xl border border-line p-4">
              <div class="flex items-start justify-between gap-3">
                <div class="flex min-w-0 items-center gap-3">
                  <span
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary"
                  >
                    {{ student.avatar }}
                  </span>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold text-principalText">
                      {{ student.name }}
                    </p>
                    <p class="truncate text-xs text-secondaryText">{{ student.email }}</p>
                  </div>
                </div>
                <app-status-badge
                  [label]="student.status"
                  [variant]="student.variant"
                ></app-status-badge>
              </div>
              <dl class="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <dt class="text-muted">Cycle</dt>
                  <dd class="text-principalText">{{ student.cycle }}</dd>
                </div>
                <div>
                  <dt class="text-muted">Dept.</dt>
                  <dd class="text-principalText">{{ student.department }}</dd>
                </div>
                <div>
                  <dt class="text-muted">Group</dt>
                  <dd class="text-principalText">{{ student.group }}</dd>
                </div>
              </dl>
            </div>
          }
        </div>

        <!-- Pagination -->
        <div
          class="flex flex-col gap-3 border-t border-line bg-surface-subtle/50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
          <p class="text-sm text-secondaryText">
            Showing {{ pageStart() }}-{{ pageEnd() }} of {{ filteredStudents().length }} students
          </p>

          <nav class="flex items-center gap-1" aria-label="Pagination">
            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-secondaryText transition-colors duration-200 hover:border-primary-soft hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface disabled:hover:text-secondaryText"
              [disabled]="page() === 1"
              (click)="prevPage()"
              aria-label="Previous page"
            >
              <i class="fa-solid fa-chevron-left text-xs" aria-hidden="true"></i>
            </button>

            @for (p of pages(); track p) {
              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition-colors duration-200"
                [class.bg-primary]="p === page()"
                [class.text-white]="p === page()"
                [class.shadow-card]="p === page()"
                [class.text-secondaryText]="p !== page()"
                [class.hover:bg-surface-subtle]="p !== page()"
                [class.hover:text-principalText]="p !== page()"
                (click)="goTo(p)"
                [attr.aria-current]="p === page() ? 'page' : null"
              >
                {{ p }}
              </button>
            }

            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-secondaryText transition-colors duration-200 hover:border-primary-soft hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface disabled:hover:text-secondaryText"
              [disabled]="page() === totalPages()"
              (click)="nextPage()"
              aria-label="Next page"
            >
              <i class="fa-solid fa-chevron-right text-xs" aria-hidden="true"></i>
            </button>
          </nav>
        </div>
      </article>
    </section>

    <!-- Add Student Modal -->
    <app-modal
      [open]="addStudentOpen()"
      title="Add New Student"
      description="Fill in the student information below"
      size="md"
      (closed)="closeAddStudentModal()"
    >
      <div modal-body class="space-y-4">
        <form [formGroup]="addStudentForm" class="space-y-4">
          <div class="space-y-1">
            <label for="name" class="text-sm font-medium text-principalText">Name *</label>
            <input
              id="name"
              type="text"
              formControlName="name"
              placeholder="Enter student name"
              class="w-full rounded-lg border border-line bg-surface-subtle px-4 py-2.5 text-sm text-principalText placeholder:text-muted transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div class="space-y-1">
            <label for="email" class="text-sm font-medium text-principalText">Email *</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              placeholder="Enter student email"
              class="w-full rounded-lg border border-line bg-surface-subtle px-4 py-2.5 text-sm text-principalText placeholder:text-muted transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label for="cycle" class="text-sm font-medium text-principalText">Cycle *</label>
              <select
                id="cycle"
                formControlName="cycle"
                class="w-full rounded-lg border border-line bg-surface-subtle px-4 py-2.5 text-sm text-principalText transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select Cycle</option>
                <option value="Bachelor">Bachelor</option>
                <option value="Master">Master</option>
                <option value="PhD">PhD</option>
              </select>
            </div>

            <div class="space-y-1">
              <label for="department" class="text-sm font-medium text-principalText">Department *</label>
              <select
                id="department"
                formControlName="department"
                class="w-full rounded-lg border border-line bg-surface-subtle px-4 py-2.5 text-sm text-principalText transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select Department</option>
                <option value="Comp. Science">Comp. Science</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Physics">Physics</option>
                <option value="Engineering">Engineering</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label for="group" class="text-sm font-medium text-principalText">Group *</label>
              <input
                id="group"
                type="text"
                formControlName="group"
                placeholder="e.g., CS-2024-A"
                class="w-full rounded-lg border border-line bg-surface-subtle px-4 py-2.5 text-sm text-principalText placeholder:text-muted transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div class="space-y-1">
              <label for="status" class="text-sm font-medium text-principalText">Status *</label>
              <select
                id="status"
                formControlName="status"
                class="w-full rounded-lg border border-line bg-surface-subtle px-4 py-2.5 text-sm text-principalText transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select Status</option>
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
          </div>
        </form>
      </div>

      <div modal-footer class="flex gap-2">
        <button
          type="button"
          (click)="closeAddStudentModal()"
          class="flex-1 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-principalText transition hover:bg-surface-subtle"
        >
          Cancel
        </button>
        <button
          type="button"
          (click)="submitAddStudent()"
          [disabled]="!addStudentForm.valid"
          class="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Student
        </button>
      </div>
    </app-modal>

    <app-student-details-modal
      [open]="detailsOpen()"
      [student]="selectedStudent()"
      (closed)="closeDetails()"
    ></app-student-details-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentsPage {
  readonly searchQuery = signal('');
  readonly page = signal(1);
  readonly pageSize = 5;

  readonly detailsOpen = signal(false);
  readonly selectedStudent = signal<Student | null>(null);

  readonly addStudentOpen = signal(false);
  readonly addStudentForm: FormGroup;

  // Filter signals
  readonly selectedCycle = signal('');
  readonly selectedGroup = signal('');
  readonly selectedStatus = signal('');

  // Data arrays
  private students = signal<Student[]>(this.buildSampleStudents());
  private allCycles = ['Bachelor', 'Master', 'PhD'];
  private allDepartments = ['Comp. Science', 'Mathematics', 'Physics', 'Engineering'];
  private allGroups = ['CS-2024-A', 'CS-2024-B', 'MATH-102', 'PHY-04', 'CS-PHD-1', 'ENG-001'];
  private allStatuses = ['Active', 'Pending', 'Suspended'];

  // Dropdown options
  readonly cycleOptions = computed(() =>
    this.allCycles.map((cycle) => ({ value: cycle, label: cycle })),
  );

  readonly groupOptions = computed(() =>
    this.allGroups.map((group) => ({ value: group, label: group })),
  );

  readonly statusOptions = computed(() =>
    this.allStatuses.map((status) => ({
      value: status,
      label: status,
    })),
  );

  readonly filteredStudents = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const cycle = this.selectedCycle();
    const group = this.selectedGroup();
    const status = this.selectedStatus();

    return this.students().filter((student) => {
      // Text search filter
      const matchesQuery =
        !query ||
        [student.name, student.email, student.id, student.group, student.department].some((field) =>
          field.toLowerCase().includes(query),
        );

      // Cycle filter
      const matchesCycle = !cycle || student.cycle === cycle;

      // Group filter
      const matchesGroup = !group || student.group === group;

      // Status filter
      const matchesStatus = !status || student.status === status;

      return matchesQuery && matchesCycle && matchesGroup && matchesStatus;
    });
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredStudents().length / this.pageSize)),
  );

  readonly pages = computed(() => {
    const total = this.totalPages();
    const limit = Math.min(total, 5);
    return Array.from({ length: limit }, (_, index) => index + 1);
  });

  readonly pagedStudents = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredStudents().slice(start, start + this.pageSize);
  });

  readonly pageStart = computed(() => {
    if (this.filteredStudents().length === 0) return 0;
    return (this.page() - 1) * this.pageSize + 1;
  });

  readonly pageEnd = computed(() =>
    Math.min(this.page() * this.pageSize, this.filteredStudents().length),
  );

  readonly filters = computed(() => [
    { key: 'cycle', label: 'Cycle', value: this.selectedCycle() || 'All' },
    { key: 'group', label: 'Group', value: this.selectedGroup() || 'All' },
    { key: 'status', label: 'Status', value: this.selectedStatus() || 'All' },
  ]);

  constructor(private fb: FormBuilder) {
    this.addStudentForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      cycle: ['', [Validators.required]],
      department: ['', [Validators.required]],
      group: ['', [Validators.required]],
      status: ['Active', [Validators.required]],
    });
  }

  onCycleFilterChange(value: string | null): void {
    this.selectedCycle.set(value || '');
    this.page.set(1);
  }

  onGroupFilterChange(value: string | null): void {
    this.selectedGroup.set(value || '');
    this.page.set(1);
  }

  onStatusFilterChange(value: string | null): void {
    this.selectedStatus.set(value || '');
    this.page.set(1);
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
    this.page.set(1);
  }

  openAddStudentModal(): void {
    this.addStudentForm.reset({ status: 'Active' });
    this.addStudentOpen.set(true);
  }

  closeAddStudentModal(): void {
    this.addStudentOpen.set(false);
    this.addStudentForm.reset();
  }

  submitAddStudent(): void {
    if (this.addStudentForm.valid) {
      const formValue = this.addStudentForm.value;
      const newStudent: Student = {
        id: `STD-${1000 + this.students().length}`,
        name: formValue.name,
        email: formValue.email,
        cycle: formValue.cycle,
        department: formValue.department,
        group: formValue.group,
        status: formValue.status as StudentStatus,
        variant: this.getStatusVariant(formValue.status),
        avatar: this.initials(formValue.name),
      };

      this.students.update((students) => [...students, newStudent]);
      this.closeAddStudentModal();
      this.page.set(1);
    }
  }

  goTo(page: number): void {
    this.page.set(page);
  }

  prevPage(): void {
    this.page.update((current) => Math.max(1, current - 1));
  }

  nextPage(): void {
    this.page.update((current) => Math.min(this.totalPages(), current + 1));
  }

  openDetails(student: Student): void {
    this.selectedStudent.set(student);
    this.detailsOpen.set(true);
  }

  closeDetails(): void {
    this.detailsOpen.set(false);
  }

  private getStatusVariant(status: string): StudentStatusVariant {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Pending':
        return 'warning';
      case 'Suspended':
        return 'error';
      default:
        return 'success';
    }
  }

  private buildSampleStudents(): Student[] {
    const seeds: Array<Omit<Student, 'avatar' | 'id'>> = [
      {
        name: 'Alex Johnson',
        email: 'alex.j@university.edu',
        cycle: 'Bachelor',
        department: 'Comp. Science',
        group: 'CS-2024-A',
        status: 'Active',
        variant: 'success',
      },
      {
        name: 'Maria Garcia',
        email: 'm.garcia@university.edu',
        cycle: 'Master',
        department: 'Mathematics',
        group: 'MATH-102',
        status: 'Pending',
        variant: 'warning',
      },
      {
        name: 'Liam Wilson',
        email: 'l.wilson@university.edu',
        cycle: 'Bachelor',
        department: 'Physics',
        group: 'PHY-04',
        status: 'Suspended',
        variant: 'error',
      },
      {
        name: 'Sarah Chen',
        email: 's.chen@university.edu',
        cycle: 'PhD',
        department: 'Comp. Science',
        group: 'CS-PHD-1',
        status: 'Active',
        variant: 'success',
      },
      {
        name: 'James Smith',
        email: 'j.smith@university.edu',
        cycle: 'Bachelor',
        department: 'Mathematics',
        group: 'MATH-102',
        status: 'Active',
        variant: 'success',
      },
      {
        name: 'Emma Davis',
        email: 'e.davis@university.edu',
        cycle: 'Master',
        department: 'Engineering',
        group: 'ENG-001',
        status: 'Active',
        variant: 'success',
      },
      {
        name: 'Oliver Brown',
        email: 'o.brown@university.edu',
        cycle: 'Bachelor',
        department: 'Comp. Science',
        group: 'CS-2024-B',
        status: 'Pending',
        variant: 'warning',
      },
    ];

    return seeds.map((seed, index) => ({
      ...seed,
      id: `STD-${1000 + index}`,
      avatar: this.initials(seed.name),
    }));
  }

  private initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}
