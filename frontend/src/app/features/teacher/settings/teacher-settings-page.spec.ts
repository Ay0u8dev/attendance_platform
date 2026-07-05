import { HttpErrorResponse } from '@angular/common/http';
import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { Role } from '../../../core/auth/models/auth.model';
import { AuthService } from '../../../core/auth/services/auth.service';
import { TeacherProfile } from '../../../core/teacher/models/teacher-profile.model';
import { TeacherPreferencesService } from '../../../core/teacher/services/teacher-preferences.service';
import { TeacherProfileService } from '../../../core/teacher/services/teacher-profile.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { TeacherSettingsPage } from './teacher-settings-page';

describe('TeacherSettingsPage profile photo removal', () => {
  let fixture: ComponentFixture<TeacherSettingsPage>;
  let component: TeacherSettingsPage;
  const sessionDurationMinutes = signal<90>(90);
  const profile = signal<TeacherProfile>({
    id: 7,
    email: 'teacher@ump.ac.ma',
    firstName: 'Ahmed',
    lastName: 'Bennani',
    pfpUrl: 'https://pub.example.r2.dev/profile-photos/teacher.png',
    enabled: true,
    firstLogin: false,
    moduleCount: 0,
    groupCount: 0,
    formationCount: 0,
    modules: [],
    groupes: [],
    formations: [],
    filieres: [],
  });
  const profileService = {
    profile: profile.asReadonly(),
    isLoading: signal(false).asReadonly(),
    ensureLoaded: vi.fn(),
    updateProfilePhoto: vi.fn(),
    removeProfilePhoto: vi.fn(),
  };
  const preferencesService = {
    sessionDurationMinutes,
    sessionDurationLabel: computed(() => '1h30'),
    setSessionDuration: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherSettingsPage],
      providers: [
        {
          provide: AuthService,
          useValue: {
            currentUser: {
              id: '7',
              email: 'teacher@ump.ac.ma',
              role: Role.TEACHER,
              firstLogin: false,
            },
          },
        },
        { provide: TeacherProfileService, useValue: profileService },
        { provide: TeacherPreferencesService, useValue: preferencesService },
        { provide: ToastService, useValue: { success: vi.fn() } },
      ],
    }).compileComponents();

    vi.clearAllMocks();
    profile.set({
      id: 7,
      email: 'teacher@ump.ac.ma',
      firstName: 'Ahmed',
      lastName: 'Bennani',
      pfpUrl: 'https://pub.example.r2.dev/profile-photos/teacher.png',
      enabled: true,
      firstLogin: false,
      moduleCount: 0,
      groupCount: 0,
      formationCount: 0,
      modules: [],
      groupes: [],
      formations: [],
      filieres: [],
    });
    fixture = TestBed.createComponent(TeacherSettingsPage);
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
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('AB');
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
