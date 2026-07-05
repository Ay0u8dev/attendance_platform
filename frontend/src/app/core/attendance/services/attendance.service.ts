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
  TeacherAttendanceReportDto,
  TeacherSessionsQuery,
} from '../models/attendance.model';
import { StudentAttendanceSessionSummaryDto } from '../models/student-attendance.model';
import { Observable } from 'rxjs';

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

  getTeacherExportReport(query: { dateFrom?: string; dateTo?: string; courseLabel?: string } = {}) {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<TeacherAttendanceReportDto>(`${this.baseUrl}/export-report`, { params });
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

  getStudentSessions(
    studentId: number,
    status?: string
  ): Observable<PagedResponse<StudentAttendanceSessionSummaryDto>> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    params = params.set('size', '1000');
    return this.http.get<PagedResponse<StudentAttendanceSessionSummaryDto>>(
      `${this.baseUrl}/students/${studentId}/sessions`,
      { params }
    );
  }
}
