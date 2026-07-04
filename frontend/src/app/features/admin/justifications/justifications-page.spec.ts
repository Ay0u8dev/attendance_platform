import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { JustificationDto } from '../../../core/justifications/justification.model';
import { JustificationService } from '../../../core/justifications/justification.service';
import { StudentUser } from '../../../core/users/models/student.model';
import { StudentUserService } from '../../../core/users/services/student-user.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { JustificationsPage } from './justifications-page';

describe('Admin JustificationsPage', () => {
  let fixture: ComponentFixture<JustificationsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JustificationsPage],
      providers: [
        {
          provide: JustificationService,
          useValue: {
            getAdminJustifications: () => of([teacherRejectedJustification()]),
            resolveDocumentUrl: (url: string | null | undefined) => url ?? null,
            decide: () => of(teacherRejectedJustification()),
          },
        },
        {
          provide: StudentUserService,
          useValue: {
            getAll: () => of([student()]),
          },
        },
        {
          provide: ToastService,
          useValue: {
            success: () => undefined,
            error: () => undefined,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(JustificationsPage);
    fixture.detectChanges();
  });

  it('fills missing admin justification student details from the student directory', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('aya@ump.ac.ma');
    expect(text).toContain('GI-2');
    expect(text).toContain('Apogée A007');
  });

  it('labels teacher-reviewed rejection comments as teacher comments', () => {
    const text = fixture.nativeElement.textContent as string;
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;

    expect(text).toContain('Commentaire enseignant');
    expect(textarea.value).toBe('Rejected by teacher');
    expect(text).not.toContain('Commentaire administrateur');
    expect(text).toContain('Révisée');
    expect(text).toContain('par Enseignant Teacher One (6)');
    expect(text).toContain('Prof. Idrissi');
  });
});

function student(overrides: Partial<StudentUser> = {}): StudentUser {
  return {
    id: 7,
    email: 'aya@ump.ac.ma',
    firstName: 'Aya',
    lastName: 'Mansour',
    academicYear: '2025/2026',
    cycle: 'ING',
    filiere: 'GI',
    groupeName: 'GI-2',
    pfpUrl: 'https://cdn.example.test/aya.jpg',
    numApogee: 'A007',
    roles: ['STUDENT'],
    enabled: true,
    firstLogin: false,
    ...overrides,
  };
}

function teacherRejectedJustification(overrides: Partial<JustificationDto> = {}): JustificationDto {
  return {
    id: 6,
    attendanceRecordId: 10,
    sessionId: 20,
    studentId: 7,
    groupId: null,
    teacherId: 6,
    teacherName: 'Prof. Idrissi',
    studentName: 'Aya Mansour',
    studentEmail: null,
    studentCode: null,
    studentProfileImageUrl: null,
    studentFormation: null,
    studentClass: null,
    studentGroup: null,
    courseLabel: 'Database Architecture',
    roomLabel: null,
    absenceStartedAt: '2026-07-04T09:00:00',
    absenceEndedAt: null,
    reason: 'Medical appointment',
    attachmentUrl: null,
    status: 'REJECTED',
    decisionComment: null,
    decidedBy: null,
    decidedByRole: null,
    decidedAt: null,
    createdAt: '2026-07-04T08:00:00',
    updatedAt: '2026-07-04T09:10:00',
    module: 'Database Architecture',
    sessionDate: '2026-07-04T09:00:00',
    submittedAt: '2026-07-04T08:00:00',
    documentUrl: null,
    documentName: null,
    downloadUrl: null,
    teacherComment: 'Rejected by teacher',
    reviewedBy: 'Teacher One (6)',
    reviewerRole: 'TEACHER',
    reviewedAt: '2026-07-04T09:10:00',
    ...overrides,
  };
}
