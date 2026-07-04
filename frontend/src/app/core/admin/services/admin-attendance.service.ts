import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '../../../../environments/environment';
import {
  AdminAttendanceOverviewDto,
  AdminAttendanceSessionDetailsDto,
  AdminAttendanceSessionSummaryDto,
  AdminStudentAttendanceSummaryDto,
  AttendanceStudentStatus,
  PagedResponseDto,
} from '../models/admin-attendance.model';
import { StudentAttendanceSessionSummaryDto } from '../../attendance/models/student-attendance.model';

@Injectable({ providedIn: 'root' })
export class AdminAttendanceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/attendance/admin`;

  getOverview() {
    return this.http.get<AdminAttendanceOverviewDto>(`${this.baseUrl}/overview`);
  }

  getSessions(query: {
    readonly page?: number;
    readonly size?: number;
    readonly sort?: string;
    readonly status?: string;
    readonly teacherId?: number | null;
    readonly groupId?: number | null;
  } = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }

    return this.http.get<PagedResponseDto<AdminAttendanceSessionSummaryDto>>(
      `${this.baseUrl}/sessions`,
      { params },
    );
  }

  getSession(sessionId: number) {
    return this.http.get<AdminAttendanceSessionDetailsDto>(
      `${this.baseUrl}/sessions/${sessionId}`,
    );
  }

  getStudentSummary(
    studentId: number,
    query: { readonly dateFrom?: string | null; readonly dateTo?: string | null } = {},
  ) {
    let params = new HttpParams();
    if (query.dateFrom) {
      params = params.set('dateFrom', query.dateFrom);
    }
    if (query.dateTo) {
      params = params.set('dateTo', query.dateTo);
    }

    return this.http.get<AdminStudentAttendanceSummaryDto>(
      `${this.baseUrl}/students/${studentId}/summary`,
      { params },
    );
  }

  getStudentSessions(
    studentId: number,
    query: {
      readonly status?: AttendanceStudentStatus | null;
      readonly dateFrom?: string | null;
      readonly dateTo?: string | null;
      readonly page?: number;
      readonly size?: number;
      readonly sort?: string;
    } = {},
  ) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }

    return this.http.get<PagedResponseDto<StudentAttendanceSessionSummaryDto>>(
      `${this.baseUrl}/students/${studentId}/sessions`,
      { params },
    );
  }
}
