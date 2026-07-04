import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

import { AuthService } from '../../../core/auth/services/auth.service';
import { JustificationDto } from '../../../core/justifications/justification.model';
import { JustificationService } from '../../../core/justifications/justification.service';
import { StudentUser } from '../../../core/users/models/student.model';
import { StudentUserService } from '../../../core/users/services/student-user.service';
import { Modal } from '../../../shared/components/modal/modal';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
type TeacherJustificationStatus = 'En attente' | 'Approuvee' | 'Declinee';
type TeacherJustificationVariant = 'warning' | 'success' | 'error' | 'neutral';

type StudentAcademicMeta = {
  readonly formation: string | null;
  readonly className: string | null;
  readonly group: string | null;
};

interface TeacherJustificationRow {
  readonly id: number;
  readonly studentName: string;
  readonly studentCode: string;
  readonly studentFormation: string | null;
  readonly studentClass: string | null;
  readonly studentGroup: string | null;
  readonly studentMeta: readonly { label: string; value: string }[];
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
  imports: [FormsModule, PageHeader, StatusBadge, Modal],
  templateUrl: './justifications-page.html',
  styleUrl: './justifications-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherJustificationsPage implements OnInit {
  private readonly justificationService = inject(JustificationService);
  private readonly studentService = inject(StudentUserService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly rows = signal<readonly TeacherJustificationRow[]>([]);
  readonly selectedJustification = signal<TeacherJustificationRow | null>(null);
  readonly loading = signal(false);
  readonly reviewingId = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly reviewCommentDraft = signal('');
  private readonly studentMetadataByCode = signal<ReadonlyMap<string, StudentAcademicMeta>>(
    new Map(),
  );

  readonly pendingCount = computed(
    () => this.rows().filter((row) => row.status === 'En attente').length,
  );

  ngOnInit(): void {
    this.loadStudentMetadata();
    this.loadJustifications();
  }

  loadStudentMetadata(): void {
    this.studentService.getAll().subscribe({
      next: (students) => {
        this.studentMetadataByCode.set(this.buildStudentMetadataMap(students));
        this.enrichRowsWithStudentMetadata();
      },
      error: () => {
        // The justification list remains usable even if roster enrichment fails.
      },
    });
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
          this.closeDetails();
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
          this.closeDetails();
          this.toastService.success('Justification declinee');
        },
        error: (error: HttpErrorResponse) => {
          this.toastService.error('Decision non enregistree', this.errorLabel(error));
        },
      });
  }

  openDetails(row: TeacherJustificationRow): void {
    this.selectedJustification.set(row);
    this.reviewCommentDraft.set(
      row.reviewComment === 'Aucun commentaire enseignant.' ? '' : row.reviewComment,
    );
  }

  closeDetails(): void {
    this.selectedJustification.set(null);
    this.reviewCommentDraft.set('');
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
    const comment = this.reviewCommentDraft().trim();

    return {
      reviewerId: user?.id,
      reviewerName: reviewerName || user?.email || 'Enseignant',
      reviewerRole: 'TEACHER' as const,
      comment: comment || undefined,
    };
  }

  private toRow(justification: JustificationDto): TeacherJustificationRow {
    const statusData = this.statusData(justification.status);
    const documentUrl = this.justificationService.resolveDocumentUrl(justification.documentUrl);
    const rosterMeta = this.studentMetadataByCode().get(
      this.normalizeCode(justification.studentCode),
    );
    const studentFormation =
      this.normalizeOptional(justification.studentFormation) ?? rosterMeta?.formation ?? null;
    const studentClass =
      this.normalizeOptional(justification.studentClass) ?? rosterMeta?.className ?? null;
    const studentGroup =
      this.normalizeOptional(justification.studentGroup) ?? rosterMeta?.group ?? null;

    return {
      id: justification.id,
      studentName: justification.studentName || 'Etudiant non renseigne',
      studentCode: justification.studentCode || '-',
      studentFormation,
      studentClass,
      studentGroup,
      studentMeta: this.buildStudentMeta(studentFormation, studentGroup),
      module: justification.module || 'Module non renseigne',
      sessionDate: this.formatDateTime(justification.sessionDate),
      submittedAt: this.formatDate(justification.submittedAt),
      reason: justification.reason || 'Motif non renseigne',
      attachmentName: this.attachmentName(justification, documentUrl),
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

  private attachmentName(justification: JustificationDto, resolvedUrl: string | null): string {
    if (justification.documentName) {
      return justification.documentName;
    }
    if (!resolvedUrl) {
      return 'Aucune piece jointe';
    }

    const cleanUrl = resolvedUrl.split('?')[0].split('#')[0];
    let name = decodeURIComponent(cleanUrl.split('/').pop() || 'Piece jointe');
    name = name.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[_-]/i, '');
    name = name.replace(
      /[_-][0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\.[a-zA-Z0-9]+$|$)/i,
      '',
    );
    return name;
  }

  private normalizeOptional(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private buildStudentMetadataMap(
    students: readonly StudentUser[],
  ): ReadonlyMap<string, StudentAcademicMeta> {
    const metadata = new Map<string, StudentAcademicMeta>();

    for (const student of students) {
      const code = this.normalizeCode(student.numApogee);
      if (!code) {
        continue;
      }

      metadata.set(code, {
        formation: this.normalizeOptional(student.filiere),
        className:
          this.normalizeOptional(student.cycle) ?? this.normalizeOptional(student.academicYear),
        group: this.normalizeOptional(student.groupeName),
      });
    }

    return metadata;
  }

  private enrichRowsWithStudentMetadata(): void {
    let updatedRows: readonly TeacherJustificationRow[] = [];
    this.rows.update((rows) => {
      updatedRows = rows.map((row) => this.enrichRowWithStudentMetadata(row));
      return updatedRows;
    });
    this.syncSelectedRow(updatedRows);
  }

  private enrichRowWithStudentMetadata(row: TeacherJustificationRow): TeacherJustificationRow {
    const rosterMeta = this.studentMetadataByCode().get(this.normalizeCode(row.studentCode));
    if (!rosterMeta) {
      return row;
    }

    const studentFormation = row.studentFormation ?? rosterMeta.formation;
    const studentClass = row.studentClass ?? rosterMeta.className;
    const studentGroup = row.studentGroup ?? rosterMeta.group;

    return {
      ...row,
      studentFormation,
      studentClass,
      studentGroup,
      studentMeta: this.buildStudentMeta(studentFormation, studentGroup),
    };
  }

  private buildStudentMeta(
    studentFormation: string | null,
    studentGroup: string | null,
  ): readonly { label: string; value: string }[] {
    return [
      studentFormation ? { label: 'Formation', value: studentFormation } : null,
      studentGroup ? { label: 'Groupe', value: studentGroup } : null,
    ].filter((item): item is { label: string; value: string } => item !== null);
  }

  private normalizeCode(value: string | null | undefined): string {
    return value?.trim().toLowerCase() ?? '';
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
    return typeof message === 'string' && message.trim() ? message : 'Une erreur est survenue.';
  }
  getAttachmentType(url: string | null): 'pdf' | 'image' | 'other' {
    if (!url) return 'other';
    const lower = url.toLowerCase();
    if (lower.startsWith('data:image')) return 'image';
    if (lower.includes('.pdf')) return 'pdf';
    if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/.test(lower)) return 'image';
    return 'other';
  }

  getSafeUrl(url: string): SafeResourceUrl {
    const cleanUrl = `${url}#toolbar=0&navpanes=0&scrollbar=0`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(cleanUrl);
  }
}
