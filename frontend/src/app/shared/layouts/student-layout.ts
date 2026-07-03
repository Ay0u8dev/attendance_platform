import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';

import { AuthService } from '../../core/auth/services/auth.service';
import { StudentProfileService } from '../../core/student/services/student-profile.service';

type NavItem = {
  label: string;
  route: string;
  icon: string;
};

type UtilityItem = {
  label: string;
  icon: string;
};

@Component({
  selector: 'app-student-layout',
  imports: [NgOptimizedImage, RouterLink, RouterLinkActive, RouterOutlet],
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
            aria-label="Close navigation"
          ></button>
        }

        <aside
          class="fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line bg-surface/95 shadow-shell transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0"
          [class]="sidebarShellClasses()"
          aria-label="Student navigation"
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
                  alt="Attendance Platform"
                  class="h-fit w-auto object-contain"
                />
              </div>

              @if (!isSidebarCollapsed()) {
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-principalText">
                    Attendance Platform
                  </p>
                  <p class="truncate text-xs text-secondaryText">Portail étudiant</p>
                </div>
              }
            </div>

            <button
              type="button"
              class="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-secondaryText transition-colors duration-200 hover:border-primary-soft hover:bg-primary-soft hover:text-primary lg:hidden"
              (click)="closeSidebar()"
              aria-label="Close menu"
            >
              <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
          </div>

          <button
            type="button"
            class="absolute top-20 right-0 hidden h-7 w-7 translate-x-1/2 items-center justify-center rounded-full border border-line bg-surface text-secondaryText shadow-card transition-all duration-200 hover:border-primary-soft hover:bg-primary-soft hover:text-primary lg:inline-flex"
            (click)="toggleSidebarCollapsed()"
            [attr.aria-label]="isSidebarCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
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

            <div class="mt-auto pt-3">
              @for (item of utilityItems; track item.label) {
                <button
                  type="button"
                  class="mb-1.5 flex w-full min-h-10 items-center rounded-xl border border-transparent px-2.5 py-2 text-left text-sm font-medium text-secondaryText transition-colors duration-200 hover:border-line hover:bg-surface-subtle hover:text-principalText"
                  [class.gap-3]="!isSidebarCollapsed()"
                  [class.justify-center]="isSidebarCollapsed()"
                  [attr.aria-label]="isSidebarCollapsed() ? item.label : null"
                  [attr.title]="isSidebarCollapsed() ? item.label : null"
                  (click)="openSettings()"
                >
                  <span class="flex h-8 w-8 shrink-0 items-center justify-center text-base">
                    <i [class]="item.icon" aria-hidden="true"></i>
                  </span>

                  @if (!isSidebarCollapsed()) {
                    <span>{{ item.label }}</span>
                  }
                </button>
              }
            </div>
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
                    aria-label="Open menu"
                  >
                    <i class="fa-solid fa-bars" aria-hidden="true"></i>
                  </button>

                  <div class="min-w-0">
                    <p
                      class="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-primary"
                    >
                      Espace étudiant
                    </p>
                    <h1 class="truncate text-lg font-semibold tracking-tight text-principalText">
                      {{ pageTitle() }}
                    </h1>
                  </div>
                </div>

                <div class="flex shrink-0 items-center gap-1 sm:gap-2">
                  <button
                    type="button"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-secondaryText transition-colors duration-200 hover:border-primary-soft hover:bg-primary-soft hover:text-primary"
                    aria-label="Notifications"
                  >
                    <i class="fa-regular fa-bell" aria-hidden="true"></i>
                  </button>

                  <div #userMenuRoot class="relative">
                    <button
                      type="button"
                      class="flex items-center gap-2 rounded-xl border border-line bg-surface px-2 py-1.5 text-left transition-colors duration-200 hover:border-primary-soft hover:bg-primary-soft"
                      (click)="toggleUserMenu()"
                      [attr.aria-expanded]="isUserMenuOpen()"
                      aria-haspopup="menu"
                      aria-label="Open user menu"
                    >
                      <span
                        class="flex h-9 w-9 overflow-hidden rounded-xl bg-primary-soft text-primary"
                      >
                        @if (profileImageUrl(); as imageUrl) {
                          <img
                            [src]="imageUrl"
                            alt=""
                            class="h-full w-full object-cover"
                            (error)="onProfileImageError()"
                          />
                        } @else {
                            <span class="flex h-full w-full items-center justify-center">
                            <i class="fa-solid fa-user-graduate text-sm" aria-hidden="true"></i>
                          </span>
                        }
                      </span>
                      <span class="hidden text-sm font-medium text-principalText md:inline">{{
                        currentUserName()
                      }}</span>
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
                        <div
                          class="rounded-xl border border-primary-soft bg-primary-soft px-3 py-2"
                        >
                          <div class="flex items-center gap-3">
                            <span
                              class="flex h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-surface text-primary"
                            >
                              @if (profileImageUrl(); as imageUrl) {
                                <img
                                  [src]="imageUrl"
                                  alt=""
                                  class="h-full w-full object-cover"
                                  (error)="onProfileImageError()"
                                />
                              } @else {
                                <span class="flex h-full w-full items-center justify-center">
                                  <i
                                    class="fa-solid fa-user-graduate text-sm"
                                    aria-hidden="true"
                                  ></i>
                                </span>
                              }
                            </span>
                            <div class="min-w-0">
                              <p class="truncate text-sm font-semibold text-principalText">
                                {{ currentUserName() }}
                              </p>
                              <p class="truncate text-xs text-secondaryText">Portail étudiant</p>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          class="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-secondaryText transition-colors duration-200 hover:bg-surface-subtle hover:text-principalText"
                          (click)="openSettings()"
                        >
                          <i class="fa-solid fa-gear" aria-hidden="true"></i>
                          <span>Paramètres</span>
                        </button>

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
export class StudentLayout {
  private readonly authService = inject(AuthService);
  private readonly studentProfileService = inject(StudentProfileService);
  private readonly router = inject(Router);
  private readonly userMenuRoot = viewChild<ElementRef<HTMLElement>>('userMenuRoot');
  private readonly routeTitles: Record<string, string> = {
    '/student/dashboard': 'Tableau de bord',
    '/student/sessions': 'Mes sessions',
    '/student/justifications': 'Justifications',
    '/student/settings': 'Parametres',
  };

  readonly navItems: NavItem[] = [
    {
      label: 'Tableau de bord',
      route: '/student/dashboard',
      icon: 'fa-solid fa-table-cells-large',
    },
    { label: 'Mes sessions', route: '/student/sessions', icon: 'fa-regular fa-calendar' },
    {
      label: 'Justifications',
      route: '/student/justifications',
      icon: 'fa-regular fa-file-lines',
    },
  ];

  readonly utilityItems: UtilityItem[] = [{ label: 'Paramètres', icon: 'fa-solid fa-gear' }];

  readonly isSidebarOpen = signal(false);
  readonly isSidebarCollapsed = signal(false);
  readonly isUserMenuOpen = signal(false);
  readonly profileImageFailed = signal(false);
  readonly sidebarMotionClasses = computed(() =>
    this.isSidebarOpen() ? 'translate-x-0' : '-translate-x-full',
  );
  readonly sidebarShellClasses = computed(() => {
    const mobileState = this.sidebarMotionClasses();
    const desktopWidth = this.isSidebarCollapsed() ? 'lg:w-19' : 'lg:w-68';
    return `${mobileState} w-68 ${desktopWidth}`;
  });
  readonly currentUserName = computed(() => {
    const user = this.authService.currentUser;
    if (!user) {
      return 'Étudiant';
    }

    const nameParts = [user.firstName, user.lastName]
      .filter((value) => typeof value === 'string')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    if (nameParts.length > 0) {
      return nameParts.join(' ');
    }

    if (typeof user.email === 'string' && user.email.trim().length > 0) {
      return user.email.trim();
    }

    return 'Étudiant';
  });
  readonly profileImageUrl = computed(() => {
    if (this.profileImageFailed()) {
      return null;
    }

    const value = this.studentProfileService.profile()?.pfpUrl?.trim();
    return value && value.length > 0 ? value : null;
  });
  readonly pageTitle = signal(this.resolvePageTitle(this.router.url));

  constructor() {
    effect(
      () => {
        this.studentProfileService.profile()?.pfpUrl;
        this.profileImageFailed.set(false);
      },
      { allowSignalWrites: true },
    );

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.pageTitle.set(this.resolvePageTitle(event.urlAfterRedirects));
        this.studentProfileService.ensureLoaded();
      });

    this.studentProfileService.ensureLoaded();
  }

  toggleSidebar(): void {
    const nextState = !this.isSidebarOpen();
    this.isSidebarOpen.set(nextState);

    if (nextState) {
      this.isUserMenuOpen.set(false);
    }
  }

  toggleSidebarCollapsed(): void {
    this.isSidebarCollapsed.update((value) => !value);
    this.isUserMenuOpen.set(false);
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen.update((value) => !value);
  }

  handleEscape(): void {
    this.isSidebarOpen.set(false);
    this.isUserMenuOpen.set(false);
  }

  handleDocumentClick(event: Event): void {
    if (!this.isUserMenuOpen()) {
      return;
    }

    const root = this.userMenuRoot()?.nativeElement;
    const target = event.target;

    if (!root || !(target instanceof Node)) {
      this.isUserMenuOpen.set(false);
      return;
    }

    if (!root.contains(target)) {
      this.isUserMenuOpen.set(false);
    }
  }

  closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }

  isActiveRoute(route: string): boolean {
    return this.router.url === route;
  }

  openSettings(): void {
    this.isUserMenuOpen.set(false);
    this.isSidebarOpen.set(false);
    void this.router.navigateByUrl('/student/settings');
  }

  onProfileImageError(): void {
    this.profileImageFailed.set(true);
  }

  logout(): void {
    this.isUserMenuOpen.set(false);
    this.authService.logout();
  }

  private resolvePageTitle(url: string): string {
    if (url.startsWith('/student/justifications/')) {
      return 'Détail de justification';
    }

    return this.routeTitles[url] ?? 'Espace étudiant';
  }
}
