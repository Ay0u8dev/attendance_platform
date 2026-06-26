import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { FaceAttendanceService } from './face-attendance.service';

describe('FaceAttendanceService', () => {
  let service: FaceAttendanceService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FaceAttendanceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts only the safe attendance multipart fields', () => {
    service
      .submitStudentFaceAttendance({
        sessionId: 42,
        deviceId: 'device-1',
        gpsLat: '34.1',
        gpsLon: '-6.2',
        image: new Blob(['face'], { type: 'image/jpeg' }),
      })
      .subscribe();

    const request = http.expectOne('/api/face/student/attendance');
    expect(request.request.method).toBe('POST');
    const body = request.request.body as FormData;
    expect([...body.keys()].sort()).toEqual(['deviceId', 'gpsLat', 'gpsLon', 'image', 'sessionId']);
    expect(body.has('studentId')).toBe(false);
    request.flush({
      sessionId: 42,
      studentId: 7,
      status: 'PRESENT',
      markMethod: 'FACE_ID',
      markedAt: null,
      presentCount: 1,
      absentCount: 0,
      unknownCount: 0,
    });
  });
});
