import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { JustificationService } from '../../../core/justifications/justification.service';
import { StudentProfileService } from '../../../core/student/services/student-profile.service';
import { StudentAttendanceService } from '../../../core/attendance/services/student-attendance.service';
import { JustificationDto } from '../../../core/justifications/justification.model';
import { StudentSessionDetailViewModel } from '../../../core/attendance/models/student-attendance.model';
import { Button } from '../../../shared/components/button/button';
import { DocumentPreviewPanel } from '../../../shared/components/document-preview-panel/document-preview-panel';
import { JustificationSummaryCard } from '../../../shared/components/justification-summary-card/justification-summary-card';
import { JustificationTimeline } from '../../../shared/components/justification-timeline/justification-timeline';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-student-justification-detail-page',
  imports: [
    PageHeader,
    StatusBadge,
    Button,
    JustificationSummaryCard,
    DocumentPreviewPanel,
    JustificationTimeline,
  ],
  templateUrl: './student-justification-detail-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentJustificationDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly justificationService = inject(JustificationService);
  private readonly profileService = inject(StudentProfileService);
  private readonly attendanceService = inject(StudentAttendanceService);
  private readonly destroyRef = inject(DestroyRef);

  readonly detail = signal<JustificationDto | null>(null);
  readonly sessionDetail = signal<StudentSessionDetailViewModel | null>(null);

  private readonly dateFormatter = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  private readonly dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  private formatDateString(dateStr?: string | null): string {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return this.dateFormatter.format(date);
    } catch {
      return dateStr;
    }
  }

  private formatDateTimeString(dateStr?: string | null): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return this.dateTimeFormatter.format(date);
    } catch {
      return dateStr;
    }
  }

  readonly statusLabel = computed(() => {
    const d = this.detail();
    if (!d) return '';
    const statusMap: Record<string, string> = {
      PENDING: 'En attente',
      APPROVED: 'Acceptée',
      REJECTED: 'Refusée',
    };
    return statusMap[d.status] || d.status;
  });

  readonly statusVariant = computed(() => {
    const d = this.detail();
    if (!d) return 'neutral';
    const variantMap: Record<string, 'neutral' | 'warning' | 'success' | 'error'> = {
      PENDING: 'warning',
      APPROVED: 'success',
      REJECTED: 'error',
    };
    return variantMap[d.status] || 'neutral';
  });

  readonly studentSummary = computed(() => {
    const d = this.detail();
    const profile = this.profileService.profile();
    if (!d) return [];
    const filiere = profile?.filiere || '';
    const groupe = profile?.groupe || '';
    const program = [filiere, groupe].filter(Boolean).join(' - ') || 'N/A';
    return [
      { label: 'Nom', value: d.studentName },
      { label: 'Email', value: profile?.email || 'N/A' },
      { label: 'Parcours', value: program },
    ];
  });

  readonly sessionSummary = computed(() => {
    const d = this.detail();
    const session = this.sessionDetail();
    if (!d) return [];

    const timeLabel = session?.sessionScheduleLabel || 'N/A';
    const teacherName = session?.teacherFullName || 'Non renseigné';

    return [
      { label: 'Module', value: d.module },
      { label: 'Date', value: this.formatDateString(d.sessionDate) },
      { label: 'Horaire', value: timeLabel },
      { label: 'Enseignant', value: teacherName },
    ];
  });

  readonly reasonSummary = computed(() => {
    const d = this.detail();
    if (!d) return [];
    return [{ label: 'Motif', value: d.reason || 'Aucun motif renseigné' }];
  });

  readonly attachmentName = computed(() => {
    const d = this.detail();
    if (!d || !d.documentUrl) return 'justificatif.pdf';
    try {
      const parts = d.documentUrl.split('/');
      const name = parts[parts.length - 1];
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i;
      return name.replace(uuidRegex, '');
    } catch {
      return 'justificatif.pdf';
    }
  });

  readonly history = computed(() => {
    const d = this.detail();
    if (!d) return [];

    const formattedSubmitted = d.submittedAt ? this.formatDateTimeString(d.submittedAt) : '';
    const formattedReviewed = d.reviewedAt ? this.formatDateTimeString(d.reviewedAt) : '';

    if (d.status === 'APPROVED') {
      return [
        {
          title: 'Justification soumise',
          description: 'La demande a été transmise avec le document demandé.',
          meta: formattedSubmitted,
          state: 'done' as const,
        },
        {
          title: 'Analyse terminée',
          description: 'Le service administratif a vérifié la cohérence des éléments.',
          meta: formattedReviewed || 'Récemment',
          state: 'done' as const,
        },
        {
          title: 'Justification acceptée',
          description: 'L’absence ne sera pas comptabilisée contre vous.',
          meta: 'Décision finale',
          state: 'current' as const,
        },
      ];
    } else if (d.status === 'REJECTED') {
      return [
        {
          title: 'Justification soumise',
          description: 'Votre demande a été déposée avec une pièce jointe.',
          meta: formattedSubmitted,
          state: 'done' as const,
        },
        {
          title: 'Analyse par l’administration',
          description: 'Le service a constaté l’insuffisance du justificatif.',
          meta: formattedReviewed || 'Récemment',
          state: 'done' as const,
        },
        {
          title: 'Justification refusée',
          description: d.teacherComment || 'Le document fourni ne permet pas de justifier l’absence.',
          meta: 'Décision finale',
          state: 'current' as const,
        },
      ];
    } else {
      // PENDING
      return [
        {
          title: 'Justification soumise',
          description: 'Votre demande a bien été enregistrée avec la pièce jointe.',
          meta: formattedSubmitted,
          state: 'done' as const,
        },
        {
          title: 'Analyse par l’administration',
          description: 'Le justificatif est en cours de revue.',
          meta: 'Statut actuel',
          state: 'current' as const,
        },
        {
          title: 'Décision finale',
          description: 'La décision sera notifiée après validation.',
          meta: 'À venir',
          state: 'upcoming' as const,
        },
      ];
    }
  });

  constructor() {
    this.profileService.ensureLoaded();

    const idStr = this.route.snapshot.paramMap.get('id');
    if (idStr) {
      const id = parseInt(idStr, 10);
      if (!isNaN(id)) {
        this.justificationService
          .getJustification(id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (data) => {
              this.detail.set(data);
              if (data.sessionId) {
                this.attendanceService
                  .getStudentSession(data.sessionId)
                  .pipe(takeUntilDestroyed(this.destroyRef))
                  .subscribe({
                    next: (sessionDto) => {
                      this.sessionDetail.set(
                        this.attendanceService.toSessionDetailViewModel(sessionDto),
                      );
                    },
                  });
              }
            },
          });
      }
    }
  }

  goBack(): void {
    void this.router.navigateByUrl('/student/justifications');
  }
}
