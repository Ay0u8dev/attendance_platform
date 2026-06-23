import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface FaceAttendanceRequest {
  readonly sessionId: number;
  readonly deviceId: string;
  readonly gpsLat: string;
  readonly gpsLon: string;
  readonly image: Blob;
}

export interface FaceAttendanceUpdateResponse {
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
export class FaceAttendanceService {
  private readonly http = inject(HttpClient);
  private readonly faceBaseUrl = `${environment.apiBaseUrl}/face`;

  submitStudentFaceAttendance(
    request: FaceAttendanceRequest,
  ): Observable<FaceAttendanceUpdateResponse> {
    const formData = new FormData();
    formData.append('sessionId', String(request.sessionId));
    formData.append('deviceId', request.deviceId);
    formData.append('gpsLat', request.gpsLat);
    formData.append('gpsLon', request.gpsLon);
    formData.append('image', request.image, 'face-attendance.jpg');

    return this.http.post<FaceAttendanceUpdateResponse>(
      `${this.faceBaseUrl}/student/attendance`,
      formData,
    );
  }

  toUserMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Une erreur inattendue est survenue.';
    }

    const body = error.error;
    if (typeof body === 'string' && body.trim()) {
      return body.trim();
    }
    if (body && typeof body === 'object') {
      const message = this.readMessage(body);
      if (message) {
        return message;
      }
    }

    switch (error.status) {
      case 400:
        return 'Image invalide. Reprends la capture puis essaie encore.';
      case 401:
        return 'Session non authentifiee.';
      case 403:
        return 'Visage non reconnu. Reprends une photo puis réessaie.';
      case 409:
        return 'Ce pointage ne peut plus etre enregistre.';
      case 413:
        return 'Image trop volumineuse. Reprends une capture plus legere.';
      case 503:
        return "La verification faciale n'est pas disponible pour le moment.";
      default:
        return 'Impossible de valider la reconnaissance faciale.';
    }
  }

  private readMessage(body: object): string | null {
    const candidate = body as Record<string, unknown>;
    for (const key of ['detail', 'message', 'error']) {
      const value = candidate[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return null;
  }
}
