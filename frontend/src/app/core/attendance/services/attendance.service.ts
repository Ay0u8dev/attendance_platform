import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '../../../../environments/environment';
import {
  AttendanceSessionResponse,
  AttendanceSessionSummary,
  AttendanceUpdateResponse,
  CreateAttendanceSessionRequest,
  ManualAttendanceUpdateRequest,
  PagedResponse,
  TeacherSessionsQuery,
} from '../models/attendance.model';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/attendance/sessions`;

  createSession(payload: CreateAttendanceSessionRequest) {
    return this.http.post<AttendanceSessionResponse>(this.baseUrl, payload);
  }

  getSession(sessionId: number) {
    return this.http.get<AttendanceSessionResponse>(`${this.baseUrl}/${sessionId}`);
  }

  getActiveSession() {
    return this.http.get<AttendanceSessionResponse>(`${this.baseUrl}/active`);
  }

  getTeacherSessions(query: TeacherSessionsQuery = {}) {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<PagedResponse<AttendanceSessionSummary>>(this.baseUrl, { params });
  }

  updateAttendance(sessionId: number, payload: ManualAttendanceUpdateRequest) {
    return this.http.post<AttendanceUpdateResponse>(
      `${this.baseUrl}/${sessionId}/attendance`,
      payload,
    );
  }

  endSession(sessionId: number) {
    return this.http.post<AttendanceSessionResponse>(`${this.baseUrl}/${sessionId}/end`, {});
  }
}
