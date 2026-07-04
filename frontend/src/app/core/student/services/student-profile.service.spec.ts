import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { Role } from '../../auth/models/auth.model';
import { AuthService } from '../../auth/services/auth.service';
import { StudentProfileService } from './student-profile.service';

describe('StudentProfileService profile photo removal', () => {
  let service: StudentProfileService;
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
              id: '12',
              email: 'student@ump.ac.ma',
              role: Role.STUDENT,
              firstLogin: false,
            },
          },
        },
      ],
    });

    service = TestBed.inject(StudentProfileService);
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

    const request = httpTesting.expectOne(`${environment.apiBaseUrl}/users/student/profile/photo`);
    expect(request.request.method).toBe('DELETE');
    request.flush({
      id: 12,
      email: 'student@ump.ac.ma',
      firstName: 'Sara',
      lastName: 'Alaoui',
      pfpUrl: null,
    });

    expect(receivedPfpUrl).toBeNull();
    expect(service.profile()?.pfpUrl).toBeNull();
  });
});
