import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AttendanceSessionMethod } from '../../../../core/attendance/models/attendance.model';
import { AttendanceService } from '../../../../core/attendance/services/attendance.service';
import { Groupe } from '../../../../core/structure/models/groupe.model';
import { Module } from '../../../../core/structure/models/module.model';
import { GroupeService } from '../../../../core/structure/services/groupe.service';
import { ModuleService } from '../../../../core/structure/services/module.service';

export type AttendanceMethod = 'manual' | 'qr-code' | 'facial';

@Component({
  selector: 'app-start-session',
  imports: [FormsModule],
  templateUrl: './start-session.html',
  styleUrl: './start-session.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartSession implements OnInit {
  private readonly router = inject(Router);
  private readonly attendanceService = inject(AttendanceService);
  private readonly groupeService = inject(GroupeService);
  private readonly moduleService = inject(ModuleService);

  readonly groups = signal<Groupe[]>([]);
  readonly modules = signal<Module[]>([]);
  readonly selectedGroupIds = signal<number[]>([]);
  readonly selectedModuleId = signal<number | null>(null);
  readonly roomLabel = signal('Amphi A');
  readonly loading = signal(false);
  readonly starting = signal(false);
  readonly error = signal<string | null>(null);

  readonly selectedModule = computed(
    () => this.modules().find((module) => module.id === this.selectedModuleId()) ?? null,
  );

  readonly selectedGroups = computed(() => {
    const ids = new Set(this.selectedGroupIds());
    return this.groups().filter((group) => ids.has(group.id));
  });

  readonly methods: { id: AttendanceMethod; label: string; description: string; icon: string }[] = [
    {
      id: 'manual',
      label: 'Manuel',
      description: 'Marquer chaque etudiant manuellement sur la liste.',
      icon: 'fa-solid fa-hand-pointer',
    },
    {
      id: 'qr-code',
      label: 'Qr Code',
      description: 'Generer un code que les etudiants scannent avec leur mobile.',
      icon: 'fa-solid fa-qrcode',
    },
    {
      id: 'facial',
      label: 'Reconnaissance Faciale',
      description: 'Identification automatique via la camera du professeur.',
      icon: 'fa-solid fa-face-smile',
    },
  ];

  readonly selectedMethod = signal<AttendanceMethod | null>(null);
  readonly showConfirmModal = signal(false);

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set(null);

    this.groupeService
      .getAll()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (groups) => this.groups.set(groups),
        error: () => this.error.set('Impossible de charger les groupes.'),
      });

    this.moduleService.getAll().subscribe({
      next: (modules) => this.modules.set(modules),
      error: () => this.error.set('Impossible de charger les modules.'),
    });
  }

  selectMethod(method: AttendanceMethod): void {
    this.selectedMethod.set(method);
  }

  toggleGroup(groupId: number, checked: boolean): void {
    this.selectedGroupIds.update((ids) =>
      checked ? Array.from(new Set([...ids, groupId])) : ids.filter((id) => id !== groupId),
    );
  }

  updateModule(value: string): void {
    this.selectedModuleId.set(value ? Number(value) : null);
  }

  updateRoom(value: string): void {
    this.roomLabel.set(value);
  }

  openConfirmModal(): void {
    if (!this.canStart()) return;
    this.showConfirmModal.set(true);
  }

  cancelModal(): void {
    this.showConfirmModal.set(false);
  }

  confirmAndStart(): void {
    const method = this.selectedMethod();
    const module = this.selectedModule();
    const groupIds = this.selectedGroupIds();
    const roomLabel = this.roomLabel().trim();
    if (!method || !module || groupIds.length === 0 || !roomLabel) return;

    this.showConfirmModal.set(false);
    this.starting.set(true);
    this.error.set(null);

    this.attendanceService
      .createSession({
        groupIds,
        courseLabel: module.name,
        roomLabel,
        method: this.toApiMethod(method),
      })
      .pipe(finalize(() => this.starting.set(false)))
      .subscribe({
        next: (session) =>
          this.router.navigate([this.routeFor(method)], {
            queryParams: { sessionId: session.sessionId },
          }),
        error: (error) => this.error.set(this.startSessionErrorMessage(error)),
      });
  }

  methodLabel(): string {
    return this.methods.find((m) => m.id === this.selectedMethod())?.label ?? '';
  }

  canStart(): boolean {
    return Boolean(
      this.selectedMethod() &&
        this.selectedModule() &&
        this.selectedGroupIds().length &&
        this.roomLabel().trim(),
    );
  }

  private startSessionErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const backendMessage = typeof error.error?.message === 'string' ? error.error.message : null;
      if (backendMessage) {
        return backendMessage;
      }
      if (error.status === 409) {
        return 'Vous avez deja une session active. Terminez-la avant de demarrer une autre session.';
      }
      if (error.status === 0) {
        return 'Service de presence indisponible. Verifiez que le backend est demarre.';
      }
    }
    return 'Impossible de demarrer la session.';
  }

  private toApiMethod(method: AttendanceMethod): AttendanceSessionMethod {
    const methods: Record<AttendanceMethod, AttendanceSessionMethod> = {
      manual: 'MANUAL',
      'qr-code': 'QR_CODE',
      facial: 'FACE_ID',
    };
    return methods[method];
  }

  private routeFor(method: AttendanceMethod): string {
    const routes: Record<AttendanceMethod, string> = {
      manual: '/teacher/mark-attendance/manual',
      'qr-code': '/teacher/mark-attendance/start-session/qr-code-marking',
      facial: '/teacher/mark-attendance/start-session/facial-recognition',
    };
    return routes[method];
  }
}
