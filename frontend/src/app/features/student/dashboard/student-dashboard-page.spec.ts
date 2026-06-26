import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { StudentAttendanceSessionSummaryDto } from '../../../core/attendance/models/student-attendance.model';
import { QrAttendanceService } from '../../../core/attendance/services/qr-attendance.service';
import { FaceAttendanceService } from '../../../core/attendance/services/face-attendance.service';
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
  let faceAttendanceService: {
    submitStudentFaceAttendance: ReturnType<typeof vi.fn>;
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
    faceAttendanceService = {
      submitStudentFaceAttendance: vi.fn(() =>
        of({
          sessionId: 42,
          studentId: 7,
          status: 'PRESENT',
          markMethod: 'FACE_ID',
          markedAt: '2026-06-03T10:05:00',
          presentCount: 1,
          absentCount: 0,
          unknownCount: 0,
        }),
      ),
      toUserMessage: vi.fn(() => 'Impossible de valider le visage.'),
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
        { provide: FaceAttendanceService, useValue: faceAttendanceService },
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

  it('loads all dashboard session pages so page size changes can reveal every row', async () => {
    const firstPage = [
      makeSessionSummary(1),
      makeSessionSummary(2),
      makeSessionSummary(3),
      makeSessionSummary(4),
    ];
    const secondPage = [makeSessionSummary(5), makeSessionSummary(6)];
    attendanceService.getStudentSessions.mockImplementation((query: { page?: number }) =>
      of({
        items: query.page === 1 ? secondPage : firstPage,
        page: query.page ?? 0,
        size: 50,
        totalElements: 6,
        totalPages: 2,
      }),
    );
    attendanceService.toSessionListItem.mockImplementation(
      (item: StudentAttendanceSessionSummaryDto) => ({
        id: item.sessionId,
        teacherFullName: 'Teacher',
        courseLabel: item.courseLabel,
        roomLabel: item.roomLabel,
        groupSummary: 'Groupe 1',
        dateLabel: '03 juin 2026',
        timeLabel: '10:00 - 11:00',
        attendanceLabel: 'Présent',
        attendanceVariant: 'success',
        markMethodLabel: 'QR code',
        startedAt: item.startedAt,
        endedAt: item.endedAt,
        markedAt: item.markedAt,
        attendanceStatus: item.attendanceStatus,
        markMethod: item.markMethod,
      }),
    );

    attendanceService.getStudentSessions.mockClear();
    (component as unknown as { loadDashboardData: () => void }).loadDashboardData();
    await fixture.whenStable();

    expect(attendanceService.getStudentSessions).toHaveBeenCalledWith({
      page: 0,
      size: 50,
      sort: 'startedAt,desc',
    });
    expect(attendanceService.getStudentSessions).toHaveBeenCalledWith({
      page: 1,
      size: 50,
      sort: 'startedAt,desc',
    });
    expect(component.recentSessions()).toHaveLength(6);
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

  it('does not submit face attendance immediately when the face button opens the camera', async () => {
    getUserMedia.mockResolvedValue(makeMediaStream());

    component.openAttendanceCamera('FACE_ID');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();

    expect(getUserMedia).toHaveBeenCalled();
    expect(getUserMedia).toHaveBeenCalledWith({
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
    expect(faceAttendanceService.submitStudentFaceAttendance).not.toHaveBeenCalled();
    expect(component.attendanceFlowPhase()).toBe('face-preview');
    expect(fixture.nativeElement.textContent).toContain('Prendre la photo');
  });

  it('captures the face only when the student presses the photo button', async () => {
    getUserMedia.mockResolvedValue(makeMediaStream());
    component.openAttendanceCamera('FACE_ID');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
    const video = component.attendanceVideo()!.nativeElement;
    Object.defineProperty(video, 'videoWidth', { configurable: true, value: 640 });
    Object.defineProperty(video, 'videoHeight', { configurable: true, value: 480 });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(FACE_IMAGE_DATA_URL);

    component.takeFacePhoto();

    expect(component.capturedFaceImage()).toBe(FACE_IMAGE_DATA_URL);
    expect(component.attendanceFlowPhase()).toBe('face-captured');
  });

  it('restarts the face camera when the student retakes a captured photo', async () => {
    getUserMedia.mockResolvedValue(makeMediaStream());
    component.openAttendanceCamera('FACE_ID');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();

    component.capturedFaceImage.set(FACE_IMAGE_DATA_URL);
    component.attendanceFlowPhase.set('face-captured');
    fixture.detectChanges();

    component.retakeFaceCapture();
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();

    expect(component.capturedFaceImage()).toBeNull();
    expect(component.attendanceFlowPhase()).toBe('face-preview');
    expect(component.cameraError()).toBeNull();
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });

  it('submits a captured face with GPS and a stable device id', async () => {
    getCurrentPosition.mockImplementation((success) => success(makePosition(34, -6)));
    component.capturedFaceImage.set(FACE_IMAGE_DATA_URL);
    component.attendanceFlowPhase.set('face-captured');

    component.validateFaceCapture();
    await fixture.whenStable();

    expect(getCurrentPosition).toHaveBeenCalledOnce();
    expect(faceAttendanceService.submitStudentFaceAttendance).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 42,
        gpsLat: '34',
        gpsLon: '-6',
        image: expect.any(Blob),
      }),
    );
  });

  it('records attendance and refreshes dashboard data only after success', async () => {
    getCurrentPosition.mockImplementation((success) => success(makePosition(34, -6)));
    attendanceService.getActiveStudentSession.mockReturnValueOnce(
      of({
        sessionId: 42,
        teacherFullName: 'Teacher',
        courseLabel: 'Distributed Systems',
        roomLabel: 'B12',
        groupIds: [1],
        startedAt: '2026-06-03T10:00:00',
        endsAt: '2026-06-03T11:00:00',
        attendanceStatus: 'PRESENT',
      }),
    );
    component.capturedFaceImage.set(FACE_IMAGE_DATA_URL);
    component.attendanceFlowPhase.set('face-captured');

    component.validateFaceCapture();
    await fixture.whenStable();

    expect(faceAttendanceService.submitStudentFaceAttendance).toHaveBeenCalledOnce();
    expect(component.activeAttendanceSession()?.attendanceStatus).toBe('PRESENT');
    expect(component.faceConfirmationMessage()).toContain('Présence enregistrée');
    expect(attendanceService.getActiveStudentSession).toHaveBeenCalledTimes(2);
  });

  it('keeps the capture available when the face does not match', async () => {
    getCurrentPosition.mockImplementation((success) => success(makePosition(34, -6)));
    faceAttendanceService.submitStudentFaceAttendance.mockReturnValueOnce(
      throwError(() => ({ status: 403 })),
    );
    faceAttendanceService.toUserMessage.mockReturnValueOnce('Visage non reconnu. Réessayez.');
    component.capturedFaceImage.set(FACE_IMAGE_DATA_URL);
    component.attendanceFlowPhase.set('face-captured');

    component.validateFaceCapture();
    await fixture.whenStable();

    expect(component.attendanceFlowPhase()).toBe('face-captured');
    expect(component.capturedFaceImage()).toBe(FACE_IMAGE_DATA_URL);
    expect(component.cameraError()).toContain('Visage non reconnu');
    expect(component.activeAttendanceSession()?.attendanceStatus).toBe('UNKNOWN');
  });

  it('keeps the face capture available when backend validation fails', async () => {
    getCurrentPosition.mockImplementation((success) => success(makePosition(34, -6)));
    faceAttendanceService.submitStudentFaceAttendance.mockReturnValueOnce(
      throwError(() => new Error('backend failed')),
    );
    faceAttendanceService.toUserMessage.mockReturnValueOnce('Visage non valide.');
    component.capturedFaceImage.set(FACE_IMAGE_DATA_URL);
    component.attendanceFlowPhase.set('face-captured');
    component.validateFaceCapture();
    await fixture.whenStable();

    expect(component.attendanceFlowPhase()).toBe('face-captured');
    expect(component.capturedFaceImage()).toBe(FACE_IMAGE_DATA_URL);
    expect(component.cameraError()).toBe('Visage non valide.');
  });
});

const FACE_IMAGE_DATA_URL = 'data:image/jpeg;base64,ZmFjZQ==';

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

function makeMediaStream(): MediaStream {
  return {
    getTracks: () => [],
  } as unknown as MediaStream;
}

function makeSessionSummary(sessionId: number): StudentAttendanceSessionSummaryDto {
  return {
    sessionId,
    teacherFullName: 'Teacher',
    courseLabel: `Course ${sessionId}`,
    roomLabel: 'B12',
    groupIds: [1],
    sessionStatus: 'FINALIZED',
    startedAt: `2026-06-0${sessionId}T10:00:00`,
    endedAt: `2026-06-0${sessionId}T11:00:00`,
    attendanceStatus: 'PRESENT',
    markMethod: 'QR_CODE',
    markedAt: `2026-06-0${sessionId}T10:05:00`,
  };
}
