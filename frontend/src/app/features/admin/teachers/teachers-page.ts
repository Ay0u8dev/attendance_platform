import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { TeacherRequest, TeacherUser } from '../../../core/users/models/teacher.model';
import { TeacherService } from '../../../core/users/services/teacher.service';

@Component({
  selector: 'app-teachers-page',
  standalone: true,
  imports: [PageHeader, StatusBadge, FormsModule, DatePipe],
  template: `
    <section class="space-y-6">
      <app-page-header
        title="Enseignants"
        description="Gestion complète des enseignants : création, modification, suppression et consultation des comptes."
      ></app-page-header>

      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-sm text-secondaryText">
            Toutes les données sont récupérées et synchronisées avec le backend utilisateur.
          </p>
        </div>
        <button type="button" class="btn-primary" (click)="openCreate()">
          Ajouter un enseignant
        </button>
      </div>

      @if (error()) {
        <div class="rounded-3xl border border-danger/20 bg-danger/10 p-4 text-danger">
          {{ error() }}
        </div>
      }

      @if (isLoading()) {
        <div class="rounded-3xl border border-line bg-surface p-8 text-center text-secondaryText">
          Chargement des enseignants...
        </div>
      } @else {
        @if (teachers().length === 0) {
          <div class="rounded-3xl border border-line bg-surface p-8 text-center text-secondaryText">
            Aucun enseignant trouvé. Utilisez le bouton &quot;Ajouter un enseignant&quot; pour créer
            un compte.
          </div>
        } @else {
          <div class="grid gap-4">
            @for (teacher of teachers(); track teacher.id) {
              <article class="rounded-3xl border border-line bg-surface p-5 shadow-card">
                <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p class="text-lg font-semibold text-principalText">
                      {{ teacher.firstName }} {{ teacher.lastName }}
                    </p>
                    <p class="text-sm text-secondaryText">{{ teacher.email }}</p>
                    <p class="text-xs text-muted">
                      Créé le {{ teacher.createdAt | date: 'dd/MM/yyyy' }}
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <app-status-badge
                      [label]="teacher.enabled ? 'Activé' : 'Désactivé'"
                      [variant]="teacher.enabled ? 'success' : 'warning'"
                    ></app-status-badge>
                    <button type="button" class="btn-secondary" (click)="openEdit(teacher)">
                      Modifier
                    </button>
                    <button
                      type="button"
                      class="btn-outline-danger"
                      (click)="deleteTeacher(teacher.id)"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </article>
            }
          </div>
        }
      }

      @if (activeMode()) {
        <div class="rounded-3xl border border-line bg-surface p-5 shadow-card">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-principalText">
                {{ activeMode() === 'create' ? 'Ajouter un enseignant' : 'Modifier un enseignant' }}
              </h2>
              <p class="text-sm text-secondaryText">
                {{
                  activeMode() === 'create'
                    ? 'Renseignez les informations du nouvel enseignant.'
                    : 'Mettez à jour les informations de l enseignant.'
                }}
              </p>
            </div>
            <button type="button" class="btn-ghost" (click)="closeForm()">Fermer</button>
          </div>

          <div class="grid gap-4 py-4 md:grid-cols-2">
            <label class="form-field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                [ngModel]="form().email"
                (ngModelChange)="form.update((current) => ({ ...current, email: $event }))"
                required
              />
            </label>

            <label class="form-field">
              <span>Prénom</span>
              <input
                type="text"
                name="firstName"
                [ngModel]="form().firstName"
                (ngModelChange)="form.update((current) => ({ ...current, firstName: $event }))"
                required
              />
            </label>

            <label class="form-field">
              <span>Nom</span>
              <input
                type="text"
                name="lastName"
                [ngModel]="form().lastName"
                (ngModelChange)="form.update((current) => ({ ...current, lastName: $event }))"
                required
              />
            </label>

            <label class="form-field">
              <span>URL photo de profil</span>
              <input
                type="url"
                name="pfpUrl"
                [ngModel]="form().pfpUrl"
                (ngModelChange)="form.update((current) => ({ ...current, pfpUrl: $event }))"
              />
            </label>
          </div>

          <div class="flex flex-wrap gap-3 pt-4">
            <button
              type="button"
              class="btn-primary"
              [disabled]="!canSubmit() || isLoading()"
              (click)="submitForm()"
            >
              {{ activeMode() === 'create' ? 'Créer' : 'Enregistrer' }}
            </button>
            <button type="button" class="btn-outline" (click)="closeForm()">Annuler</button>
          </div>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeachersPage implements OnInit {
  private readonly teacherService = inject(TeacherService);

  readonly teachers = signal<TeacherUser[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly activeMode = signal<'create' | 'edit' | null>(null);
  readonly selectedTeacher = signal<TeacherUser | null>(null);
  readonly form = signal<TeacherRequest>({ email: '', firstName: '', lastName: '', pfpUrl: '' });

  ngOnInit(): void {
    this.loadTeachers();
  }

  loadTeachers(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.teacherService
      .getAll()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (teachers) => this.teachers.set(teachers),
        error: () => this.error.set('Impossible de charger la liste des enseignants.'),
      });
  }

  openCreate(): void {
    this.selectedTeacher.set(null);
    this.activeMode.set('create');
    this.form.set({ email: '', firstName: '', lastName: '', pfpUrl: '' });
  }

  openEdit(teacher: TeacherUser): void {
    this.selectedTeacher.set(teacher);
    this.activeMode.set('edit');
    this.form.set({
      email: teacher.email,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      pfpUrl: teacher.pfpUrl ?? '',
    });
  }

  closeForm(): void {
    this.activeMode.set(null);
    this.error.set(null);
  }

  canSubmit(): boolean {
    const values = this.form();
    return Boolean(values.email?.trim() && values.firstName?.trim() && values.lastName?.trim());
  }

  submitForm(): void {
    if (!this.canSubmit()) return;

    this.isLoading.set(true);
    this.error.set(null);

    const rawRequest = this.form();
    const request: TeacherRequest = {
      ...rawRequest,
      pfpUrl: rawRequest.pfpUrl?.trim() ? rawRequest.pfpUrl.trim() : null,
    };

    const action =
      this.activeMode() === 'edit' && this.selectedTeacher()
        ? this.teacherService.update(this.selectedTeacher()!.id, request)
        : this.teacherService.create(request);

    action.pipe(finalize(() => this.isLoading.set(false))).subscribe({
      next: () => {
        this.loadTeachers();
        this.closeForm();
      },
      error: () => this.error.set('Impossible de sauvegarder l enseignant.'),
    });
  }

  deleteTeacher(id: number): void {
    const confirmed = window.confirm('Confirmer la suppression de cet enseignant ?');
    if (!confirmed) return;

    this.isLoading.set(true);
    this.error.set(null);
    this.teacherService
      .delete(id)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => this.loadTeachers(),
        error: () => this.error.set('Impossible de supprimer l enseignant.'),
      });
  }
}
