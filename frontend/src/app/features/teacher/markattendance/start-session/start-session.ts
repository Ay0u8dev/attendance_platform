import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { finalize } from 'rxjs';

import { AttendanceSessionResponse } from '../../../../core/attendance/models/attendance.model';
import { AttendanceService } from '../../../../core/attendance/services/attendance.service';
import { Groupe } from '../../../../core/structure/models/groupe.model';
import { Module } from '../../../../core/structure/models/module.model';
import { GroupeService } from '../../../../core/structure/services/groupe.service';
import { ModuleService } from '../../../../core/structure/services/module.service';

interface GpsPosition {
  readonly lat: string;
  readonly lon: string;
}

type LocationType = 'Amphi' | 'Salle TP' | 'Salle TD';
type DropdownKey = 'module' | 'locationType' | 'room';

interface LocationOption {
  readonly type: LocationType;
  readonly label: string;
}

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
  private readonly sanitizer = inject(DomSanitizer);

  readonly groups = signal<Groupe[]>([]);
  readonly modules = signal<Module[]>([]);
  readonly selectedGroupIds = signal<number[]>([]);
  readonly selectedModuleId = signal<number | null>(null);
  readonly locationTypes: LocationType[] = ['Amphi', 'Salle TP', 'Salle TD'];
  readonly locations: LocationOption[] = [
    { type: 'Amphi', label: 'Amphi 1' },
    { type: 'Amphi', label: 'Amphi 2' },
    { type: 'Amphi', label: 'Amphi A' },
    { type: 'Salle TP', label: 'Salle TP 1' },
    { type: 'Salle TP', label: 'Salle TP 2' },
    { type: 'Salle TP', label: 'Salle TP Info' },
    { type: 'Salle TD', label: 'Salle AR12' },
    { type: 'Salle TD', label: 'Salle TD 1' },
    { type: 'Salle TD', label: 'Salle TD 2' },
  ];
  readonly selectedLocationType = signal<LocationType>('Amphi');
  readonly selectedRoomLabel = signal('Amphi 1');
  readonly loading = signal(false);
  readonly starting = signal(false);
  readonly locating = signal(false);
  readonly gpsPosition = signal<GpsPosition | null>(null);
  readonly error = signal<string | null>(null);
  readonly openDropdown = signal<DropdownKey | null>(null);

  readonly selectedModule = computed(
    () => this.modules().find((module) => module.id === this.selectedModuleId()) ?? null,
  );

  readonly selectedGroups = computed(() => {
    const ids = new Set(this.selectedGroupIds());
    return this.groups().filter((group) => ids.has(group.id));
  });

  readonly availableLocations = computed(() =>
    this.locations.filter((location) => location.type === this.selectedLocationType()),
  );

  readonly roomLabel = computed(() => this.selectedRoomLabel());
  readonly gpsMapUrl = computed<SafeResourceUrl | null>(() => {
    const position = this.gpsPosition();
    if (!position) {
      return null;
    }

    const lat = Number(position.lat);
    const lon = Number(position.lon);
    const delta = 0.003;
    const url =
      `https://www.openstreetmap.org/export/embed.html?bbox=${lon - delta}%2C${lat - delta}%2C${lon + delta}%2C${lat + delta}` +
      `&layer=mapnik&marker=${lat}%2C${lon}`;

    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  readonly showConfirmModal = signal(false);
  readonly showActiveSessionModal = signal(false);
  readonly activeSessionInfo = signal<AttendanceSessionResponse | null>(null);

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

    this.refreshLocation();
  }

  toggleGroup(groupId: number, checked: boolean): void {
    this.selectedGroupIds.update((ids) =>
      checked ? Array.from(new Set([...ids, groupId])) : ids.filter((id) => id !== groupId),
    );
  }

  updateModule(value: string | number): void {
    this.selectedModuleId.set(value ? Number(value) : null);
    this.closeDropdown();
  }

  updateLocationType(value: LocationType): void {
    this.selectedLocationType.set(value);
    const firstLocation = this.locations.find((location) => location.type === value);
    this.selectedRoomLabel.set(firstLocation?.label ?? '');
    this.closeDropdown();
  }

  updateRoom(value: string): void {
    this.selectedRoomLabel.set(value);
    this.closeDropdown();
  }

  toggleDropdown(dropdown: DropdownKey): void {
    this.openDropdown.update((current) => (current === dropdown ? null : dropdown));
  }

  closeDropdown(): void {
    this.openDropdown.set(null);
  }

  openConfirmModal(): void {
    if (!this.canStart()) return;
    this.showConfirmModal.set(true);
  }

  cancelModal(): void {
    this.showConfirmModal.set(false);
  }

  async confirmAndStart(): Promise<void> {
    const module = this.selectedModule();
    const groupIds = this.selectedGroupIds();
    const roomLabel = this.roomLabel().trim();
    if (!module || groupIds.length === 0 || !roomLabel) return;

    this.showConfirmModal.set(false);
    this.starting.set(true);
    this.error.set(null);

    const position = await this.ensureLocation();
    if (!position) {
      this.starting.set(false);
      return;
    }

    this.attendanceService
      .createSession({
        groupIds,
        courseLabel: module.name,
        roomLabel,
        gpsLat: position.lat,
        gpsLon: position.lon,
      })
      .pipe(finalize(() => this.starting.set(false)))
      .subscribe({
        next: (session) => {
          this.openAttendanceSession(session);
        },
        error: (error) => this.handleStartSessionError(error),
      });
  }

  methodLabel(): string {
    return 'QR, manuel et reconnaissance faciale';
  }

  canStart(): boolean {
    return Boolean(
      this.selectedModule() &&
      this.selectedGroupIds().length &&
      this.selectedLocationType() &&
      this.roomLabel().trim() &&
      (this.gpsPosition() || !this.locating()),
    );
  }

  refreshLocation(): void {
    if (!this.supportsGeolocation()) {
      this.error.set('La geolocalisation du navigateur est requise pour demarrer une session.');
      return;
    }

    this.locating.set(true);
    this.readCurrentPosition()
      .then((position) => {
        this.gpsPosition.set(position);
        this.error.set(null);
      })
      .catch(() => {
        this.gpsPosition.set(null);
        this.error.set(
          'Impossible de recuperer votre position. Autorisez la localisation puis reessayez.',
        );
      })
      .finally(() => this.locating.set(false));
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

  private handleStartSessionError(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 409) {
      this.fetchAndShowActiveSession();
      return;
    }
    this.error.set(this.startSessionErrorMessage(error));
  }

  private fetchAndShowActiveSession(): void {
    this.starting.set(true);
    this.attendanceService
      .getActiveSession()
      .pipe(finalize(() => this.starting.set(false)))
      .subscribe({
        next: (session) => {
          this.activeSessionInfo.set(session);
          this.showActiveSessionModal.set(true);
        },
        error: (err) => {
          if (err.status === 404) {
            // Incohérence backend : 409 dit "active" mais 404 dit "aucune"
            this.error.set(
              'Une session active a été détectée mais ne peut pas être récupérée. Veuillez réessayer ou contacter le support.',
            );
          } else {
            this.error.set(
              'Une session active existe, mais impossible de la charger pour le moment.',
            );
          }
        },
      });
  }

  private retryCreateSession(): void {
    const module = this.selectedModule();
    const groupIds = this.selectedGroupIds();
    const roomLabel = this.roomLabel().trim();

    if (!module || groupIds.length === 0 || !roomLabel) return;

    this.starting.set(true);
    this.error.set(null);

    this.ensureLocation().then((position) => {
      if (!position) {
        this.starting.set(false);
        return;
      }

      this.attendanceService
        .createSession({
          groupIds,
          courseLabel: module.name,
          roomLabel,
          gpsLat: position.lat,
          gpsLon: position.lon,
        })
        .pipe(finalize(() => this.starting.set(false)))
        .subscribe({
          next: (session) => this.openAttendanceSession(session),
          error: (error) => this.handleStartSessionError(error),
        });
    });
  }

  goToActiveSession(): void {
    this.showActiveSessionModal.set(false);
    const session = this.activeSessionInfo();
    if (session) {
      this.openAttendanceSession(session);
    }
  }

  cancelActiveSession(): void {
    this.showActiveSessionModal.set(false);
    this.activeSessionInfo.set(null);
  }

  endActiveAndCreateNew(): void {
    const session = this.activeSessionInfo();
    if (!session) return;

    this.showActiveSessionModal.set(false);
    this.starting.set(true);

    this.attendanceService.endSession(this.readSessionId(session)!).subscribe({
      next: () => {
        this.starting.set(false);
        this.confirmAndStart();
      },
      error: () => {
        this.starting.set(false);
        this.error.set('Impossible de terminer la session active.');
      },
    });
  }

  private openActiveSession(): void {
    this.starting.set(true);
    this.attendanceService
      .getActiveSession()
      .pipe(finalize(() => this.starting.set(false)))
      .subscribe({
        next: (session) => this.openAttendanceSession(session),
        error: () =>
          this.error.set(
            'Une session active existe deja, mais elle est impossible a charger pour le moment.',
          ),
      });
  }

  private openAttendanceSession(session: AttendanceSessionResponse): void {
    const sessionId = this.readSessionId(session);
    this.router.navigate(['/teacher/mark-attendance/start-session/qr-code-marking'], {
      queryParams: sessionId ? { sessionId } : undefined,
    });
  }

  private async ensureLocation(): Promise<GpsPosition | null> {
    const current = this.gpsPosition();
    if (current) {
      return current;
    }

    if (!this.supportsGeolocation()) {
      this.error.set('La geolocalisation du navigateur est requise pour demarrer une session.');
      return null;
    }

    this.locating.set(true);
    try {
      const position = await this.readCurrentPosition();
      this.gpsPosition.set(position);
      return position;
    } catch {
      this.error.set(
        'Impossible de recuperer votre position. Autorisez la localisation puis reessayez.',
      );
      return null;
    } finally {
      this.locating.set(false);
    }
  }

  private readCurrentPosition(): Promise<GpsPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            lat: position.coords.latitude.toFixed(6),
            lon: position.coords.longitude.toFixed(6),
          }),
        reject,
        {
          enableHighAccuracy: true,
          maximumAge: 30000,
          timeout: 10000,
        },
      );
    });
  }

  private supportsGeolocation(): boolean {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }

  private readSessionId(session: AttendanceSessionResponse): number | null {
    return session.sessionId ?? session.id ?? null;
  }
}
