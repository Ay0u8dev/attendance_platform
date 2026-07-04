import { JustificationDto } from '../../core/justifications/justification.model';
import { StudentUser } from '../../core/users/models/student.model';
import {
  buildJustificationStudentDirectory,
  cleanJustificationAttachmentName,
  presentJustificationReview,
  presentJustificationStudent,
} from './justification-presenter';

describe('justification presenter', () => {
  it('falls back from missing justification student fields to directory data by id', () => {
    const directory = buildJustificationStudentDirectory([student()]);

    const presented = presentJustificationStudent(
      justification({
        studentName: '',
        studentEmail: null,
        studentCode: null,
        studentProfileImageUrl: null,
        studentFormation: null,
        studentClass: null,
        studentGroup: null,
      }),
      directory,
    );

    expect(presented.name).toBe('Aya Mansour');
    expect(presented.email).toBe('aya@ump.ac.ma');
    expect(presented.code).toBe('A007');
    expect(presented.pfpUrl).toBe('https://cdn.example.test/aya.jpg');
    expect(presented.formation).toBe('GI');
    expect(presented.className).toBe('ING');
    expect(presented.group).toBe('GI-2');
  });

  it('resolves student directory data by Apogee code when the id does not match', () => {
    const directory = buildJustificationStudentDirectory([student()]);

    const presented = presentJustificationStudent(
      justification({
        studentId: 999,
        studentName: '',
        studentEmail: null,
        studentCode: ' A007 ',
        studentProfileImageUrl: null,
        studentGroup: null,
      }),
      directory,
    );

    expect(presented.email).toBe('aya@ump.ac.ma');
    expect(presented.group).toBe('GI-2');
    expect(presented.pfpUrl).toBe('https://cdn.example.test/aya.jpg');
  });

  it('prefers current decision fields over legacy review fields', () => {
    const review = presentJustificationReview(
      justification({
        status: 'REJECTED',
        decisionComment: 'Rejected by admin',
        decidedBy: '42',
        decidedByRole: 'ADMIN',
        decidedAt: '2026-07-04T09:00:00',
        teacherComment: 'Rejected by teacher',
        reviewedBy: 'Teacher (6)',
        reviewerRole: 'TEACHER',
        reviewedAt: '2026-07-04T08:00:00',
      }),
    );

    expect(review.comment).toBe('Rejected by admin');
    expect(review.reviewer).toBe('42');
    expect(review.role).toBe('ADMIN');
    expect(review.commentLabel).toBe('Commentaire administrateur');
  });

  it('labels legacy teacher reviews as teacher comments', () => {
    const review = presentJustificationReview(
      justification({
        status: 'REJECTED',
        decisionComment: null,
        decidedByRole: null,
        teacherComment: 'Rejected by teacher',
        reviewerRole: 'TEACHER',
      }),
    );

    expect(review.comment).toBe('Rejected by teacher');
    expect(review.role).toBe('TEACHER');
    expect(review.commentLabel).toBe('Commentaire enseignant');
  });

  it('uses a decision comment label while a request is pending', () => {
    const review = presentJustificationReview(justification({ status: 'PENDING' }));

    expect(review.commentLabel).toBe('Commentaire de décision');
  });

  it('cleans generated attachment ids from filenames', () => {
    const name = cleanJustificationAttachmentName(
      null,
      'https://files.example.test/justifications/Aya_DB_123e4567-e89b-12d3-a456-426614174000.pdf',
    );

    expect(name).toBe('Aya_DB.pdf');
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

function justification(overrides: Partial<JustificationDto> = {}): JustificationDto {
  return {
    id: 1,
    attendanceRecordId: 10,
    sessionId: 20,
    studentId: 7,
    groupId: null,
    teacherId: 6,
    teacherName: 'Teacher One',
    studentName: 'Aya Mansour',
    studentEmail: 'aya.old@ump.ac.ma',
    studentCode: 'A007',
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
    status: 'PENDING',
    decisionComment: null,
    decidedBy: null,
    decidedByRole: null,
    decidedAt: null,
    createdAt: '2026-07-04T08:00:00',
    updatedAt: '2026-07-04T08:00:00',
    module: 'Database Architecture',
    sessionDate: '2026-07-04T09:00:00',
    submittedAt: '2026-07-04T08:00:00',
    documentUrl: null,
    documentName: null,
    downloadUrl: null,
    teacherComment: null,
    reviewedBy: null,
    reviewerRole: null,
    reviewedAt: null,
    ...overrides,
  };
}
