import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { Role } from '../../../core/auth/models/auth.model';
import { AuthService } from '../../../core/auth/services/auth.service';
import { StudentProfile } from '../../../core/student/models/student-profile.model';
import { FaceEnrollmentService } from '../../../core/student/services/face-enrollment.service';
import { StudentProfileService } from '../../../core/student/services/student-profile.service';
import { StudentSettingsPage } from './student-settings-page';

describe('StudentSettingsPage profile photo removal', () => {
  let fixture: ComponentFixture<StudentSettingsPage>;
  let component: StudentSettingsPage;
  const profile = signal<StudentProfile>({
    id: 12,
    email: 'student@ump.ac.ma',
    firstName: 'Sara',
    lastName: 'Alaoui',
    pfpUrl: 'https://pub.example.r2.dev/profile-photos/student.png',
    numApogee: 'A123',
  });
  const profileService = {
    profile: profile.asReadonly(),
    isLoading: signal(false).asReadonly(),
    ensureLoaded: vi.fn(),
    updateProfilePhoto: vi.fn(),
    removeProfilePhoto: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentSettingsPage],
      providers: [
        {
          provide: AuthService,
          useValue: {
            currentUser: {
              id: '12',
              email: 'student@ump.ac.ma',
              role: Role.STUDENT,
              firstLogin: false,
            },
          },
        },
        { provide: StudentProfileService, useValue: profileService },
        {
          provide: FaceEnrollmentService,
          useValue: {
            enroll: vi.fn(),
            toUserMessage: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    vi.clearAllMocks();
    profile.set({
      id: 12,
      email: 'student@ump.ac.ma',
      firstName: 'Sara',
      lastName: 'Alaoui',
      pfpUrl: 'https://pub.example.r2.dev/profile-photos/student.png',
      numApogee: 'A123',
    });
    fixture = TestBed.createComponent(StudentSettingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows a trash button for persisted profile photos and opens confirmation', () => {
    const deleteButton = profilePhotoDeleteButton();

    expect(deleteButton).not.toBeNull();
    deleteButton!.click();
    fixture.detectChanges();

    expect(component.profilePhotoRemoveOpen()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Supprimer la photo de profil ?',
    );
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Photo à supprimer');
  });

  it('removes the profile photo and falls back to initials after confirmation', () => {
    profileService.removeProfilePhoto.mockImplementation(() => {
      profile.set({ ...profile(), pfpUrl: null });
      return of(profile());
    });
    component.profileImageFailed.set(true);
    component.openProfilePhotoRemoval();

    component.confirmProfilePhotoRemoval();
    fixture.detectChanges();

    expect(profileService.removeProfilePhoto).toHaveBeenCalledOnce();
    expect(component.profilePhotoRemoveOpen()).toBe(false);
    expect(component.profileImageFailed()).toBe(false);
    expect(component.profileImageUrl()).toBeNull();
    expect(component.profilePhotoMessage()).toBe('Photo de profil supprimée.');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('SA');
  });

  it('explains profile photo removal failures', () => {
    profileService.removeProfilePhoto.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    component.openProfilePhotoRemoval();

    component.confirmProfilePhotoRemoval();

    expect(profileService.removeProfilePhoto).toHaveBeenCalledOnce();
    expect(component.profilePhotoRemoveOpen()).toBe(false);
    expect(component.profilePhotoError()).toContain("Le serveur n'a pas pu supprimer");
  });

  function profilePhotoDeleteButton(): HTMLButtonElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(
      'button[aria-label="Supprimer la photo de profil"]',
    );
  }
});
