import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

import { User } from '../../core/auth/models/auth.model';
import { AuthService } from '../../core/auth/services/auth.service';
import { AcademicYearContextService } from '../../core/structure/services/academic-year-context.service';
import { NotificationBellComponent } from '../components/notification-bell/notification-bell';

type NavItem = {
  label: string;
  route: string;
  icon: string;
};

@Component({
  selector: 'app-admin-layout',
  imports: [NgOptimizedImage, NotificationBellComponent, RouterLink, RouterLinkActive, RouterOutlet],
  host: {
    '(document:click)': 'handleDocumentClick($event)',
    '(document:keydown.escape)': 'handleEscape()',
  },
  template: `
    <div class="relative h-dvh overflow-hidden bg-background text-principalText">
      <div
        class="pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-r from-primary-soft via-background to-secondary-soft opacity-80"
      ></div>

      <div class="relative flex h-full">
        @if (isSidebarOpen()) {
          <button
            type="button"
            class="fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-sm lg:hidden"
            (click)="closeSidebar()"
            aria-label="Fermer la navigation"
          ></button>
        }

        <aside
          class="fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line bg-surface/95 shadow-shell transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0"
          [class]="sidebarShellClasses()"
          aria-label="Navigation administrateur"
        >
          <div
            class="flex h-16 items-center border-b border-line px-3"
            [class.px-2]="isSidebarCollapsed()"
          >
            <div
              class="flex min-w-0 items-center gap-3"
              [class.justify-center]="isSidebarCollapsed()"
              [class.w-full]="isSidebarCollapsed()"
            >
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary-soft bg-primary-soft"
              >
                <img
                  ngSrc="assets/logo-app.png"
                  width="24"
                  height="24"
                  alt="Plateforme de présence"
                  class="h-fit w-auto object-contain"
                />
              </div>

              @if (!isSidebarCollapsed()) {
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-principalText">
                    Plateforme de présence
                  </p>
                  <p class="truncate text-xs text-secondaryText">Tableau de bord administrateur</p>
                </div>
              }
            </div>

            <button
              type="button"
              class="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-secondaryText transition-colors duration-200 hover:border-primary-soft hover:bg-primary-soft hover:text-primary lg:hidden"
              (click)="closeSidebar()"
              aria-label="Fermer le menu"
            >
              <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
          </div>

          <button
            type="button"
            class="absolute top-5 right-0 hidden h-7 w-7 translate-x-1/2 items-center justify-center rounded-full border border-line bg-surface text-secondaryText shadow-card transition-all duration-200 hover:border-primary-soft hover:bg-primary-soft hover:text-primary lg:inline-flex"
            (click)="toggleSidebarCollapsed()"
            [attr.aria-label]="isSidebarCollapsed() ? 'Déplier la barre latérale' : 'Replier la barre latérale'"
          >
            <i
              class="fa-solid text-xs"
              [class.fa-chevron-right]="isSidebarCollapsed()"
              [class.fa-chevron-left]="!isSidebarCollapsed()"
              aria-hidden="true"
            ></i>
          </button>

          <nav
            class="flex flex-1 flex-col overflow-y-auto py-4"
            [class.px-3]="!isSidebarCollapsed()"
            [class.px-1]="isSidebarCollapsed()"
          >
            @for (item of navItems; track item.route) {
              <a
                [routerLink]="item.route"
                routerLinkActive="bg-nav-active text-primary"
                [routerLinkActiveOptions]="{ exact: true }"
                class="group mb-1 flex min-h-12 items-center rounded-[1.1rem] px-3.5 py-3 text-[1.02rem] font-medium text-nav-text transition-colors duration-200 hover:bg-surface-subtle hover:text-principalText"
                [class.gap-3.5]="!isSidebarCollapsed()"
                [class.justify-center]="isSidebarCollapsed()"
                [class.font-semibold]="isActiveRoute(item.route)"
                (click)="closeSidebar()"
                [attr.aria-label]="isSidebarCollapsed() ? item.label : null"
                [attr.title]="isSidebarCollapsed() ? item.label : null"
              >
                <span
                  class="flex h-5 w-5 shrink-0 items-center justify-center text-[1.1rem] text-current transition-colors duration-200"
                >
                  <i [class]="item.icon" aria-hidden="true"></i>
                </span>

                @if (!isSidebarCollapsed()) {
                  <span class="truncate leading-none">{{ item.label }}</span>
                }
              </a>
            }

          </nav>
        </aside>

        <div class="flex min-w-0 min-h-0 flex-1 flex-col bg-background">
          <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <header
              class="border-b border-line bg-surface/85 backdrop-blur-xl lg:sticky lg:top-0 lg:z-20"
            >
              <div class="flex h-16 items-center justify-between gap-3 px-3 sm:px-5 lg:px-6">
                <div class="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-secondaryText transition-colors duration-200 hover:border-primary-soft hover:bg-primary-soft hover:text-primary lg:hidden"
                    (click)="toggleSidebar()"
                    [attr.aria-expanded]="isSidebarOpen()"
                    aria-label="Ouvrir le menu"
                  >
                    <i class="fa-solid fa-bars" aria-hidden="true"></i>
                  </button>

                  <div class="min-w-0">
                    <p
                      class="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-primary"
                    >
                      Espace administrateur
                    </p>
                    <h1 class="truncate text-lg font-semibold tracking-tight text-principalText">
                      Tableau de bord
                    </h1>
                  </div>
                </div>

                <div class="flex shrink-0 items-center gap-1 sm:gap-2">
                  <div #academicYearMenuRoot class="relative">
                    <button
                      type="button"
                      class="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-primary-soft bg-primary-soft/45 px-3 text-left text-primary transition-colors duration-200 hover:border-primary/30 hover:bg-primary-soft sm:min-w-56 sm:px-4"
                      (click)="toggleAcademicYearMenu()"
                      [attr.aria-expanded]="isAcademicYearMenuOpen()"
                      aria-haspopup="menu"
                      aria-label="Sélectionner l'année universitaire active"
                      [disabled]="activeAcademicYears().length === 0"
                    >
                      <i class="fa-regular fa-calendar shrink-0 text-base" aria-hidden="true"></i>
                      <span class="min-w-0 flex-1">
                        <span class="block truncate text-sm font-bold">
                          {{ selectedAcademicYearLabel() }}
                        </span>
                      </span>
                      <i
                        class="fa-solid fa-chevron-down shrink-0 text-[0.65rem] transition-transform"
                        [class.rotate-180]="isAcademicYearMenuOpen()"
                        aria-hidden="true"
                      ></i>
                    </button>

                    @if (isAcademicYearMenuOpen()) {
                      <div
                        class="absolute left-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-line bg-surface p-2 shadow-shell sm:w-72"
                      >
                        <div class="px-3 py-2">
                          <p class="text-xs font-semibold uppercase tracking-wide text-secondaryText">
                            Années actives
                          </p>
                        </div>
                        @for (year of activeAcademicYears(); track year.id) {
                          <button
                            type="button"
                            class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-200 hover:bg-surface-subtle"
                            [class.bg-primary-soft]="isSelectedAcademicYear(year.id)"
                            (click)="selectAcademicYear(year.id)"
                          >
                            <span
                              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"
                            >
                              <i class="fa-regular fa-calendar-check text-xs" aria-hidden="true"></i>
                            </span>
                            <span class="min-w-0 flex-1">
                              <span class="block truncate text-sm font-semibold text-principalText">
                                {{ year.name }}
                              </span>
                              <span class="block text-xs text-secondaryText">Active</span>
                            </span>
                            @if (isSelectedAcademicYear(year.id)) {
                              <i class="fa-solid fa-check text-sm text-primary" aria-hidden="true"></i>
                            }
                          </button>
                        } @empty {
                          <p class="px-3 py-4 text-sm text-secondaryText">
                            Aucune année active.
                          </p>
                        }
                      </div>
                    }
                  </div>

                  <app-notification-bell />

                  <div #userMenuRoot class="relative">
                    <button
                      type="button"
                      class="flex items-center gap-2 rounded-xl border border-line bg-surface px-2 py-1.5 text-left transition-colors duration-200 hover:border-primary-soft hover:bg-primary-soft"
                      (click)="toggleUserMenu()"
                      [attr.aria-expanded]="isUserMenuOpen()"
                      aria-haspopup="menu"
                      aria-label="Ouvrir le menu utilisateur"
                    >
                      @if (userProfileImageUrl(); as imageUrl) {
                        <img
                          [src]="imageUrl"
                          [alt]="userDisplayName()"
                          class="h-7 w-7 rounded-lg border border-primary-soft object-cover"
                        />
                      } @else {
                        <span
                          class="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-soft text-xs font-semibold text-primary"
                        >
                          {{ userInitials() }}
                        </span>
                      }
                      <span class="hidden text-sm font-medium text-principalText md:inline"
                        >{{ userDisplayName() }}</span
                      >
                      <!-- <i
                      class="fa-solid text-[0.6rem] text-secondaryText"
                      [class.fa-chevron-up]="isUserMenuOpen()"
                      [class.fa-chevron-down]="!isUserMenuOpen()"
                      aria-hidden="true"
                    ></i> -->
                    </button>

                    @if (isUserMenuOpen()) {
                      <div
                        class="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-line bg-surface p-2 shadow-shell"
                      >
                        <div class="rounded-xl bg-surface-subtle px-3 py-3">
                          <p class="truncate text-sm font-semibold text-principalText">{{ userDisplayName() }}</p>
                          <p class="mt-0.5 truncate text-xs text-secondaryText">{{ userEmail() }}</p>
                        </div>

                        <button
                          type="button"
                          class="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-danger transition-colors duration-200 hover:bg-danger-soft"
                          (click)="logout()"
                        >
                          <i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
                          <span>Déconnexion</span>
                        </button>
                      </div>
                    }
                  </div>
                </div>
              </div>
            </header>

            <main class="px-3 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
              <div class="mx-auto w-full max-w-7xl">
                <router-outlet></router-outlet>
              </div>
            </main>
          </div>
        </div>
      </div>

    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayout {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly academicYearContext = inject(AcademicYearContextService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly userMenuRoot = viewChild<ElementRef<HTMLElement>>('userMenuRoot');
  private readonly academicYearMenuRoot =
    viewChild<ElementRef<HTMLElement>>('academicYearMenuRoot');

  readonly navItems: NavItem[] = [
    { label: 'Tableau de bord', route: '/dashboard', icon: 'fa-solid fa-table-cells-large' },
    { label: 'Présences', route: '/attendance', icon: 'fa-regular fa-square-check' },
    { label: 'Justifications', route: '/justifications', icon: 'fa-regular fa-file-lines' },
    { label: 'Étudiants', route: '/students', icon: 'fa-solid fa-user-graduate' },
    { label: 'Enseignants', route: '/teachers', icon: 'fa-solid fa-chalkboard-user' },
    { label: 'Structure', route: '/structure', icon: 'fa-solid fa-sitemap' },
  ];

  readonly isSidebarOpen = signal(false);
  readonly isSidebarCollapsed = signal(false);
  readonly isUserMenuOpen = signal(false);
  readonly isAcademicYearMenuOpen = signal(false);
  readonly currentUser = toSignal(this.authService.currentUser$, {
    initialValue: this.authService.currentUser,
  });
  readonly userDisplayName = computed(() => this.formatUserName(this.currentUser()));
  readonly userEmail = computed(() => this.currentUser()?.email ?? 'admin@ump.ac.ma');
  readonly userProfileImageUrl = computed(() => this.currentUser()?.profileImageUrl?.trim() || null);
  readonly userInitials = computed(() => this.computeInitials(this.userDisplayName()));
  readonly activeAcademicYears = this.academicYearContext.activeAcademicYears;
  readonly selectedAcademicYearId = this.academicYearContext.selectedAcademicYearId;
  readonly selectedAcademicYearLabel = computed(
    () => this.academicYearContext.selectedAcademicYear()?.name ?? 'Aucune année active',
  );
  readonly sidebarMotionClasses = computed(() =>
    this.isSidebarOpen() ? 'translate-x-0' : '-translate-x-full',
  );
  readonly sidebarShellClasses = computed(() => {
    const mobileState = this.sidebarMotionClasses();
    const desktopWidth = this.isSidebarCollapsed() ? 'lg:w-19' : 'lg:w-68';
    return `${mobileState} w-68 ${desktopWidth}`;
  });

  constructor() {
    this.academicYearContext.loadYears().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  toggleSidebar(): void {
    const nextState = !this.isSidebarOpen();
    this.isSidebarOpen.set(nextState);

    if (nextState) {
      this.isUserMenuOpen.set(false);
      this.isAcademicYearMenuOpen.set(false);
    }
  }

  toggleSidebarCollapsed(): void {
    this.isSidebarCollapsed.update((value) => !value);
    this.isUserMenuOpen.set(false);
    this.isAcademicYearMenuOpen.set(false);
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen.update((value) => !value);
    this.isAcademicYearMenuOpen.set(false);
  }

  toggleAcademicYearMenu(): void {
    if (this.activeAcademicYears().length === 0) {
      return;
    }

    this.isAcademicYearMenuOpen.update((value) => !value);
    this.isUserMenuOpen.set(false);
  }

  selectAcademicYear(yearId: number): void {
    this.academicYearContext.setSelectedAcademicYear(yearId);
    this.isAcademicYearMenuOpen.set(false);
  }

  isSelectedAcademicYear(yearId: number): boolean {
    return String(yearId) === this.selectedAcademicYearId();
  }

  handleEscape(): void {
    this.isSidebarOpen.set(false);
    this.isUserMenuOpen.set(false);
    this.isAcademicYearMenuOpen.set(false);
  }

  handleDocumentClick(event: Event): void {
    if (!this.isUserMenuOpen() && !this.isAcademicYearMenuOpen()) {
      return;
    }

    const userRoot = this.userMenuRoot()?.nativeElement;
    const academicYearRoot = this.academicYearMenuRoot()?.nativeElement;
    const target = event.target;

    if (!(target instanceof Node)) {
      this.isUserMenuOpen.set(false);
      this.isAcademicYearMenuOpen.set(false);
      return;
    }

    if (!userRoot || !userRoot.contains(target)) {
      this.isUserMenuOpen.set(false);
    }

    if (!academicYearRoot || !academicYearRoot.contains(target)) {
      this.isAcademicYearMenuOpen.set(false);
    }
  }

  closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }

  isActiveRoute(route: string): boolean {
    return this.router.url === route;
  }

  logout(): void {
    this.isUserMenuOpen.set(false);
    this.authService.logout();
  }

  private formatUserName(user: User | null): string {
    if (!user) {
      return 'Admin';
    }

    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    if (fullName) {
      return fullName;
    }

    return user.email.split('@')[0] || user.email;
  }

  private computeInitials(value: string): string {
    const initials = value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();

    return initials || 'AD';
  }
}
