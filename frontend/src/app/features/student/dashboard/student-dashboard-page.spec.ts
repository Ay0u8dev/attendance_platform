import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { QrAttendanceService } from '../../../core/attendance/services/qr-attendance.service';
import { StudentAttendanceService } from '../../../core/attendance/services/student-attendance.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { StudentProfileService } from '../../../core/student/services/student-profile.service';
import { StudentDashboardPage } from './student-dashboard-page';

describe('StudentDashboardPage QR attendance flow', () => {
  let fixture: ComponentFixture<StudentDashboardPage>;
  let component: StudentDashboardPage;
  let attendanceService: {
    getStudentOverview: ReturnType<typeof vi.fn>;
    getStudentSessions: ReturnType<typeof vi.fn>;
    getActiveStudentSession: ReturnType<typeof vi.fn>;
    toOverviewViewModel: ReturnType<typeof vi.fn>;
    toSessionListItem: ReturnType<typeof vi.fn>;
    getStudentSession: ReturnType<typeof vi.fn>;
    toSessionDetailViewModel: ReturnType<typeof vi.fn>;
  };
  let qrAttendanceService: {
    submitStudentQrScan: ReturnType<typeof vi.fn>;
    toUserMessage: ReturnType<typeof vi.fn>;
  };
  let getCurrentPosition: ReturnType<typeof vi.fn>;
  let getUserMedia: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    attendanceService = {
      getStudentOverview: vi.fn(() =>
        of({ totalSessions: 0, presents: 0, absences: 0, attendanceRate: 0 }),
      ),
      getStudentSessions: vi.fn(() =>
        of({ items: [], page: 0, size: 50, totalElements: 0, totalPages: 0 }),
      ),
      getActiveStudentSession: vi.fn(() =>
        of({
          sessionId: 42,
          teacherFullName: 'Teacher',
          courseLabel: 'Distributed Systems',
          roomLabel: 'B12',
          groupIds: [1],
          startedAt: '2026-06-03T10:00:00',
          endsAt: '2026-06-03T11:00:00',
          attendanceStatus: 'UNKNOWN',
        }),
      ),
      toOverviewViewModel: vi.fn(() => ({
        totalSessions: 0,
        presentCount: 0,
        absentCount: 0,
        attendanceRateLabel: '0.0%',
      })),
      toSessionListItem: vi.fn(),
      getStudentSession: vi.fn(),
      toSessionDetailViewModel: vi.fn(),
    };
    qrAttendanceService = {
      submitStudentQrScan: vi.fn(() =>
        of({
          sessionId: 42,
          studentId: 7,
          status: 'PRESENT',
          markMethod: 'QR_CODE',
          markedAt: '2026-06-03T10:05:00',
          presentCount: 1,
          absentCount: 0,
          unknownCount: 0,
        }),
      ),
      toUserMessage: vi.fn(() => 'Impossible de valider le QR code.'),
    };
    getCurrentPosition = vi.fn();
    getUserMedia = vi.fn();

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });

    await TestBed.configureTestingModule({
      imports: [StudentDashboardPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser: null } },
        { provide: StudentProfileService, useValue: { profile: signal(null).asReadonly() } },
        { provide: StudentAttendanceService, useValue: attendanceService },
        { provide: QrAttendanceService, useValue: qrAttendanceService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentDashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('does not instantiate scanner or request camera APIs on dashboard load', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('zxing-scanner')).toBeNull();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(component.qrScannerEnabled()).toBe(false);
  });

  it('requests GPS before enabling QR scanning', async () => {
    let resolveLocation: (position: GeolocationPosition) => void = () => undefined;
    getCurrentPosition.mockImplementation((success: PositionCallback) => {
      resolveLocation = success;
    });

    component.openAttendanceCamera('QR_CODE');

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(component.qrLocationStatus()).toBe('requesting');
    expect(component.qrScannerEnabled()).toBe(false);

    resolveLocation(makePosition(34.681, -1.908));
    await fixture.whenStable();

    expect(component.qrLocationStatus()).toBe('ready');
    expect(component.attendanceFlowPhase()).toBe('qr-scanning');
    expect(component.qrScannerEnabled()).toBe(true);
  });

  it('does not submit a QR scan when GPS is unavailable', async () => {
    getCurrentPosition.mockImplementation(
      (_success: PositionCallback, error: PositionErrorCallback) => {
        error({ code: 1, message: 'denied' } as GeolocationPositionError);
      },
    );

    component.openAttendanceCamera('QR_CODE');
    await fixture.whenStable();
    component.onQrScanSuccess('payload-without-gps');
    await fixture.whenStable();

    expect(component.qrLocationStatus()).toBe('unavailable');
    expect(component.qrScannerEnabled()).toBe(false);
    expect(qrAttendanceService.submitStudentQrScan).not.toHaveBeenCalled();
  });

  it('submits QR scans with required GPS coordinates', async () => {
    getCurrentPosition.mockImplementation((success: PositionCallback) => {
      success(makePosition(34.681, -1.908));
    });

    component.openAttendanceCamera('QR_CODE');
    await fixture.whenStable();
    component.onQrScanSuccess('valid-payload');
    await fixture.whenStable();

    expect(qrAttendanceService.submitStudentQrScan).toHaveBeenCalledWith({
      payload: 'valid-payload',
      deviceId: expect.any(String),
      gpsLat: '34.681',
      gpsLon: '-1.908',
    });
  });

  it('closing the modal disables scanner and clears QR location state', async () => {
    getCurrentPosition.mockImplementation((success: PositionCallback) => {
      success(makePosition(34.681, -1.908));
    });

    component.openAttendanceCamera('QR_CODE');
    await fixture.whenStable();

    component.closeAttendanceCamera();

    expect(component.attendanceCameraOpen()).toBe(false);
    expect(component.qrScannerEnabled()).toBe(false);
    expect(component.qrLocationStatus()).toBe('idle');
    expect(component.qrLocationPosition()).toBeNull();
  });
});

function makePosition(latitude: number, longitude: number): GeolocationPosition {
  return {
    coords: {
      latitude,
      longitude,
      accuracy: 5,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON: () => ({}),
    },
    timestamp: Date.now(),
    toJSON: () => ({}),
  };
}
