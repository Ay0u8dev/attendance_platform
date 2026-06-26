import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { FaceEnrollmentService } from './face-enrollment.service';

describe('FaceEnrollmentService', () => {
  let service: FaceEnrollmentService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FaceEnrollmentService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('posts an image-only multipart request to the public enrollment endpoint', () => {
    const image = new Blob(['face'], { type: 'image/jpeg' });
    const response = {
      studentId: 12,
      enrolled: true,
      firstLogin: false,
      faceEnrolledAt: '2026-06-22T10:00:00',
      authenticationRefreshRequired: true,
    };
    let result: typeof response | undefined;

    service.enroll(image).subscribe((value) => (result = value));

    const request = httpTesting.expectOne('/api/face/student/enrollment');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeInstanceOf(FormData);
    const formData = request.request.body as FormData;
    expect([...formData.keys()]).toEqual(['image']);
    expect(formData.has('studentId')).toBe(false);
    expect((formData.get('image') as File).name).toBe('face-enrollment.jpg');
    expect(request.request.headers.has('Content-Type')).toBe(false);
    request.flush(response);

    expect(result).toEqual(response);
  });

  it('uses backend validation details when available', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { detail: 'No face detected.' },
    });

    expect(service.toUserMessage(error)).toBe('No face detected.');
  });

  it('maps service timeouts to a useful fallback', () => {
    const error = new HttpErrorResponse({ status: 504 });

    expect(service.toUserMessage(error)).toContain('trop de temps');
  });
});
