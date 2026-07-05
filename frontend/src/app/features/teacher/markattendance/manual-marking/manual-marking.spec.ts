import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { AttendanceSessionResponse } from '../../../../core/attendance/models/attendance.model';
import { AttendanceService } from '../../../../core/attendance/services/attendance.service';
import { ManualMarking } from './manual-marking';

describe('ManualMarking avatars', () => {
  let fixture: ComponentFixture<ManualMarking>;

  const session: AttendanceSessionResponse = {
    sessionId: 42,
    teacherId: 3,
    groupIds: [1],
    courseLabel: 'Math',
    roomLabel: 'A1',
    startedAt: '2026-07-04T09:00:00Z',
    method: 'MANUAL',
    status: 'ACTIVE',
    students: [
      {
        studentId: 7,
        groupId: 1,
        firstName: 'Marie',
        lastName: 'Dupont',
        email: 'marie@example.com',
        pfpUrl: 'https://example.com/marie.jpg',
        numApogee: 'A123',
        status: 'UNKNOWN',
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManualMarking],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: () => null,
              },
            },
          },
        },
        {
          provide: Router,
          useValue: {
            navigate: vi.fn(),
          },
        },
        {
          provide: AttendanceService,
          useValue: {
            getActiveSession: () => of(session),
            getSession: () => of(session),
            updateAttendance: vi.fn(),
            endSession: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ManualMarking);
    fixture.detectChanges();
  });

  it('renders student profile photos in manual marking rows', () => {
    const image = (fixture.nativeElement as HTMLElement).querySelector('app-user-avatar img');

    expect(image?.getAttribute('src')).toBe('https://example.com/marie.jpg');
  });
});
