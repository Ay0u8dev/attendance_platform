import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../core/auth/services/auth.service';
import { Role } from '../../core/auth/models/auth.model';
import { StudentProfile } from '../../core/student/models/student-profile.model';
import { StudentProfileService } from '../../core/student/services/student-profile.service';
import { StudentLayout } from './student-layout';

describe('StudentLayout profile avatar', () => {
  let fixture: ComponentFixture<StudentLayout>;
  let profile: ReturnType<typeof signal<StudentProfile | null>>;

  beforeEach(async () => {
    profile = signal<StudentProfile | null>({
      id: 7,
      email: 'student@example.com',
      firstName: 'Marie',
      lastName: 'Dupont',
      pfpUrl: 'https://example.com/student.jpg',
      numApogee: 'A123',
      filiere: 'Informatique',
      groupe: 'G1',
    });

    await TestBed.configureTestingModule({
      imports: [StudentLayout],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            currentUser: {
              firstName: 'Marie',
              lastName: 'Dupont',
              email: 'student@example.com',
              role: Role.STUDENT,
            },
            logout: vi.fn(),
          },
        },
        {
          provide: StudentProfileService,
          useValue: {
            profile: profile.asReadonly(),
            ensureLoaded: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentLayout);
    fixture.detectChanges();
  });

  it('renders the student profile image when pfpUrl is available', () => {
    const userMenuButton = findUserMenuButton();

    expect(userMenuButton.querySelector('img')?.getAttribute('src')).toBe(
      'https://example.com/student.jpg',
    );
    expect(userMenuButton.querySelector('.fa-user-graduate')).toBeNull();
  });

  it('falls back to the existing student icon when the profile image fails', () => {
    const image = findUserMenuButton().querySelector('img');

    image?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    const userMenuButton = findUserMenuButton();
    expect(userMenuButton.querySelector('img')).toBeNull();
    expect(userMenuButton.querySelector('.fa-user-graduate')).not.toBeNull();
  });

  function findUserMenuButton(): HTMLElement {
    const element = fixture.nativeElement as HTMLElement;
    const button = element.querySelector('button[aria-haspopup="menu"]');
    expect(button).not.toBeNull();
    return button as HTMLElement;
  }
});
