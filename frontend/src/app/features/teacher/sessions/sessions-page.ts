import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import {
  AttendanceSessionResponse,
  AttendanceSessionSummary,
  AttendanceStudentStatus,
  AttendanceStudentView,
} from '../../../core/attendance/models/attendance.model';
import { AttendanceService } from '../../../core/attendance/services/attendance.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

interface PendingChange {
  studentId: number;
  originalStatus: AttendanceStudentStatus;
  newStatus: 'PRESENT' | 'ABSENT';
}

@Component({
  selector: 'app-teacher-sessions-page',
  standalone: true,
  imports: [DatePipe, PageHeader, RouterLink, StatusBadge],
  templateUrl: './sessions-page.html',
  styleUrl: './sessions-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherSessionsPage implements OnInit {
  private readonly attendanceService = inject(AttendanceService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly sessions = signal<AttendanceSessionSummary[]>([]);
  readonly loading = signal(false);
  readonly loadingDetails = signal(false);
  readonly updatingStudentId = signal<number | null>(null);
  readonly error = signal<string | null>(null);
  readonly detailError = signal<string | null>(null);
  readonly totalElements = signal(0);
  readonly selectedSession = signal<AttendanceSessionResponse | null>(null);
  readonly originalSession = signal<AttendanceSessionResponse | null>(null);
  readonly pendingChanges = signal<PendingChange[]>([]);
  readonly isSaving = signal(false);
  readonly selectedSessionId = signal<number | null>(null); // Pour suivre la session sélectionnée
  readonly courseFilter = signal<string | null>(null);

  readonly exportColumns = signal<{ id: string; label: string; selected: boolean }[]>([
    { id: 'numApogee', label: 'Code Apogée', selected: true },
    { id: 'lastName', label: 'Nom', selected: true },
    { id: 'firstName', label: 'Prénom', selected: true },
    { id: 'email', label: 'Email', selected: true },
    { id: 'groupId', label: 'Groupe', selected: true },
    { id: 'status', label: 'Statut', selected: true },
    { id: 'markedAt', label: 'Date de pointage', selected: false },
    { id: 'markMethod', label: 'Méthode de pointage', selected: false },
    { id: 'deviceId', label: 'ID Appareil', selected: false },
    { id: 'markedGpsLat', label: 'GPS Latitude', selected: false },
    { id: 'markedGpsLon', label: 'GPS Longitude', selected: false },
  ]);
  readonly showExportConfig = signal(false);

  readonly filteredSessions = computed(() => {
    const filter = this.courseFilter();
    const allSessions = this.sessions();
    if (!filter) {
      return allSessions;
    }
    return allSessions.filter((session) => session.courseLabel === filter);
  });

  readonly finalizedCount = computed(
    () => this.sessions().filter((session) => session.status === 'FINALIZED').length,
  );

  readonly pendingChangesCount = computed(() => this.pendingChanges().length);

  readonly hasChanges = computed(() => this.pendingChanges().length > 0);

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const filter = params['moduleName'] || null;
      this.courseFilter.set(filter);
    });
    this.loadSessions();
  }

  loadSessions(): void {
    this.loading.set(true);
    this.error.set(null);

    this.attendanceService
      .getTeacherSessions({ page: 0, size: 20, sort: 'startedAt,desc' })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => {
          this.sessions.set(page.items);
          this.totalElements.set(page.totalElements);
        },
        error: () => this.error.set('Impossible de charger l historique des sessions.'),
      });
  }

  attendanceRate(session: AttendanceSessionSummary): number {
    const total = session.presentCount + session.absentCount + session.unknownCount;
    return total ? Math.round((session.presentCount / total) * 100) : 0;
  }

  sessionStatusLabel(session: AttendanceSessionSummary): string {
    return session.status === 'FINALIZED' ? 'Finalisee' : 'En cours';
  }

  sessionDateLabel(session: AttendanceSessionSummary): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(session.startedAt));
  }

  sessionTimeLabel(session: AttendanceSessionSummary): string {
    const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const start = timeFormatter.format(new Date(session.startedAt));
    if (!session.endedAt) {
      return start;
    }

    return `${start} - ${timeFormatter.format(new Date(session.endedAt))}`;
  }

  methodLabel(method: AttendanceSessionSummary['method']): string {
    switch (method) {
      case 'QR_CODE':
        return 'QR code';
      case 'FACE_ID':
        return 'Reconnaissance faciale';
      case 'MANUAL':
        return 'Manuel';
      default:
        return method;
    }
  }

  statusVariant(session: AttendanceSessionSummary): 'success' | 'warning' | 'info' {
    if (session.status === 'FINALIZED') return 'success';
    return 'warning';
  }

  resumeSessionRoute(session: AttendanceSessionResponse): string {

        return '/teacher/mark-attendance/start-session/qr-code-marking';

    
  }

  openDetails(session: AttendanceSessionSummary): void {
    this.loadingDetails.set(true);
    this.detailError.set(null);
    this.pendingChanges.set([]);
    this.originalSession.set(null);
    this.selectedSessionId.set(session.sessionId);

    this.attendanceService
      .getSession(session.sessionId)
      .pipe(finalize(() => this.loadingDetails.set(false)))
      .subscribe({
        next: (details) => {
          this.originalSession.set(JSON.parse(JSON.stringify(details)));
          this.selectedSession.set(details);
        },
        error: () => this.detailError.set('Impossible de charger les details de la session.'),
      });
  }

  closeDetails(): void {
    if (this.hasChanges()) {
      if (
        confirm('Des modifications sont en attente. Voulez-vous vraiment fermer sans sauvegarder ?')
      ) {
        this.resetModal();
      }
    } else {
      this.resetModal();
    }
  }

  clearFilter(): void {
    this.courseFilter.set(null);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { moduleName: null },
      queryParamsHandling: 'merge',
    });
  }

  private resetModal(): void {
    this.selectedSession.set(null);
    this.originalSession.set(null);
    this.pendingChanges.set([]);
    this.detailError.set(null);
    this.isSaving.set(false);
    this.selectedSessionId.set(null);
  }

  updateStudentStatus(student: AttendanceStudentView, status: 'PRESENT' | 'ABSENT'): void {
    const session = this.selectedSession();
    if (!session || student.status === status || this.isSaving()) {
      return;
    }

    // Mettre à jour localement
    const students = (session.students ?? []).map((entry) =>
      entry.studentId === student.studentId ? { ...entry, status } : entry,
    );

    this.selectedSession.set({
      ...session,
      students,
    });

    // Ajouter aux changements en attente
    const existingChangeIndex = this.pendingChanges().findIndex(
      (change) => change.studentId === student.studentId,
    );

    if (existingChangeIndex >= 0) {
      const changes = this.pendingChanges();
      changes[existingChangeIndex] = {
        ...changes[existingChangeIndex],
        newStatus: status,
      };
      this.pendingChanges.set([...changes]);
    } else {
      this.pendingChanges.set([
        ...this.pendingChanges(),
        {
          studentId: student.studentId,
          originalStatus: student.status,
          newStatus: status,
        },
      ]);
    }
  }

  cancelChanges(): void {
    const original = this.originalSession();
    if (original) {
      this.selectedSession.set(original);
      this.pendingChanges.set([]);
    }
    // Fermer la modale après annulation
    this.resetModal();
  }

  confirmChanges(): void {
    const session = this.selectedSession();
    const changes = this.pendingChanges();

    if (!session || changes.length === 0 || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.detailError.set(null);

    // Créer un tableau de promesses pour toutes les mises à jour
    const updatePromises = changes.map((change) => {
      return new Promise<void>((resolve, reject) => {
        this.attendanceService
          .updateAttendance(session.sessionId, {
            studentId: change.studentId,
            status: change.newStatus,
          })
          .subscribe({
            next: (response) => {
              // Mettre à jour la session avec la réponse
              const current = this.selectedSession();
              if (current) {
                const students = (current.students ?? []).map((entry) =>
                  entry.studentId === response.studentId
                    ? {
                        ...entry,
                        status: response.status,
                        markMethod: response.markMethod,
                        markedAt: response.markedAt,
                      }
                    : entry,
                );

                this.selectedSession.set({
                  ...current,
                  students,
                  presentCount: response.presentCount,
                  absentCount: response.absentCount,
                  unknownCount: response.unknownCount,
                });
              }
              resolve();
            },
            error: (error) => {
              reject(error);
            },
          });
      });
    });

    // Attendre que toutes les mises à jour soient terminées
    Promise.all(updatePromises)
      .then(() => {
        const updatedSession = this.selectedSession();
        if (updatedSession) {
          this.sessions.update((sessions) =>
            sessions.map((entry) =>
              entry.sessionId === updatedSession.sessionId
                ? {
                    ...entry,
                    presentCount: updatedSession.presentCount ?? 0,
                    absentCount: updatedSession.absentCount ?? 0,
                    unknownCount: updatedSession.unknownCount ?? 0,
                  }
                : entry,
            ),
          );
        }

        this.originalSession.set(JSON.parse(JSON.stringify(updatedSession)));
        this.pendingChanges.set([]);
        this.isSaving.set(false);

        // Fermer la modale après confirmation réussie
        this.resetModal();

        // Optionnel: afficher un message de succès
        // Vous pouvez ajouter un toast ou une notification ici
      })
      .catch((error) => {
        this.isSaving.set(false);
        this.detailError.set('Erreur lors de la sauvegarde des modifications. Veuillez réessayer.');
        console.error('Error saving changes:', error);
      });
  }

  studentStatusLabel(status: AttendanceStudentStatus): string {
    switch (status) {
      case 'PRESENT':
        return 'Present';
      case 'ABSENT':
        return 'Absent';
      case 'JUSTIFIED':
        return 'Justifie';
      default:
        return 'Inconnu';
    }
  }

  studentStatusVariant(
    status: AttendanceStudentStatus,
  ): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
    switch (status) {
      case 'PRESENT':
        return 'success';
      case 'ABSENT':
        return 'error';
      case 'JUSTIFIED':
        return 'info';
      default:
        return 'neutral';
    }
  }

  toggleColumnSelection(id: string): void {
    this.exportColumns.update((cols) =>
      cols.map((col) => (col.id === id ? { ...col, selected: !col.selected } : col)),
    );
  }

  exportToExcel(): void {
    const session = this.selectedSession();
    if (!session) return;

    const cols = this.exportColumns();
    const selectedCols = cols.filter((col) => col.selected);

    if (selectedCols.length === 0) {
      alert('Veuillez sélectionner au moins une colonne à exporter.');
      return;
    }

    const students = session.students ?? [];
    const formattedDate = session.startedAt ? new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(session.startedAt)) : '';
    const sessionStatusText = session.status === 'FINALIZED' ? 'Finalisée' : 'En cours';

    let html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Émargement</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <meta http-equiv="content-type" content="text/html; charset=UTF-8">
  <style>
    th { background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-family: sans-serif; }
    td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-family: sans-serif; }
    .title { font-size: 16px; font-weight: bold; color: #1e3a8a; font-family: sans-serif; }
    .meta { font-size: 12px; color: #475569; font-family: sans-serif; }
  </style>
</head>
<body>
  <table>
    <tr>
      <td colspan="${selectedCols.length}" class="title">Rapport d'Émargement - ${session.courseLabel}</td>
    </tr>
    <tr>
      <td colspan="${selectedCols.length}" class="meta">Date : ${formattedDate} | Salle : ${session.roomLabel || 'Non renseignée'} | Statut : ${sessionStatusText}</td>
    </tr>
    <tr>
      <td colspan="${selectedCols.length}"></td>
    </tr>
    <tr>
`;

    // Add headers
    selectedCols.forEach((col) => {
      html += `      <th>${col.label}</th>\n`;
    });
    html += `    </tr>\n`;

    // Add student data
    students.forEach((student) => {
      html += `    <tr>\n`;
      selectedCols.forEach((col) => {
        let val = '';
        if (col.id === 'status') {
          val = this.studentStatusLabel(student.status);
        } else if (col.id === 'markMethod') {
          val = student.markMethod ? this.methodLabel(student.markMethod as any) : 'N/A';
        } else if (col.id === 'markedAt') {
          val = student.markedAt ? new Intl.DateTimeFormat('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }).format(new Date(student.markedAt)) : 'N/A';
        } else {
          val = (student as any)[col.id]?.toString() ?? '';
        }
        html += `      <td>${val}</td>\n`;
      });
      html += `    </tr>\n`;
    });

    html += `
  </table>
</body>
</html>
`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeCourseName = session.courseLabel.replace(/[^a-zA-Z0-9]/g, '_');
    link.href = url;
    link.download = `emargement_${safeCourseName}_${session.sessionId}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
