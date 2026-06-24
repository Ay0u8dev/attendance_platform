import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

import { JustificationDto } from '../../../core/justifications/justification.model';
import { JustificationService } from '../../../core/justifications/justification.service';
import { DataTableCellDef } from '../../../shared/components/data-table/data-table-cell-def';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../shared/components/data-table/data-table.types';
import { Modal } from '../../../shared/components/modal/modal';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { ToastService } from '../../../shared/components/toast/toast.service';

type TeacherJustificationStatus = 'En attente' | 'Approuvee' | 'Declinee';
type TeacherJustificationVariant = 'warning' | 'success' | 'error' | 'neutral';

interface TeacherJustificationRow {
  readonly id: number;
  readonly studentName: string;
  readonly studentCode: string;
  readonly module: string;
  readonly sessionDate: string;
  readonly submittedAt: string;
  readonly reason: string;
  readonly attachmentName: string;
  readonly attachmentPreviewUrl: string | null;
  readonly comment: string;
  readonly status: TeacherJustificationStatus;
  readonly statusVariant: TeacherJustificationVariant;
  readonly reviewComment: string;
  readonly reviewedBy: string | null;
  readonly reviewedAt: string | null;
}

@Component({
  selector: 'app-teacher-justifications-page',
  standalone: true,
  imports: [PageHeader, DataTable, DataTableCellDef, StatusBadge, Modal],
  templateUrl: './justifications-page.html',
  styleUrl: './justifications-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherJustificationsPage implements OnInit {
  private readonly justificationService = inject(JustificationService);
  private readonly toastService = inject(ToastService);

  readonly rows = signal<readonly TeacherJustificationRow[]>([]);
  readonly selectedJustification = signal<TeacherJustificationRow | null>(null);
  readonly loading = signal(false);
  readonly reviewingId = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly pendingCount = computed(
    () => this.rows().filter((row) => row.status === 'En attente').length,
  );

  readonly justificationRowId = (row: TeacherJustificationRow) => String(row.id);

  readonly columns: readonly DataTableColumn<TeacherJustificationRow>[] = [
    {
      id: 'student',
      header: 'Etudiant',
      accessor: (row) => row.studentName,
      width: '16rem',
    },
    {
      id: 'module',
      header: 'Module',
      accessor: (row) => row.module,
      width: '15rem',
    },
    {
      id: 'sessionDate',
      header: 'Seance',
      accessor: (row) => row.sessionDate,
      width: '13rem',
    },
    {
      id: 'reason',
      header: 'Motif',
      accessor: (row) => row.reason,
      width: '14rem',
    },
    {
      id: 'status',
      header: 'Statut',
      accessor: (row) => row.status,
      width: '10rem',
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: () => '',
      align: 'end',
      sortable: false,
      searchable: false,
      width: '18rem',
    },
  ];

  ngOnInit(): void {
    this.loadJustifications();
  }

  loadJustifications(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.justificationService
      .getTeacherJustifications()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (justifications) => {
          const rows = justifications.map((justification) => this.toRow(justification));
          this.rows.set(rows);
          this.syncSelectedRow(rows);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.errorLabel(error));
          this.toastService.error(
            'Justifications indisponibles',
            'Impossible de charger les demandes pour le moment.',
          );
        },
      });
  }

  approve(row: TeacherJustificationRow): void {
    this.reviewingId.set(row.id);
    this.justificationService
      .decide(row.id, {
        status: 'APPROVED',
        comment: 'Decision traitee depuis l espace enseignant.',
      })
      .pipe(finalize(() => this.reviewingId.set(null)))
      .subscribe({
        next: (justification) => {
          this.upsertRow(this.toRow(justification));
          this.toastService.success('Justification approuvee');
        },
        error: (error: HttpErrorResponse) => {
          this.toastService.error('Decision non enregistree', this.errorLabel(error));
        },
      });
  }

  decline(row: TeacherJustificationRow): void {
    this.reviewingId.set(row.id);
    this.justificationService
      .decide(row.id, {
        status: 'REJECTED',
        comment: 'Decision traitee depuis l espace enseignant.',
      })
      .pipe(finalize(() => this.reviewingId.set(null)))
      .subscribe({
        next: (justification) => {
          this.upsertRow(this.toRow(justification));
          this.toastService.success('Justification declinee');
        },
        error: (error: HttpErrorResponse) => {
          this.toastService.error('Decision non enregistree', this.errorLabel(error));
        },
      });
  }

  openDetails(row: TeacherJustificationRow): void {
    this.selectedJustification.set(row);
  }

  closeDetails(): void {
    this.selectedJustification.set(null);
  }

  openAttachment(row: TeacherJustificationRow): void {
    if (!row.attachmentPreviewUrl) {
      return;
    }

    window.open(row.attachmentPreviewUrl, '_blank', 'noopener,noreferrer');
  }

  private upsertRow(nextRow: TeacherJustificationRow): void {
    let updatedRows: readonly TeacherJustificationRow[] = [];
    this.rows.update((rows) => {
      updatedRows = rows.map((row) => (row.id === nextRow.id ? nextRow : row));
      return updatedRows;
    });
    this.syncSelectedRow(updatedRows);
  }

  private syncSelectedRow(rows: readonly TeacherJustificationRow[]): void {
    const selected = this.selectedJustification();
    if (!selected) {
      return;
    }

    this.selectedJustification.set(rows.find((row) => row.id === selected.id) ?? null);
  }

  private toRow(justification: JustificationDto): TeacherJustificationRow {
    const statusData = this.statusData(justification.status);
    const documentUrl = justification.attachmentUrl?.trim() || null;

    return {
      id: justification.id,
      studentName: justification.studentName || 'Etudiant non renseigne',
      studentCode: justification.studentCode || '-',
      module: justification.courseLabel || 'Module non renseigne',
      sessionDate: this.formatDateTime(justification.absenceStartedAt),
      submittedAt: this.formatDate(justification.createdAt),
      reason: justification.reason || 'Motif non renseigne',
      attachmentName: this.attachmentName(documentUrl),
      attachmentPreviewUrl: documentUrl,
      comment: justification.reason || 'Aucun commentaire etudiant.',
      status: statusData.status,
      statusVariant: statusData.variant,
      reviewComment: justification.decisionComment || 'Aucun commentaire de decision.',
      reviewedBy: justification.decidedBy,
      reviewedAt: justification.decidedAt ? this.formatDateTime(justification.decidedAt) : null,
    };
  }

  private statusData(status: JustificationDto['status']): {
    status: TeacherJustificationStatus;
    variant: TeacherJustificationVariant;
  } {
    switch (status) {
      case 'APPROVED':
        return { status: 'Approuvee', variant: 'success' };
      case 'REJECTED':
        return { status: 'Declinee', variant: 'error' };
      default:
        return { status: 'En attente', variant: 'warning' };
    }
  }

  private attachmentName(documentUrl: string | null): string {
    if (!documentUrl) {
      return 'Aucune piece jointe';
    }

    const cleanUrl = documentUrl.split('?')[0].split('#')[0];
    return decodeURIComponent(cleanUrl.split('/').pop() || 'Piece jointe');
  }

  private formatDate(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  }

  private formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  private errorLabel(error: HttpErrorResponse): string {
    switch (error.status) {
      case 403:
        return "Cette justification n'appartient pas a l'une de vos seances.";
      case 404:
        return 'Cette justification est introuvable.';
      case 409:
        return 'Cette justification a deja ete traitee.';
      default:
        return 'Une erreur est survenue. Reessayez dans quelques instants.';
    }
  }
}
