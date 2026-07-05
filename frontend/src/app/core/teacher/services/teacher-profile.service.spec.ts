import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { Role } from '../../auth/models/auth.model';
import { AuthService } from '../../auth/services/auth.service';
import { TeacherProfileService } from './teacher-profile.service';

describe('TeacherProfileService profile photo removal', () => {
  let service: TeacherProfileService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
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
      ],
    });

    service = TestBed.inject(TeacherProfileService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('removes the profile photo and updates the profile signal', () => {
    let receivedPfpUrl: string | null | undefined = 'not-called';

    service.removeProfilePhoto().subscribe((profile) => {
      receivedPfpUrl = profile.pfpUrl;
    });

    const request = httpTesting.expectOne(`${environment.apiBaseUrl}/users/teacher/profile/photo`);
    expect(request.request.method).toBe('DELETE');
    request.flush({
      id: 7,
      email: 'teacher@ump.ac.ma',
      firstName: 'Ahmed',
      lastName: 'Bennani',
      pfpUrl: null,
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

    expect(receivedPfpUrl).toBeNull();
    expect(service.profile()?.pfpUrl).toBeNull();
  });
});
