import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

import { AuthService } from '../../../core/auth/services/auth.service';
import { JustificationDto } from '../../../core/justifications/justification.model';
import { JustificationService } from '../../../core/justifications/justification.service';
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

function createAttachmentPreview(title: string, subtitle: string, color: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="620" viewBox="0 0 900 620">
      <rect width="900" height="620" rx="34" fill="#f8fafc"/>
      <rect x="72" y="54" width="756" height="512" rx="24" fill="#ffffff" stroke="#dbe4ee" stroke-width="3"/>
      <rect x="118" y="106" width="250" height="22" rx="11" fill="${color}"/>
      <rect x="118" y="154" width="540" height="14" rx="7" fill="#cbd5e1"/>
      <rect x="118" y="186" width="470" height="14" rx="7" fill="#e2e8f0"/>
      <rect x="118" y="218" width="600" height="14" rx="7" fill="#e2e8f0"/>
      <rect x="118" y="288" width="664" height="150" rx="18" fill="#eef6ff" stroke="#bfdbfe" stroke-width="2"/>
      <path d="M164 394c54-74 98-84 146-30 36 40 64 36 106-10 52-58 102-44 168 40" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round"/>
      <circle cx="636" cy="334" r="34" fill="#fbbf24"/>
      <rect x="118" y="486" width="180" height="14" rx="7" fill="#cbd5e1"/>
      <rect x="566" y="478" width="174" height="42" rx="21" fill="${color}" opacity="0.16"/>
      <text x="118" y="85" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#0f172a">${title}</text>
      <text x="118" y="468" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#334155">${subtitle}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

@Component({
  selector: 'app-teacher-justifications-page',
  standalone: true,
  imports: [PageHeader, StatusBadge, Modal],
  templateUrl: './justifications-page.html',
  styleUrl: './justifications-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherJustificationsPage implements OnInit {
  private readonly justificationService = inject(JustificationService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  readonly rows = signal<readonly TeacherJustificationRow[]>([]);
  readonly selectedJustification = signal<TeacherJustificationRow | null>(null);
  readonly loading = signal(false);
  readonly reviewingId = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly pendingCount = computed(
    () => this.rows().filter((row) => row.status === 'En attente').length,
  );

  ngOnInit(): void {
    this.loadJustifications();
  }

  loadJustifications(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.justificationService
      .getJustifications()
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
      .approveJustification(row.id, this.buildReviewPayload())
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
      .declineJustification(row.id, this.buildReviewPayload())
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

  private buildReviewPayload() {
    const user = this.authService.currentUser;
    const reviewerName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();

    return {
      reviewerId: user?.id,
      reviewerName: reviewerName || user?.email || 'Enseignant',
      reviewerRole: 'TEACHER' as const,
      comment: 'Decision traitee depuis l espace enseignant.',
    };
  }

  private toRow(justification: JustificationDto): TeacherJustificationRow {
    const statusData = this.statusData(justification.status);
    const documentUrl = justification.documentUrl?.trim() || null;

    return {
      id: justification.id,
      studentName: justification.studentName || 'Etudiant non renseigne',
      studentCode: justification.studentCode || '-',
      module: justification.module || 'Module non renseigne',
      sessionDate: this.formatDateTime(justification.sessionDate),
      submittedAt: this.formatDate(justification.submittedAt),
      reason: justification.reason || 'Motif non renseigne',
      attachmentName: this.attachmentName(documentUrl),
      attachmentPreviewUrl:
        documentUrl ??
        createAttachmentPreview('Justificatif', 'Piece jointe non disponible', '#64748b'),
      comment: justification.reason || 'Aucun commentaire etudiant.',
      status: statusData.status,
      statusVariant: statusData.variant,
      reviewComment: justification.teacherComment || 'Aucun commentaire enseignant.',
      reviewedBy: justification.reviewedBy,
      reviewedAt: justification.reviewedAt ? this.formatDateTime(justification.reviewedAt) : null,
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
    const message = error.error?.message || error.error?.error || error.message;
    return typeof message === 'string' && message.trim()
      ? message
      : 'Une erreur est survenue.';
  }
}
