import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { StudentAttendanceService } from './student-attendance.service';
import {
  StudentAttendanceSessionDetailDto,
  StudentAttendanceSessionSummaryDto,
} from '../models/student-attendance.model';

describe('StudentAttendanceService', () => {
  let service: StudentAttendanceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideRouter([])],
    });

    service = TestBed.inject(StudentAttendanceService);
  });

  it('maps teacherFullName into the list item view model', () => {
    const dto: StudentAttendanceSessionSummaryDto = {
      sessionId: 100,
      teacherFullName: 'Ayoub Elebbar',
      courseLabel: 'Distributed Systems',
      roomLabel: 'Room B12',
      groupIds: [1],
      sessionMethod: 'QR_CODE',
      sessionStatus: 'FINALIZED',
      startedAt: '2026-04-28T12:00:00',
      endedAt: '2026-04-28T12:30:00',
      attendanceStatus: 'PRESENT',
      markMethod: 'QR_CODE',
      markedAt: '2026-04-28T12:05:00',
    };

    const result = service.toSessionListItem(dto);

    expect(result.teacherFullName).toBe('Ayoub Elebbar');
  });

  it('falls back when teacherFullName is missing in the detail dto', () => {
    const dto: StudentAttendanceSessionDetailDto = {
      sessionId: 100,
      teacherFullName: null,
      courseLabel: 'Distributed Systems',
      roomLabel: 'Room B12',
      groupIds: [1],
      sessionMethod: 'QR_CODE',
      sessionStatus: 'FINALIZED',
      startedAt: '2026-04-28T12:00:00',
      endsAt: '2026-04-28T12:30:00',
      endedAt: '2026-04-28T12:30:00',
      studentId: 12,
      groupId: 1,
      firstName: 'Aya',
      lastName: 'Bennani',
      email: 'aya@ump.ac.ma',
      pfpUrl: null,
      numApogee: 'A001',
      attendanceStatus: 'ABSENT',
      markMethod: null,
      deviceId: null,
      markedGpsLat: null,
      markedGpsLon: null,
      markedAt: null,
    };

    const result = service.toSessionDetailViewModel(dto);

    expect(result.teacherFullName).toBe('Enseignant non renseigné');
  });

  it('maps missing mark method into a neutral label', () => {
    const dto: StudentAttendanceSessionSummaryDto = {
      sessionId: 100,
      teacherFullName: 'Ayoub Elebbar',
      courseLabel: 'Distributed Systems',
      roomLabel: 'Room B12',
      groupIds: [1],
      sessionMethod: 'QR_CODE',
      sessionStatus: 'FINALIZED',
      startedAt: '2026-04-28T12:00:00',
      endedAt: '2026-04-28T12:30:00',
      attendanceStatus: 'ABSENT',
      markMethod: null,
      markedAt: null,
    };

    const result = service.toSessionListItem(dto);

    expect(result.markMethodLabel).toBe('Non marqué');
  });

  it('maps same-day detail sessions into a compact schedule label', () => {
    const dto: StudentAttendanceSessionDetailDto = {
      sessionId: 100,
      teacherFullName: 'Ayoub Elebbar',
      courseLabel: 'Distributed Systems',
      roomLabel: 'Room B12',
      groupIds: [1],
      sessionMethod: 'QR_CODE',
      sessionStatus: 'FINALIZED',
      startedAt: '2026-05-03T00:37:00',
      endsAt: '2026-05-03T01:07:00',
      endedAt: '2026-05-03T01:07:00',
      studentId: 12,
      groupId: 1,
      firstName: 'Aya',
      lastName: 'Bennani',
      email: 'aya@ump.ac.ma',
      pfpUrl: null,
      numApogee: 'A001',
      attendanceStatus: 'PRESENT',
      markMethod: 'QR_CODE',
      deviceId: null,
      markedGpsLat: null,
      markedGpsLon: null,
      markedAt: '2026-05-03T00:40:00',
    };

    const result = service.toSessionDetailViewModel(dto);

    expect(result.sessionScheduleLabel).toBe('03 mai 2026, 00:37 - 01:07');
  });

  it('returns mock overview totals derived from mock sessions', async () => {
    const overview = await firstValueFrom(service.getStudentOverview());

    expect(overview.totalSessions).toBe(9);
    expect(overview.presents).toBe(6);
    expect(overview.absences).toBe(3);
    expect(overview.attendanceRate).toBeCloseTo(6 / 9, 5);
  });

  it('filters mock sessions by present and absent statuses', async () => {
    const presentResponse = await firstValueFrom(service.getStudentSessions({ status: 'PRESENT' }));
    const absentResponse = await firstValueFrom(service.getStudentSessions({ status: 'ABSENT' }));

    expect(presentResponse.items.length).toBe(6);
    expect(presentResponse.items.every((item) => item.attendanceStatus === 'PRESENT')).toBe(true);
    expect(absentResponse.items.length).toBe(3);
    expect(absentResponse.items.every((item) => item.attendanceStatus === 'ABSENT')).toBe(true);
  });

  it('applies mock date filtering, sorting, and pagination', async () => {
    const response = await firstValueFrom(
      service.getStudentSessions({
        dateFrom: '2026-05-08',
        dateTo: '2026-05-18',
        page: 0,
        size: 2,
        sort: 'startedAt,asc',
      }),
    );

    expect(response.totalElements).toBe(5);
    expect(response.totalPages).toBe(3);
    expect(response.items.map((item) => item.sessionId)).toEqual([6, 5]);
  });

  it('returns matching mock detail by session id', async () => {
    const detail = await firstValueFrom(service.getStudentSession(5));

    expect(detail.sessionId).toBe(5);
    expect(detail.courseLabel).toBe('Algorithmique avancee');
    expect(detail.markMethod).toBe('QR_CODE');
  });

  it('returns a 404-like error for unknown mock details', async () => {
    let status: number | undefined;

    try {
      await firstValueFrom(service.getStudentSession(999));
    } catch (error) {
      status = (error as { status?: number }).status;
    }

    expect(status).toBe(404);
  });
});
