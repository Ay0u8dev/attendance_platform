import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { FaceVerificationService } from './face-verification.service';

describe('FaceVerificationService', () => {
  let service: FaceVerificationService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FaceVerificationService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('posts an image-only multipart request to the verification endpoint', () => {
    const image = new Blob(['face'], { type: 'image/jpeg' });
    let result: { verified: boolean; score: number } | undefined;

    service.verify(image).subscribe((response) => (result = response));

    const request = httpTesting.expectOne('/api/face/student/verify');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeInstanceOf(FormData);
    const formData = request.request.body as FormData;
    expect([...formData.keys()]).toEqual(['image']);
    expect(formData.has('studentId')).toBe(false);
    expect(formData.has('sessionId')).toBe(false);
    expect(formData.has('gpsLat')).toBe(false);
    expect((formData.get('image') as File).name).toBe('face-verification.jpg');

    request.flush({ verified: true, score: 0.82 });
    expect(result).toEqual({ verified: true, score: 0.82 });
  });
});
