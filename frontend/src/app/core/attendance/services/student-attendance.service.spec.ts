import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

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
      markMethod: 'MANUAL',
      deviceId: null,
      markedGpsLat: null,
      markedGpsLon: null,
      markedAt: null,
    };

    const result = service.toSessionDetailViewModel(dto);

    expect(result.teacherFullName).toBe('Enseignant non renseigné');
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
});
