import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import {
  JustificationDto,
  JustificationStatus,
} from '../../../core/justifications/justification.model';
import { JustificationService } from '../../../core/justifications/justification.service';
import { initials } from '../../../core/admin/models/admin-user.model';
import { Button } from '../../../shared/components/button/button';
import { DropdownFilter } from '../../../shared/components/dropdown-filter/dropdown-filter';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { ToastService } from '../../../shared/components/toast/toast.service';

type TabKey = 'ALL' | JustificationStatus;
type FilterKey = 'module' | 'group' | 'search';
type Option = { readonly value: string; readonly label: string };

@Component({
  selector: 'app-justifications-page',
  imports: [Button, DropdownFilter, PageHeader, StatusBadge],
  template: `
    <section class="space-y-6">
      <app-page-header
        title="Justifications"
        description="Review absence justifications, inspect the related session, and keep admin decisions traceable."
        [meta]="pendingCount() + ' pending'"
      ></app-page-header>

      <div class="grid gap-3 md:grid-cols-4">
        @for (metric of metrics(); track metric.label) {
          <article class="rounded-2xl border border-line bg-surface p-4 shadow-card">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              {{ metric.label }}
            </p>
            <p class="mt-2 text-2xl font-semibold text-principalText">{{ metric.value }}</p>
            <p class="mt-1 text-sm text-secondaryText">{{ metric.caption }}</p>
          </article>
        }
      </div>

      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          class="inline-flex w-fit flex-wrap items-center gap-1 rounded-2xl border border-line bg-surface p-1 shadow-card"
          role="tablist"
          aria-label="Justification status"
        >
          @for (tab of tabs; track tab.key) {
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="activeTab() === tab.key"
              class="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
              [class.bg-primary]="activeTab() === tab.key"
              [class.text-white]="activeTab() === tab.key"
              [class.text-secondaryText]="activeTab() !== tab.key"
              [class.hover:bg-surface-subtle]="activeTab() !== tab.key"
              (click)="setTab(tab.key)"
            >
              {{ tab.label }}
              <span
                class="inline-flex min-w-7 justify-center rounded-full px-2 py-0.5 text-xs"
                [class.bg-white/20]="activeTab() === tab.key"
                [class.text-white]="activeTab() === tab.key"
                [class.bg-surface-subtle]="activeTab() !== tab.key"
                [class.text-secondaryText]="activeTab() !== tab.key"
              >
                {{ countFor(tab.key) }}
              </span>
            </button>
          }
        </div>

        <app-button
          label="Refresh"
          icon="fa-solid fa-rotate"
          variant="outline"
          [fullWidth]="false"
          [loading]="isLoading()"
          (clicked)="loadJustifications()"
        ></app-button>
      </div>

      <div class="grid gap-3 rounded-3xl border border-line bg-surface p-4 shadow-card lg:grid-cols-3">
        <app-dropdown-filter
          label="Module"
          identifier="admin-justification-module"
          allLabel="All modules"
          [options]="moduleOptions()"
          [value]="dropdownValue(moduleFilter())"
          iconClass="fa-regular fa-folder"
          iconBackgroundClass="bg-primary-soft"
          (filterChange)="selectFilter('module', $event)"
        ></app-dropdown-filter>

        <app-dropdown-filter
          label="Group"
          identifier="admin-justification-group"
          allLabel="All groups"
          [options]="groupOptions()"
          [value]="dropdownValue(groupFilter())"
          iconClass="fa-solid fa-users"
          iconBackgroundClass="bg-warning-soft"
          iconColor="warning"
          (filterChange)="selectFilter('group', $event)"
        ></app-dropdown-filter>

        <label class="block text-sm font-semibold text-principalText">
          <span class="mb-2 flex items-center gap-2">
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-secondary-soft text-secondary"
            >
              <i class="fa-solid fa-magnifying-glass text-sm" aria-hidden="true"></i>
            </span>
            Search
          </span>
          <input
            type="search"
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
            placeholder="Student, Apogee, module, teacher..."
            class="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm font-medium text-principalText shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
        </label>
      </div>

      @if (hasActiveFilters()) {
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="font-semibold uppercase tracking-[0.16em] text-muted">Active filters</span>
          @for (chip of activeFilterChips(); track chip.key) {
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-full border border-primary-soft bg-primary-soft px-3 py-1 font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
              (click)="clearFilter(chip.key)"
            >
              {{ chip.label }}: {{ chip.value }}
              <i class="fa-solid fa-xmark text-[0.65rem]" aria-hidden="true"></i>
            </button>
          }
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 font-semibold text-secondaryText transition-colors hover:border-danger-soft hover:text-danger"
            (click)="resetFilters()"
          >
            Reset
          </button>
        </div>
      }

      @if (errorMessage()) {
        <div class="rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {{ errorMessage() }}
        </div>
      }

      <div class="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(23rem,0.75fr)]">
        <section class="rounded-3xl border border-line bg-surface shadow-card">
          <div class="border-b border-line px-5 py-4 sm:px-6">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 class="text-xl font-semibold text-principalText">Requests</h2>
                <p class="mt-1 text-sm text-secondaryText">
                  {{ visibleJustifications().length }} request(s) matching the current view.
                </p>
              </div>
              @if (isLoading()) {
                <span class="text-sm font-medium text-secondaryText">Loading...</span>
              }
            </div>
          </div>

          <div class="divide-y divide-line">
            @if (visibleJustifications().length > 0) {
              @for (item of visibleJustifications(); track item.id) {
                <article
                  class="px-5 py-4 transition-colors hover:bg-surface-subtle sm:px-6"
                  [class.bg-primary-soft]="selectedId() === item.id"
                >
                  <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <button
                      type="button"
                      class="flex min-w-0 flex-1 items-center gap-3 text-left"
                      (click)="select(item)"
                    >
                      <span
                        class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-sm font-semibold text-primary"
                        aria-hidden="true"
                      >
                        {{ avatar(item) }}
                      </span>
                      <span class="min-w-0">
                        <span class="block truncate font-semibold text-principalText">
                          {{ studentName(item) }}
                        </span>
                        <span class="mt-1 block truncate text-sm text-secondaryText">
                          {{ item.courseLabel }} - {{ groupLabel(item.groupId) }}
                        </span>
                        <span class="mt-0.5 block truncate text-xs text-muted">
                          Apogee {{ item.studentCode || '-' }} - {{ formatDateTime(item.absenceStartedAt) }}
                        </span>
                      </span>
                    </button>

                    <div class="flex flex-wrap items-center justify-end gap-2">
                      <app-status-badge
                        [label]="statusLabel(item.status)"
                        [variant]="statusVariant(item.status)"
                      ></app-status-badge>

                      <button
                        type="button"
                        class="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold text-principalText transition-colors hover:border-primary-soft hover:bg-primary-soft"
                        (click)="select(item)"
                      >
                        Details
                        <i class="fa-regular fa-eye text-xs" aria-hidden="true"></i>
                      </button>

                      <button
                        type="button"
                        class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-secondaryText transition-colors hover:border-danger-soft hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                        [disabled]="item.status !== 'PENDING' || savingReviewId() === item.id"
                        (click)="review(item.id, 'REJECTED')"
                        [attr.aria-label]="'Reject request for ' + studentName(item)"
                      >
                        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                      </button>

                      <button
                        type="button"
                        class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-white shadow-card transition-all hover:-translate-y-0.5 hover:bg-secondary-strong hover:shadow-card-strong disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                        [disabled]="item.status !== 'PENDING' || savingReviewId() === item.id"
                        (click)="review(item.id, 'APPROVED')"
                        [attr.aria-label]="'Approve request for ' + studentName(item)"
                      >
                        <i class="fa-solid fa-check" aria-hidden="true"></i>
                      </button>
                    </div>
                  </div>
                </article>
              }
            } @else {
              <div class="px-5 py-16 text-center sm:px-6">
                <p class="text-base font-semibold text-principalText">No justification requests found</p>
                <p class="mt-1 text-sm text-secondaryText">
                  Adjust filters or make sure absent records exist in attendance-service.
                </p>
              </div>
            }
          </div>
        </section>

        <aside class="rounded-3xl border border-line bg-surface shadow-card">
          @if (selected(); as detail) {
            <div class="border-b border-line px-5 py-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    Request #{{ detail.id }}
                  </p>
                  <h2 class="mt-1 text-xl font-semibold text-principalText">
                    {{ studentName(detail) }}
                  </h2>
                </div>
                <app-status-badge
                  [label]="statusLabel(detail.status)"
                  [variant]="statusVariant(detail.status)"
                ></app-status-badge>
              </div>
            </div>

            <div class="space-y-5 px-5 py-5">
              <div class="flex items-center gap-3">
                <span
                  class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-lg font-semibold text-primary"
                  aria-hidden="true"
                >
                  {{ avatar(detail) }}
                </span>
                <div class="min-w-0">
                  <p class="truncate font-semibold text-principalText">
                    {{ detail.studentEmail || 'Email not provided' }}
                  </p>
                  <p class="mt-1 text-sm text-secondaryText">
                    Apogee {{ detail.studentCode || '-' }} - {{ groupLabel(detail.groupId) }}
                  </p>
                </div>
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <div class="rounded-2xl border border-line p-3">
                  <p class="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">
                    Module
                  </p>
                  <p class="mt-1 text-sm font-semibold text-principalText">{{ detail.courseLabel }}</p>
                </div>
                <div class="rounded-2xl border border-line p-3">
                  <p class="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">
                    Teacher
                  </p>
                  <p class="mt-1 text-sm font-semibold text-principalText">
                    {{ detail.teacherName || 'Not provided' }}
                  </p>
                </div>
                <div class="rounded-2xl border border-line p-3">
                  <p class="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">
                    Absence start
                  </p>
                  <p class="mt-1 text-sm font-semibold text-principalText">
                    {{ formatDateTime(detail.absenceStartedAt) }}
                  </p>
                </div>
                <div class="rounded-2xl border border-line p-3">
                  <p class="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">
                    Duration
                  </p>
                  <p class="mt-1 text-sm font-semibold text-principalText">
                    {{ durationLabel(detail) }}
                  </p>
                </div>
              </div>

              <section class="rounded-2xl border border-line p-4">
                <p class="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">
                  Student motive
                </p>
                <p class="mt-2 text-sm leading-6 text-principalText">
                  {{ detail.reason || 'No reason provided' }}
                </p>
              </section>

              <section class="rounded-2xl border border-line p-4">
                <p class="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">
                  Attachment
                </p>
                <div class="mt-3 flex items-center gap-3 rounded-2xl bg-surface-subtle p-3">
                  <span
                    class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary-soft text-secondary"
                    aria-hidden="true"
                  >
                    <i class="fa-regular fa-file-lines"></i>
                  </span>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold text-principalText">
                      {{ attachmentName(detail.attachmentUrl) }}
                    </p>
                    <p class="text-xs text-secondaryText">
                      {{ detail.attachmentUrl ? 'Student-provided attachment' : 'No attachment provided' }}
                    </p>
                  </div>
                </div>
              </section>

              <section class="rounded-2xl border border-line p-4">
                <label class="block">
                  <span class="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">
                    Admin comment
                  </span>
                  <textarea
                    rows="3"
                    [value]="reviewComment()"
                    [disabled]="detail.status !== 'PENDING' || savingReviewId() === detail.id"
                    (input)="onReviewCommentInput($event)"
                    placeholder="Add a short trace for the decision..."
                    class="mt-2 w-full resize-none rounded-xl border border-line bg-surface-subtle px-3 py-2.5 text-sm leading-6 text-principalText outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft disabled:cursor-not-allowed disabled:text-muted"
                  ></textarea>
                </label>
                @if (detail.decidedAt) {
                  <p class="mt-2 text-xs text-secondaryText">
                    Reviewed {{ formatDateTime(detail.decidedAt) }}
                    @if (detail.decidedBy) {
                      <span> by {{ detail.decidedByRole || 'reviewer' }} #{{ detail.decidedBy }}</span>
                    }
                  </p>
                }
              </section>

              <div class="grid grid-cols-2 gap-3">
                <app-button
                  label="Reject"
                  variant="outline"
                  [disabled]="detail.status !== 'PENDING' || savingReviewId() === detail.id"
                  [loading]="savingReviewId() === detail.id"
                  (clicked)="review(detail.id, 'REJECTED')"
                ></app-button>
                <app-button
                  label="Approve"
                  [disabled]="detail.status !== 'PENDING' || savingReviewId() === detail.id"
                  [loading]="savingReviewId() === detail.id"
                  (clicked)="review(detail.id, 'APPROVED')"
                ></app-button>
              </div>
            </div>
          } @else {
            <div class="flex min-h-[32rem] items-center justify-center px-6 text-center">
              <div>
                <span
                  class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary"
                >
                  <i class="fa-regular fa-file-lines" aria-hidden="true"></i>
                </span>
                <p class="mt-4 text-base font-semibold text-principalText">
                  Select a request
                </p>
                <p class="mt-1 text-sm leading-6 text-secondaryText">
                  Open a row to inspect the absence, student motive, attachment label, and review state.
                </p>
              </div>
            </div>
          }
        </aside>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JustificationsPage {
  private readonly justificationService = inject(JustificationService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly tabs: ReadonlyArray<{ readonly key: TabKey; readonly label: string }> = [
    { key: 'ALL', label: 'All' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'REJECTED', label: 'Rejected' },
  ];

  readonly justifications = signal<readonly JustificationDto[]>([]);
  readonly activeTab = signal<TabKey>('ALL');
  readonly moduleFilter = signal('all');
  readonly groupFilter = signal('all');
  readonly searchQuery = signal('');
  readonly selectedId = signal<number | null>(null);
  readonly reviewComment = signal('');
  readonly isLoading = signal(false);
  readonly savingReviewId = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly metrics = computed(() => [
    {
      label: 'Total',
      value: this.justifications().length,
      caption: 'requests in database',
    },
    {
      label: 'Pending',
      value: this.countFor('PENDING'),
      caption: 'waiting for admin review',
    },
    {
      label: 'Approved',
      value: this.countFor('APPROVED'),
      caption: 'accepted absences',
    },
    {
      label: 'Rejected',
      value: this.countFor('REJECTED'),
      caption: 'refused requests',
    },
  ]);

  readonly moduleOptions = computed<Option[]>(() => {
    const labels = new Set(this.justifications().map((item) => item.courseLabel).filter(Boolean));
    return Array.from(labels)
      .sort((a, b) => a.localeCompare(b))
      .map((label) => ({ value: label, label }));
  });

  readonly groupOptions = computed<Option[]>(() => {
    const groupIds = new Set(
      this.justifications()
        .map((item) => item.groupId)
        .filter((id): id is number => id !== null),
    );
    return Array.from(groupIds)
      .sort((a, b) => a - b)
      .map((id) => ({ value: String(id), label: this.groupLabel(id) }));
  });

  readonly visibleJustifications = computed(() => {
    const tab = this.activeTab();
    const moduleValue = this.moduleFilter();
    const groupValue = this.groupFilter();
    const search = this.searchQuery().trim().toLowerCase();

    return this.justifications().filter((item) => {
      if (tab !== 'ALL' && item.status !== tab) {
        return false;
      }
      if (moduleValue !== 'all' && item.courseLabel !== moduleValue) {
        return false;
      }
      if (groupValue !== 'all' && String(item.groupId) !== groupValue) {
        return false;
      }
      if (!search) {
        return true;
      }

      return this.searchText(item).includes(search);
    });
  });

  readonly pendingCount = computed(() => this.countFor('PENDING'));

  readonly selected = computed<JustificationDto | null>(() => {
    const id = this.selectedId();
    if (!id) {
      return null;
    }

    return this.justifications().find((item) => item.id === id) ?? null;
  });

  readonly hasActiveFilters = computed(
    () =>
      this.moduleFilter() !== 'all' ||
      this.groupFilter() !== 'all' ||
      this.searchQuery().trim() !== '',
  );

  readonly activeFilterChips = computed(() => {
    const chips: Array<{ key: FilterKey; label: string; value: string }> = [];
    if (this.moduleFilter() !== 'all') {
      chips.push({ key: 'module', label: 'Module', value: this.moduleFilter() });
    }
    if (this.groupFilter() !== 'all') {
      chips.push({ key: 'group', label: 'Group', value: this.groupLabel(Number(this.groupFilter())) });
    }
    if (this.searchQuery().trim()) {
      chips.push({ key: 'search', label: 'Search', value: this.searchQuery().trim() });
    }
    return chips;
  });

  constructor() {
    this.loadJustifications();
  }

  loadJustifications(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.justificationService
      .getAdminJustifications()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (items) => {
          this.justifications.set(items);
          const selectedId = this.selectedId();
          const selectedStillExists = selectedId
            ? items.some((item) => item.id === selectedId)
            : false;

          if (!selectedStillExists) {
            const firstItem = items[0] ?? null;
            this.selectedId.set(firstItem?.id ?? null);
            this.reviewComment.set(firstItem?.decisionComment ?? '');
          }
        },
        error: () => {
          this.errorMessage.set('Unable to load justifications from justification-service.');
        },
      });
  }

  setTab(tab: TabKey): void {
    this.activeTab.set(tab);
  }

  countFor(tab: TabKey): number {
    const items = this.justifications();
    if (tab === 'ALL') {
      return items.length;
    }

    return items.filter((item) => item.status === tab).length;
  }

  selectFilter(key: 'module' | 'group', value: string | null): void {
    const nextValue = value ?? 'all';
    if (key === 'module') {
      this.moduleFilter.set(nextValue);
    }
    if (key === 'group') {
      this.groupFilter.set(nextValue);
    }
  }

  clearFilter(key: FilterKey): void {
    if (key === 'module') {
      this.moduleFilter.set('all');
    }
    if (key === 'group') {
      this.groupFilter.set('all');
    }
    if (key === 'search') {
      this.searchQuery.set('');
    }
  }

  resetFilters(): void {
    this.moduleFilter.set('all');
    this.groupFilter.set('all');
    this.searchQuery.set('');
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  onReviewCommentInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.reviewComment.set(target.value);
  }

  select(item: JustificationDto): void {
    this.selectedId.set(item.id);
    this.reviewComment.set(item.decisionComment ?? '');
  }

  review(id: number, status: Exclude<JustificationStatus, 'PENDING'>): void {
    const item = this.justifications().find((candidate) => candidate.id === id);
    if (!item || item.status !== 'PENDING' || this.savingReviewId()) {
      return;
    }

    const decisionComment = id === this.selectedId() ? this.reviewComment().trim() : '';
    this.savingReviewId.set(id);

    this.justificationService
      .decide(id, { status, comment: decisionComment || null })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.savingReviewId.set(null)),
      )
      .subscribe({
        next: (updated) => {
          this.justifications.update((items) =>
            items.map((candidate) => (candidate.id === updated.id ? updated : candidate)),
          );
          this.selectedId.set(updated.id);
          this.reviewComment.set(updated.decisionComment ?? '');
          this.toast.success(status === 'APPROVED' ? 'Justification approved' : 'Justification rejected');
        },
        error: () => {
          this.toast.error('Review failed', 'Check your admin session and backend logs.');
        },
      });
  }

  dropdownValue(value: string): string | null {
    return value === 'all' ? null : value;
  }

  studentName(item: JustificationDto): string {
    return item.studentName || item.studentEmail || `Student #${item.studentId}`;
  }

  avatar(item: JustificationDto): string {
    return initials(this.studentName(item));
  }

  groupLabel(groupId: number | null): string {
    return groupId ? `Group #${groupId}` : 'Group not provided';
  }

  statusLabel(status: JustificationStatus): string {
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
    }
  }

  statusVariant(status: JustificationStatus): 'success' | 'warning' | 'error' {
    switch (status) {
      case 'PENDING':
        return 'warning';
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'error';
    }
  }

  formatDateTime(value: string | null): string {
    if (!value) {
      return 'Not provided';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed);
  }

  durationLabel(item: JustificationDto): string {
    if (!item.absenceEndedAt) {
      return 'Open session';
    }

    const start = new Date(item.absenceStartedAt).getTime();
    const end = new Date(item.absenceEndedAt).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      return 'Not available';
    }

    const totalMinutes = Math.round((end - start) / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) {
      return `${minutes} min`;
    }
    if (minutes === 0) {
      return `${hours} h`;
    }
    return `${hours} h ${minutes} min`;
  }

  attachmentName(url: string | null): string {
    if (!url) {
      return 'No attachment';
    }

    const cleanUrl = url.split('?')[0].split('#')[0];
    return decodeURIComponent(cleanUrl.split('/').pop() || 'Attachment');
  }

  private searchText(item: JustificationDto): string {
    return [
      this.studentName(item),
      item.studentEmail,
      item.studentCode,
      item.courseLabel,
      item.roomLabel,
      item.teacherName,
      this.groupLabel(item.groupId),
      item.reason,
    ]
      .join(' ')
      .toLowerCase();
  }
}
