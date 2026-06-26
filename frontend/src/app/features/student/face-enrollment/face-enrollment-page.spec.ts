import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { AuthService } from '../../../core/auth/services/auth.service';
import { FaceEnrollmentService } from '../../../core/student/services/face-enrollment.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { FaceEnrollmentPage } from './face-enrollment-page';

describe('FaceEnrollmentPage', () => {
  let fixture: ComponentFixture<FaceEnrollmentPage>;
  let component: FaceEnrollmentPage;
  const refreshedUser = {
    id: '12',
    email: 'student@ump.ac.ma',
    role: 'STUDENT',
    firstLogin: false,
  };
  const authService = {
    logout: vi.fn(),
    refreshSession: vi.fn(() => of(refreshedUser)),
    redirectToRoleHome: vi.fn(),
  };
  const enrollmentService = { enroll: vi.fn(), toUserMessage: vi.fn() };
  const toastService = { success: vi.fn() };
  let getUserMedia: ReturnType<typeof vi.fn>;
  let stopTrack: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    stopTrack = vi.fn();
    getUserMedia = vi.fn(() =>
      Promise.resolve({ getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream),
    );
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();

    await TestBed.configureTestingModule({
      imports: [FaceEnrollmentPage],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: FaceEnrollmentService, useValue: enrollmentService },
        { provide: ToastService, useValue: toastService },
      ],
    }).compileComponents();

    vi.clearAllMocks();
    enrollmentService.toUserMessage.mockReturnValue('Capture refusée.');
    enrollmentService.enroll.mockReturnValue(
      of({
        studentId: 12,
        enrolled: true,
        firstLogin: false,
        faceEnrolledAt: '2026-06-22T10:00:00',
        authenticationRefreshRequired: true,
      }),
    );
    fixture = TestBed.createComponent(FaceEnrollmentPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => vi.restoreAllMocks());

  it('starts the front camera and displays its preview', async () => {
    await component.startCamera();

    expect(getUserMedia).toHaveBeenCalledWith({
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
    expect(component.phase()).toBe('preview');
    expect(component.faceVideo()?.nativeElement.srcObject).not.toBeNull();
  });

  it('shows a specific camera permission error', async () => {
    getUserMedia.mockRejectedValue(new DOMException('denied', 'NotAllowedError'));

    await component.startCamera();

    expect(component.phase()).toBe('idle');
    expect(component.cameraError()).toContain('refusé');
  });

  it('captures a JPEG and releases the camera', async () => {
    await component.startCamera();
    const video = component.faceVideo()!.nativeElement;
    Object.defineProperty(video, 'videoWidth', { configurable: true, value: 640 });
    Object.defineProperty(video, 'videoHeight', { configurable: true, value: 480 });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/jpeg;base64,ZmFjZQ==',
    );

    component.captureImage();

    expect(component.phase()).toBe('captured');
    expect(component.capturedImage()).toBe('data:image/jpeg;base64,ZmFjZQ==');
    expect(stopTrack).toHaveBeenCalledOnce();
  });

  it('prevents duplicate submissions while enrollment is running', () => {
    const pending = new Subject<never>();
    enrollmentService.enroll.mockReturnValue(pending);
    component.capturedImage.set('data:image/jpeg;base64,ZmFjZQ==');
    component.phase.set('captured');

    component.submitEnrollment();
    component.submitEnrollment();

    expect(enrollmentService.enroll).toHaveBeenCalledOnce();
    expect(component.phase()).toBe('submitting');
  });

  it('returns to the captured state when the backend rejects the image', () => {
    enrollmentService.enroll.mockReturnValue(throwError(() => new Error('invalid')));
    component.capturedImage.set('data:image/jpeg;base64,ZmFjZQ==');
    component.phase.set('captured');

    component.submitEnrollment();

    expect(component.phase()).toBe('captured');
    expect(component.enrollmentError()).toBe('Capture refusée.');
    expect(authService.logout).not.toHaveBeenCalled();
  });

  it('refreshes the session and opens the dashboard after enrollment', () => {
    component.capturedImage.set('data:image/jpeg;base64,ZmFjZQ==');
    component.phase.set('captured');

    component.submitEnrollment();

    expect(component.phase()).toBe('success');
    expect(toastService.success).toHaveBeenCalled();
    expect(authService.refreshSession).toHaveBeenCalledOnce();
    expect(authService.redirectToRoleHome).toHaveBeenCalledWith(refreshedUser, true);
    expect(authService.logout).not.toHaveBeenCalled();
  });

  it('logs out safely when the post-enrollment token refresh fails', () => {
    authService.refreshSession.mockReturnValueOnce(throwError(() => new Error('refresh failed')));
    component.capturedImage.set('data:image/jpeg;base64,ZmFjZQ==');
    component.phase.set('captured');

    component.submitEnrollment();

    expect(authService.logout).toHaveBeenCalledOnce();
    expect(authService.redirectToRoleHome).not.toHaveBeenCalled();
  });

  it('allows the student to log out', () => {
    const logoutButton = fixture.nativeElement.querySelector(
      'button[aria-label="Se déconnecter"]',
    ) as HTMLButtonElement;

    logoutButton.click();

    expect(authService.logout).toHaveBeenCalledOnce();
  });
});
