import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../../core/auth/services/auth.service';
import { FaceEnrollmentService } from '../../../core/student/services/face-enrollment.service';
import { StudentProfileService } from '../../../core/student/services/student-profile.service';
import { StudentProfilePage } from './student-profile-page';

describe('StudentProfilePage face enrollment status', () => {
  let fixture: ComponentFixture<StudentProfilePage>;
  let component: StudentProfilePage;
  const profile = signal({
    id: 12,
    email: 'student@ump.ac.ma',
    firstName: 'Sara',
    lastName: 'Alaoui',
    pfpUrl: '/api/users/public/profile-photos/old.png',
    faceEnrolled: true,
    faceEnrolledAt: '2026-06-22T10:30:00',
  });
  const profileService = {
    profile: profile.asReadonly(),
    isLoading: signal(false).asReadonly(),
    ensureLoaded: vi.fn(),
    updateProfilePhoto: vi.fn(),
  };
  const authService = {
    currentUser: {
      id: '12',
      email: 'student@ump.ac.ma',
      role: 'STUDENT',
      firstLogin: false,
    },
    refreshSession: vi.fn(),
    logout: vi.fn(),
  };
  const faceEnrollmentService = {
    enroll: vi.fn(),
    toUserMessage: vi.fn(),
  };

  beforeAll(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:profile-photo-preview'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentProfilePage],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: StudentProfileService, useValue: profileService },
        { provide: FaceEnrollmentService, useValue: faceEnrollmentService },
      ],
    }).compileComponents();

    vi.clearAllMocks();
    fixture = TestBed.createComponent(StudentProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows an enrolled status and presents scanning as an optional update', () => {
    const content = fixture.nativeElement.textContent as string;

    expect(content).toContain('Visage enregistré');
    expect(content).toContain('Mettre à jour mon visage');
    expect(content).not.toContain('Enregistrer mon visage');
  });

  it('replaces the embedding without logging out an already enrolled student', () => {
    faceEnrollmentService.enroll.mockReturnValue(
      of({
        studentId: 12,
        enrolled: true,
        firstLogin: false,
        faceEnrolledAt: '2026-06-22T11:15:00',
        authenticationRefreshRequired: false,
      }),
    );
    component.capturedFaceImage.set('data:image/jpeg;base64,ZmFjZQ==');
    component.faceEnrollmentPhase.set('captured');

    component.saveFaceEmbedding();

    expect(component.faceEnrollmentPhase()).toBe('saved');
    expect(component.latestFaceEnrollmentAt()).toBe('2026-06-22T11:15:00');
    expect(profileService.ensureLoaded).toHaveBeenCalledWith(true);
    expect(authService.logout).not.toHaveBeenCalled();
  });

  it('lets the student update only the profile photo from the avatar control', () => {
    const updatedProfile = {
      ...profile(),
      pfpUrl: '/api/users/public/profile-photos/new.png',
    };
    profileService.updateProfilePhoto.mockReturnValue(of(updatedProfile));
    component.profileImageFailed.set(true);
    const input = fixture.nativeElement.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });

    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(profileService.updateProfilePhoto).toHaveBeenCalledWith(file);
    expect(component.profileImageFailed()).toBe(false);
    expect(component.profilePhotoError()).toBeNull();
    expect(component.profilePhotoMessage()).toBe('Photo de profil mise à jour avec succès.');
    expect(component.profileImageUrl()).toBe('blob:profile-photo-preview');
  });

  it('explains why the profile photo update failed', () => {
    profileService.updateProfilePhoto.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );
    const input = fixture.nativeElement.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });

    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(profileService.updateProfilePhoto).toHaveBeenCalledWith(file);
    expect(component.selectedProfilePhotoPreview()).toBeNull();
    expect(component.profilePhotoError()).toContain('backend est démarré');
    expect(component.profilePhotoMessage()).toBeNull();
  });
});
