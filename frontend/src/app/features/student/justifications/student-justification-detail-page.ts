import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

import { Button } from '../../../shared/components/button/button';
import { DocumentPreviewPanel } from '../../../shared/components/document-preview-panel/document-preview-panel';
import { JustificationSummaryCard } from '../../../shared/components/justification-summary-card/justification-summary-card';
import { JustificationTimeline } from '../../../shared/components/justification-timeline/justification-timeline';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { getStudentJustificationDetail } from '../student-demo.data';

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

  private readonly justificationId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? 'just-001')),
    { initialValue: this.route.snapshot.paramMap.get('id') ?? 'just-001' },
  );

  readonly detail = computed(
    () => getStudentJustificationDetail(this.justificationId()) ?? getStudentJustificationDetail('just-001')!,
  );
  readonly studentSummary = computed(() => [
    { label: 'Nom', value: this.detail().studentName },
    { label: 'Email', value: this.detail().studentEmail },
    { label: 'Parcours', value: this.detail().studentProgram },
  ]);
  readonly sessionSummary = computed(() => [
    { label: 'Module', value: this.detail().sessionModule },
    { label: 'Date', value: this.detail().sessionDate },
    { label: 'Horaire', value: this.detail().sessionSlot },
    { label: 'Enseignant', value: this.detail().teacher },
  ]);
  readonly reasonSummary = computed(() => [{ label: 'Motif', value: this.detail().reason }]);

  goBack(): void {
    void this.router.navigateByUrl('/student/justifications');
  }
}
