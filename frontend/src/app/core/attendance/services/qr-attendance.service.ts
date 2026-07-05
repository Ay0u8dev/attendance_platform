import { HttpBackend, HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AttendanceSessionStatus } from '../models/student-attendance.model';

export interface TeacherAttendanceStudentViewDto {
  readonly studentId: number;
  readonly groupId: number;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly pfpUrl: string | null;
  readonly numApogee: string;
  readonly status: string;
  readonly markedAt: string | null;
  readonly markMethod: string | null;
}

export interface TeacherAttendanceSessionDetailsDto {
  readonly sessionId: number;
  readonly teacherId: number;
  readonly teacherFullName: string | null;
  readonly groupIds: readonly number[];
  readonly courseLabel: string;
  readonly roomLabel: string;
  readonly gpsLat: string | null;
  readonly gpsLon: string | null;
  readonly startedAt: string;
  readonly endsAt: string;
  readonly endedAt: string | null;
  readonly status: AttendanceSessionStatus;
  readonly presentCount: number;
  readonly absentCount: number;
  readonly unknownCount: number;
  readonly students: readonly TeacherAttendanceStudentViewDto[];
}

export interface QrPayloadResponse {
  readonly sessionId: number;
  readonly payload: string;
  readonly expiresAt: string;
  readonly refreshAfterSeconds: number;
}

export interface QrStudentScanRequest {
  readonly payload: string;
  readonly deviceId: string;
  readonly gpsLat?: string;
  readonly gpsLon?: string;
}

export interface QrAttendanceUpdateResponse {
  readonly sessionId: number;
  readonly studentId: number;
  readonly status: string;
  readonly markMethod: string;
  readonly markedAt: string | null;
  readonly presentCount: number;
  readonly absentCount: number;
  readonly unknownCount: number;
}

@Injectable({ providedIn: 'root' })
export class QrAttendanceService {
  private readonly http = inject(HttpClient);
  private readonly rawHttp = new HttpClient(inject(HttpBackend));
  private readonly qrBaseUrl = `${environment.apiBaseUrl}/qr`;
  private readonly attendanceBaseUrl = `${environment.apiBaseUrl}/attendance`;

  getTeacherActiveSessionWithToken(token: string): Observable<TeacherAttendanceSessionDetailsDto> {
    return this.rawHttp.get<TeacherAttendanceSessionDetailsDto>(
      `${this.attendanceBaseUrl}/sessions/active`,
      { headers: this.authorizationHeaders(token) },
    );
  }

  createTeacherPayloadWithToken(
    sessionId: number,
    token: string,
  ): Observable<QrPayloadResponse> {
    return this.rawHttp.post<QrPayloadResponse>(
      `${this.qrBaseUrl}/teacher/sessions/${sessionId}/payload`,
      {},
      { headers: this.authorizationHeaders(token) },
    );
  }

  createTeacherPayload(sessionId: number): Observable<QrPayloadResponse> {
    return this.http.post<QrPayloadResponse>(
      `${this.qrBaseUrl}/teacher/sessions/${sessionId}/payload`,
      {},
    );
  }

  submitStudentQrScan(request: QrStudentScanRequest): Observable<QrAttendanceUpdateResponse> {
    return this.http.post<QrAttendanceUpdateResponse>(`${this.qrBaseUrl}/student/scan`, request);
  }

  toUserMessage(error: unknown): string {
    return qrAttendanceErrorMessage(error);
  }

  private authorizationHeaders(token: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${token.trim()}` });
  }

}

export function qrAttendanceErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Une erreur inattendue est survenue.';
  }

  const body = error.error;
  if (typeof body === 'string' && body.trim()) {
    return body.trim();
  }
  if (body && typeof body === 'object') {
    const message = readMessage(body);
    if (message) {
      return message;
    }
  }

  const fallback = qrStatusMessage(error.status);
  if (fallback) {
    return fallback;
  }

  return 'Impossible de valider le QR code.';
}

function readMessage(body: object): string | null {
  const candidate = body as Record<string, unknown>;
  for (const key of ['detail', 'message', 'error']) {
    const value = candidate[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function qrStatusMessage(statusCode: number): string | null {
  switch (statusCode) {
    case 400:
      return 'QR code invalide.';
    case 401:
      return 'Session non authentifiee.';
    case 403:
      return 'Acces refuse pour ce role.';
    case 409:
      return 'Ce pointage ne peut plus etre enregistre.';
    case 410:
      return 'QR code expire. Scanne le nouveau code affiche.';
    case 502:
      return 'Service QR indisponible. Verifiez que qr-service est demarre sur le port 8001.';
    case 504:
      return 'Service QR trop lent ou indisponible. Reessayez dans quelques secondes.';
    default:
      return null;
  }
}
