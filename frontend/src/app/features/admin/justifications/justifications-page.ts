import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

import { DropdownFilter } from '../../../shared/components/dropdown-filter/dropdown-filter';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

type JustificationStatus = 'pending' | 'approved' | 'rejected';
type ViewMode = 'grid' | 'list';
type TabKey = 'all' | 'pending' | 'approved' | 'rejected';

type Justification = {
  readonly id: string;
  readonly studentId: string;
  readonly studentName: string;
  readonly avatar: string;
  readonly status: JustificationStatus;
  readonly module: string;
  readonly filiere: string;
  readonly group: string;
  readonly semester: string;
  readonly attendanceRate: number;
  readonly absenceDate: string;
  readonly duration: string;
  readonly motive: string;
  readonly attachmentLabel: string;
};

type Option = { readonly value: string; readonly label: string };

@Component({
  selector: 'app-justifications-page',
  imports: [DropdownFilter, StatusBadge],
  template: `
    <section class="space-y-5">
      <!-- Title row -->
      <header class="flex flex-wrap items-center gap-3">
        <h1 class="text-2xl font-semibold tracking-tight text-principalText">
          Gestion des Justifications
        </h1>
        <span
          class="inline-flex items-center gap-2 rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning-strong"
        >
          <i class="fa-regular fa-clock" aria-hidden="true"></i>
          {{ pendingCount() }} en attente
        </span>
      </header>

      <!-- Tabs + view toggle -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div
          class="inline-flex items-center gap-1 rounded-xl border border-line bg-surface p-1 shadow-card"
          role="tablist"
        >
          @for (tab of tabs; track tab.key) {
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="activeTab() === tab.key"
              class="inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors duration-200"
              [class.bg-primary]="activeTab() === tab.key"
              [class.text-white]="activeTab() === tab.key"
              [class.shadow-card]="activeTab() === tab.key"
              [class.text-secondaryText]="activeTab() !== tab.key"
              [class.hover:bg-surface-subtle]="activeTab() !== tab.key"
              [class.hover:text-principalText]="activeTab() !== tab.key"
              (click)="setTab(tab.key)"
            >
              {{ tab.label }}
              <span
                class="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold"
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

        <div
          class="inline-flex items-center gap-1 rounded-xl border border-line bg-surface p-1 shadow-card"
          role="group"
          aria-label="View mode"
        >
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors duration-200"
            [class.bg-primary-soft]="viewMode() === 'grid'"
            [class.text-primary]="viewMode() === 'grid'"
            [class.text-secondaryText]="viewMode() !== 'grid'"
            [attr.aria-pressed]="viewMode() === 'grid'"
            (click)="setView('grid')"
            aria-label="Grid view"
          >
            <i class="fa-solid fa-grip" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors duration-200"
            [class.bg-primary-soft]="viewMode() === 'list'"
            [class.text-primary]="viewMode() === 'list'"
            [class.text-secondaryText]="viewMode() !== 'list'"
            [attr.aria-pressed]="viewMode() === 'list'"
            (click)="setView('list')"
            aria-label="List view"
          >
            <i class="fa-solid fa-list" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <!-- Filters card -->
      <div
        class="grid gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card sm:grid-cols-2 lg:grid-cols-5"
      >
        <app-dropdown-filter
          label="Module"
          identifier="justification-module"
          allLabel="Tous les modules"
          [options]="moduleDropdownOptions()"
          [value]="dropdownValue(moduleFilter())"
          iconClass="fa-regular fa-folder"
          iconBackgroundClass="bg-primary-soft"
          (filterChange)="selectFilter('module', $event)"
        ></app-dropdown-filter>

        <!-- Filière dropdown -->
        <app-dropdown-filter
          label="Filiere"
          identifier="justification-filiere"
          allLabel="Toutes filieres"
          [options]="filiereDropdownOptions()"
          [value]="dropdownValue(filiereFilter())"
          iconClass="fa-solid fa-layer-group"
          iconBackgroundClass="bg-secondary-soft"
          iconColor="secondary"
          (filterChange)="selectFilter('filiere', $event)"
        ></app-dropdown-filter>

        <app-dropdown-filter
          label="Groupe"
          identifier="justification-groupe"
          allLabel="Tous les groupes"
          [options]="groupeDropdownOptions()"
          [value]="dropdownValue(groupeFilter())"
          iconClass="fa-solid fa-users"
          iconBackgroundClass="bg-warning-soft"
          iconColor="warning"
          (filterChange)="selectFilter('groupe', $event)"
        ></app-dropdown-filter>
        <!-- Période (date range) -->
        <label class="block text-xs">
          <span class="mb-1 block font-semibold uppercase tracking-[0.14em] text-muted">
            Période
          </span>
          <div class="relative">
            <i
              class="fa-regular fa-calendar pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              aria-hidden="true"
            ></i>
            <input
              type="text"
              [value]="periodFilter()"
              (input)="onPeriodInput($event)"
              placeholder="01 Oct - 31 Oct"
              aria-label="Période"
              class="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-3 text-sm text-principalText placeholder:text-muted transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </label>

        <!-- Recherche (text) -->
        <label class="block text-xs">
          <span class="mb-1 block font-semibold uppercase tracking-[0.14em] text-muted">
            Recherche
          </span>
          <div class="relative">
            <i
              class="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              aria-hidden="true"
            ></i>
            <input
              type="search"
              [value]="searchQuery()"
              (input)="onSearchInput($event)"
              placeholder="Étudiant..."
              aria-label="Recherche étudiant"
              class="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-3 text-sm text-principalText placeholder:text-muted transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </label>
      </div>

      <!-- Active filters chips + reset -->
      @if (hasActiveFilters()) {
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="font-semibold uppercase tracking-[0.14em] text-muted">Filtres actifs</span>
          @for (chip of activeFilterChips(); track chip.key) {
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-full border border-primary-soft bg-primary-soft px-3 py-1 font-medium text-primary transition-colors duration-200 hover:bg-primary hover:text-white"
              (click)="clearFilter(chip.key)"
              [attr.aria-label]="'Effacer le filtre ' + chip.label"
            >
              {{ chip.label }}: {{ chip.value }}
              <i class="fa-solid fa-xmark text-[0.65rem]" aria-hidden="true"></i>
            </button>
          }
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 font-medium text-secondaryText transition-colors duration-200 hover:border-danger-soft hover:text-danger"
            (click)="resetFilters()"
          >
            <i class="fa-solid fa-rotate-left text-[0.65rem]" aria-hidden="true"></i>
            Réinitialiser
          </button>
        </div>
      }

      <!-- Two columns: list + detail -->
      <div class="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,1fr)]">
        <!-- Justifications list -->
        <article>
          <div class="mb-3 flex items-center justify-between text-xs text-secondaryText">
            <span>{{ visibleJustifications().length }} demande(s)</span>
            @if (viewMode() === 'grid') {
              <span class="font-semibold uppercase tracking-[0.14em] text-muted">Vue grille</span>
            } @else {
              <span class="font-semibold uppercase tracking-[0.14em] text-muted">Vue liste</span>
            }
          </div>

          <div
            [class.space-y-3]="viewMode() === 'list'"
            [class.grid]="viewMode() === 'grid'"
            [class.gap-3]="viewMode() === 'grid'"
            [class.sm:grid-cols-2]="viewMode() === 'grid'"
          >
            @for (item of visibleJustifications(); track item.id) {
              <div
                class="flex flex-col gap-3 rounded-2xl border bg-surface p-4 shadow-card transition-colors duration-200"
                [class.border-line]="selectedId() !== item.id"
                [class.border-primary]="selectedId() === item.id"
                [class.shadow-card-strong]="selectedId() === item.id"
                [class.sm:flex-row]="viewMode() === 'list'"
                [class.sm:items-center]="viewMode() === 'list'"
              >
                <div class="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary"
                    aria-hidden="true"
                  >
                    {{ item.avatar }}
                  </span>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold text-principalText">
                      {{ item.studentName }}
                    </p>
                    <p class="text-xs text-secondaryText">ID: {{ item.studentId }}</p>
                    @if (viewMode() === 'grid') {
                      <p class="mt-1 truncate text-[0.7rem] text-muted">
                        {{ item.module }} · {{ item.filiere }} · {{ item.group }}
                      </p>
                    }
                  </div>
                </div>

                <div class="flex flex-wrap items-center justify-end gap-2">
                  <app-status-badge
                    [label]="statusLabel(item.status)"
                    [variant]="statusVariant(item.status)"
                  ></app-status-badge>

                  <button
                    type="button"
                    class="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-sm font-medium text-principalText transition-colors duration-200 hover:border-primary-soft hover:bg-primary-soft"
                    (click)="select(item.id)"
                    [attr.aria-pressed]="selectedId() === item.id"
                  >
                    Détails
                    <i class="fa-regular fa-eye text-xs" aria-hidden="true"></i>
                  </button>

                  <button
                    type="button"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-secondaryText transition-colors duration-200 hover:border-danger-soft hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                    [disabled]="item.status !== 'pending'"
                    (click)="reject(item.id)"
                    [attr.aria-label]="'Rejeter la demande de ' + item.studentName"
                  >
                    <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                  </button>

                  <button
                    type="button"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary-strong hover:shadow-card-strong disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                    [disabled]="item.status !== 'pending'"
                    (click)="approve(item.id)"
                    [attr.aria-label]="'Approuver la demande de ' + item.studentName"
                  >
                    <i class="fa-solid fa-check" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
            }

            @if (visibleJustifications().length === 0) {
              <div
                class="rounded-2xl border border-dashed border-line bg-surface p-10 text-center text-sm text-secondaryText sm:col-span-2"
              >
                <i
                  class="fa-regular fa-folder-open mb-2 block text-2xl text-muted"
                  aria-hidden="true"
                ></i>
                Aucune demande ne correspond aux filtres sélectionnés.
              </div>
            }
          </div>
        </article>

        <!-- Detail panel -->
        @if (selected(); as detail) {
          <aside
            class="rounded-2xl border border-line bg-surface p-5 shadow-card"
            aria-label="Détails de la demande"
          >
            <div class="flex items-start justify-between">
              <h2 class="text-base font-semibold text-principalText">Détails de la demande</h2>
              <button
                type="button"
                class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-secondaryText transition-colors duration-200 hover:bg-surface-subtle hover:text-principalText"
                (click)="clearSelection()"
                aria-label="Fermer le panneau"
              >
                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            </div>

            <div class="mt-5 flex flex-col items-center text-center">
              <span
                class="flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft text-xl font-semibold text-primary"
                aria-hidden="true"
              >
                {{ detail.avatar }}
              </span>
              <p class="mt-3 text-base font-semibold text-principalText">
                {{ detail.studentName }}
              </p>
              <p class="text-xs text-secondaryText">
                Étudiant(e) en {{ detail.filiere }} - Groupe {{ detail.group }}
              </p>

              <div class="mt-3 flex flex-wrap justify-center gap-2">
                <span
                  class="inline-flex items-center rounded-full bg-primary-soft px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-primary"
                >
                  Semestre {{ detail.semester }}
                </span>
                <span
                  class="inline-flex items-center rounded-full bg-secondary-soft px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-secondary-strong"
                >
                  Assiduité {{ detail.attendanceRate }}%
                </span>
              </div>
            </div>

            <section class="mt-6">
              <p class="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted">
                Informations absence
              </p>

              <div class="mt-3 grid grid-cols-2 gap-3">
                <div class="rounded-xl border border-line p-3">
                  <p class="text-[0.65rem] uppercase tracking-[0.14em] text-muted">Date Absence</p>
                  <p class="mt-1 text-sm font-semibold text-principalText">
                    {{ detail.absenceDate }}
                  </p>
                </div>
                <div class="rounded-xl border border-line p-3">
                  <p class="text-[0.65rem] uppercase tracking-[0.14em] text-muted">Durée</p>
                  <p class="mt-1 text-sm font-semibold text-principalText">{{ detail.duration }}</p>
                </div>
              </div>

              <div class="mt-3 rounded-xl border border-line p-3">
                <p class="text-[0.65rem] uppercase tracking-[0.14em] text-muted">Module</p>
                <p class="mt-1 text-sm text-principalText">{{ detail.module }}</p>
              </div>

              <div class="mt-3 rounded-xl border border-line p-3">
                <p class="text-[0.65rem] uppercase tracking-[0.14em] text-muted">Motif déclaré</p>
                <p class="mt-1 text-sm leading-6 text-principalText">{{ detail.motive }}</p>
              </div>
            </section>

            <section class="mt-6">
              <p class="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted">
                Justificatif
              </p>

              <div
                class="mt-3 flex h-44 items-center justify-center rounded-xl border border-line bg-secondary-soft text-secondary-strong"
                role="img"
                [attr.aria-label]="'Aperçu de ' + detail.attachmentLabel"
              >
                <div class="flex flex-col items-center gap-2 text-xs font-medium">
                  <i class="fa-regular fa-file-image text-3xl" aria-hidden="true"></i>
                  {{ detail.attachmentLabel }}
                </div>
              </div>
            </section>

            <div class="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-principalText transition-colors duration-200 hover:border-danger-soft hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                [disabled]="detail.status !== 'pending'"
                (click)="reject(detail.id)"
              >
                Rejeter
              </button>
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary-strong hover:shadow-card-strong disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                [disabled]="detail.status !== 'pending'"
                (click)="approve(detail.id)"
              >
                Approuver
              </button>
            </div>
          </aside>
        } @else {
          <aside
            class="hidden xl:flex items-center justify-center rounded-2xl border border-dashed border-line bg-surface p-10 text-center text-sm text-secondaryText"
          >
            Sélectionnez une demande pour afficher ses détails.
          </aside>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JustificationsPage {
  readonly tabs: ReadonlyArray<{ key: TabKey; label: string }> = [
    { key: 'all', label: 'Toutes' },
    { key: 'pending', label: 'En attente' },
    { key: 'approved', label: 'Approuvées' },
    { key: 'rejected', label: 'Rejetées' },
  ];

  readonly moduleOptions: readonly Option[] = [
    { value: 'all', label: 'Tous les modules' },
    { value: 'Algorithmique Avancée', label: 'Algorithmique Avancée' },
    { value: 'Bases de Données', label: 'Bases de Données' },
    { value: 'Réseaux & Sécurité', label: 'Réseaux & Sécurité' },
    { value: 'Intelligence Artificielle', label: 'Intelligence Artificielle' },
    { value: 'Génie Logiciel', label: 'Génie Logiciel' },
  ];

  readonly filiereOptions: readonly Option[] = [
    { value: 'all', label: 'Toutes filières' },
    { value: 'Génie Logiciel', label: 'Génie Logiciel' },
    { value: 'Data Science', label: 'Data Science' },
    { value: 'Réseaux', label: 'Réseaux' },
    { value: 'Cybersécurité', label: 'Cybersécurité' },
  ];

  readonly groupeOptions: readonly Option[] = [
    { value: 'all', label: 'Tous les groupes' },
    { value: 'A', label: 'Groupe A' },
    { value: 'B', label: 'Groupe B' },
    { value: 'C', label: 'Groupe C' },
    { value: 'D', label: 'Groupe D' },
  ];

  readonly activeTab = signal<TabKey>('all');
  readonly viewMode = signal<ViewMode>('list');

  readonly moduleFilter = signal('all');
  readonly filiereFilter = signal('all');
  readonly groupeFilter = signal('all');
  readonly periodFilter = signal('01 Oct - 31 Oct');
  readonly searchQuery = signal('');

  readonly selectedId = signal<string | null>('JST-2024-3');
  readonly moduleDropdownOptions = computed(() =>
    this.moduleOptions.filter((option) => option.value !== 'all'),
  );
  readonly filiereDropdownOptions = computed(() =>
    this.filiereOptions.filter((option) => option.value !== 'all'),
  );
  readonly groupeDropdownOptions = computed(() =>
    this.groupeOptions.filter((option) => option.value !== 'all'),
  );

  private readonly justifications = signal<readonly Justification[]>([
    {
      id: 'JST-2024-1',
      studentId: '#ST24091',
      studentName: 'Julien Martin',
      avatar: 'JM',
      status: 'pending',
      module: 'Algorithmique Avancée',
      filiere: 'Génie Logiciel',
      group: 'A',
      semester: '3',
      attendanceRate: 88,
      absenceDate: '12 Oct 2023',
      duration: '04 Heures',
      motive: 'Rendez-vous médical confirmé par certificat. Document joint en annexe.',
      attachmentLabel: 'certificat-medical.pdf',
    },
    {
      id: 'JST-2024-2',
      studentId: '#ST24012',
      studentName: 'Sarah Bensaid',
      avatar: 'SB',
      status: 'approved',
      module: 'Intelligence Artificielle',
      filiere: 'Data Science',
      group: 'B',
      semester: '5',
      attendanceRate: 95,
      absenceDate: '08 Oct 2023',
      duration: '02 Heures',
      motive: 'Absence justifiée pour événement académique externe.',
      attachmentLabel: 'convocation.pdf',
    },
    {
      id: 'JST-2024-3',
      studentId: '#ST24108',
      studentName: 'Amira K.',
      avatar: 'AK',
      status: 'pending',
      module: 'Génie Logiciel',
      filiere: 'Génie Logiciel',
      group: 'A',
      semester: '3',
      attendanceRate: 92,
      absenceDate: '14 Oct 2023',
      duration: '02 Heures',
      motive:
        'Consultation médicale urgente suite à une malaise matinale. Certificat médical joint.',
      attachmentLabel: 'medical-certificate.jpg',
    },
    {
      id: 'JST-2024-4',
      studentId: '#ST24055',
      studentName: 'Lucas Dupont',
      avatar: 'LD',
      status: 'rejected',
      module: 'Réseaux & Sécurité',
      filiere: 'Réseaux',
      group: 'C',
      semester: '4',
      attendanceRate: 76,
      absenceDate: '03 Oct 2023',
      duration: '06 Heures',
      motive: 'Justificatif refusé : document incomplet.',
      attachmentLabel: 'attestation.pdf',
    },
    {
      id: 'JST-2024-5',
      studentId: '#ST24077',
      studentName: 'Yasmine El Idrissi',
      avatar: 'YE',
      status: 'pending',
      module: 'Bases de Données',
      filiere: 'Data Science',
      group: 'B',
      semester: '4',
      attendanceRate: 84,
      absenceDate: '21 Oct 2023',
      duration: '03 Heures',
      motive: 'Convocation administrative. Justificatif officiel joint.',
      attachmentLabel: 'convocation-admin.pdf',
    },
    {
      id: 'JST-2024-6',
      studentId: '#ST24033',
      studentName: 'Mehdi Alaoui',
      avatar: 'MA',
      status: 'approved',
      module: 'Algorithmique Avancée',
      filiere: 'Génie Logiciel',
      group: 'A',
      semester: '3',
      attendanceRate: 90,
      absenceDate: '10 Oct 2023',
      duration: '02 Heures',
      motive: 'Hospitalisation courte durée. Bulletin médical joint.',
      attachmentLabel: 'bulletin-hospitalier.pdf',
    },
    {
      id: 'JST-2024-7',
      studentId: '#ST24102',
      studentName: 'Inès Berrada',
      avatar: 'IB',
      status: 'pending',
      module: 'Réseaux & Sécurité',
      filiere: 'Cybersécurité',
      group: 'D',
      semester: '5',
      attendanceRate: 81,
      absenceDate: '24 Oct 2023',
      duration: '04 Heures',
      motive: 'Décès dans la famille proche. Acte de décès en pièce jointe.',
      attachmentLabel: 'acte-deces.pdf',
    },
  ]);

  // -------- Derived state --------

  readonly visibleJustifications = computed(() => {
    const tab = this.activeTab();
    const moduleValue = this.moduleFilter();
    const filiereValue = this.filiereFilter();
    const groupeValue = this.groupeFilter();
    const search = this.searchQuery().trim().toLowerCase();

    return this.justifications().filter((item) => {
      if (tab !== 'all' && item.status !== tab) return false;
      if (moduleValue !== 'all' && item.module !== moduleValue) return false;
      if (filiereValue !== 'all' && item.filiere !== filiereValue) return false;
      if (groupeValue !== 'all' && item.group !== groupeValue) return false;

      if (search) {
        const haystack = [item.studentName, item.studentId, item.module, item.filiere, item.group]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }

      return true;
    });
  });

  readonly pendingCount = computed(
    () => this.justifications().filter((item) => item.status === 'pending').length,
  );

  readonly selected = computed<Justification | null>(() => {
    const id = this.selectedId();
    if (!id) return null;
    return this.justifications().find((item) => item.id === id) ?? null;
  });

  readonly hasActiveFilters = computed(
    () =>
      this.moduleFilter() !== 'all' ||
      this.filiereFilter() !== 'all' ||
      this.groupeFilter() !== 'all' ||
      this.searchQuery().trim() !== '',
  );

  readonly activeFilterChips = computed(() => {
    const chips: Array<{
      key: 'module' | 'filiere' | 'groupe' | 'search';
      label: string;
      value: string;
    }> = [];
    if (this.moduleFilter() !== 'all') {
      chips.push({
        key: 'module',
        label: 'Module',
        value: this.labelOf(this.moduleOptions, this.moduleFilter()),
      });
    }
    if (this.filiereFilter() !== 'all') {
      chips.push({
        key: 'filiere',
        label: 'Filière',
        value: this.labelOf(this.filiereOptions, this.filiereFilter()),
      });
    }
    if (this.groupeFilter() !== 'all') {
      chips.push({
        key: 'groupe',
        label: 'Groupe',
        value: this.labelOf(this.groupeOptions, this.groupeFilter()),
      });
    }
    if (this.searchQuery().trim() !== '') {
      chips.push({ key: 'search', label: 'Recherche', value: this.searchQuery().trim() });
    }
    return chips;
  });

  // -------- Tab / view actions --------

  setTab(tab: TabKey): void {
    this.activeTab.set(tab);
  }

  setView(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  countFor(tab: TabKey): number {
    const all = this.justifications();
    if (tab === 'all') return all.length;
    return all.filter((item) => item.status === tab).length;
  }

  // -------- Dropdown actions --------

  selectFilter(key: 'module' | 'filiere' | 'groupe', value: string | null): void {
    const nextValue = value ?? 'all';
    if (key === 'module') this.moduleFilter.set(nextValue);
    if (key === 'filiere') this.filiereFilter.set(nextValue);
    if (key === 'groupe') this.groupeFilter.set(nextValue);
  }

  clearFilter(key: 'module' | 'filiere' | 'groupe' | 'search'): void {
    if (key === 'module') this.moduleFilter.set('all');
    if (key === 'filiere') this.filiereFilter.set('all');
    if (key === 'groupe') this.groupeFilter.set('all');
    if (key === 'search') this.searchQuery.set('');
  }

  resetFilters(): void {
    this.moduleFilter.set('all');
    this.filiereFilter.set('all');
    this.groupeFilter.set('all');
    this.searchQuery.set('');
  }

  // -------- Input handlers --------

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  onPeriodInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.periodFilter.set(target.value);
  }

  // -------- Selection / approval --------

  select(id: string): void {
    this.selectedId.set(id);
  }

  clearSelection(): void {
    this.selectedId.set(null);
  }

  approve(id: string): void {
    this.updateStatus(id, 'approved');
  }

  reject(id: string): void {
    this.updateStatus(id, 'rejected');
  }

  // -------- Helpers --------

  labelOf(options: readonly Option[], value: string): string {
    return options.find((opt) => opt.value === value)?.label ?? value;
  }

  dropdownValue(value: string): string | null {
    return value === 'all' ? null : value;
  }

  statusLabel(status: JustificationStatus): string {
    switch (status) {
      case 'pending':
        return 'EN ATTENTE';
      case 'approved':
        return 'APPROUVÉE';
      case 'rejected':
        return 'REJETÉE';
    }
  }

  statusVariant(status: JustificationStatus): 'success' | 'warning' | 'error' {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
    }
  }

  private updateStatus(id: string, status: JustificationStatus): void {
    this.justifications.update((items) =>
      items.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  }
}
