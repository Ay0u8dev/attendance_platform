import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  AttendanceBadgeVariant,
  AttendanceSessionMethod,
  AttendanceStudentStatus,
  PagedResponseDto,
  StudentAttendanceOverviewDto,
  StudentAttendanceSessionDetailDto,
  StudentAttendanceSessionQuery,
  StudentAttendanceSessionSummaryDto,
  StudentSessionDetailViewModel,
  StudentSessionListItem,
  StudentSessionsOverviewViewModel,
} from '../models/student-attendance.model';
import {
  buildMockStudentAttendanceOverview,
  MOCK_STUDENT_ATTENDANCE_DETAILS,
  MOCK_STUDENT_ATTENDANCE_SUMMARIES,
} from './student-attendance.mock';

@Injectable({ providedIn: 'root' })
export class StudentAttendanceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/attendance/student`;
  private readonly dateFormatter = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  private readonly timeFormatter = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  private readonly dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  getStudentSessions(
    query: StudentAttendanceSessionQuery,
  ): Observable<PagedResponseDto<StudentAttendanceSessionSummaryDto>> {
    if (environment.useMockStudentAttendance) {
      return of(this.getMockStudentSessions(query));
    }

    return this.http.get<PagedResponseDto<StudentAttendanceSessionSummaryDto>>(
      `${this.baseUrl}/sessions`,
      {
        params: this.buildQueryParams(query),
      },
    );
  }

  getStudentSession(sessionId: number): Observable<StudentAttendanceSessionDetailDto> {
    if (environment.useMockStudentAttendance) {
      const detail = MOCK_STUDENT_ATTENDANCE_DETAILS.find(
        (session) => session.sessionId === sessionId,
      );
      if (!detail) {
        return throwError(
          () =>
            new HttpErrorResponse({
              status: 404,
              statusText: 'Not Found',
              url: `${this.baseUrl}/sessions/${sessionId}`,
            }),
        );
      }

      return of(detail);
    }

    return this.http.get<StudentAttendanceSessionDetailDto>(`${this.baseUrl}/sessions/${sessionId}`);
  }

  getStudentOverview(): Observable<StudentAttendanceOverviewDto> {
    if (environment.useMockStudentAttendance) {
      return of(buildMockStudentAttendanceOverview());
    }

    return this.http.get<StudentAttendanceOverviewDto>(`${this.baseUrl}/overview`);
  }

  toSessionListItem(dto: StudentAttendanceSessionSummaryDto): StudentSessionListItem {
    return {
      id: dto.sessionId,
      teacherFullName: this.teacherLabel(dto.teacherFullName),
      courseLabel: dto.courseLabel,
      roomLabel: dto.roomLabel,
      groupSummary: this.formatGroupSummary(dto.groupIds),
      dateLabel: this.formatDate(dto.startedAt),
      timeLabel: this.formatTimeRange(dto.startedAt, dto.endedAt),
      attendanceLabel: this.attendanceLabel(dto.attendanceStatus),
      attendanceVariant: this.attendanceVariant(dto.attendanceStatus),
      sessionMethodLabel: this.methodLabel(dto.sessionMethod),
      markMethodLabel: this.methodLabel(dto.markMethod),
      startedAt: dto.startedAt,
      endedAt: dto.endedAt,
      markedAt: dto.markedAt,
      attendanceStatus: dto.attendanceStatus,
      sessionMethod: dto.sessionMethod,
      markMethod: dto.markMethod,
    };
  }

  toSessionDetailViewModel(dto: StudentAttendanceSessionDetailDto): StudentSessionDetailViewModel {
    const startedAt = new Date(dto.startedAt);
    const endsAt = new Date(dto.endsAt);

    return {
      sessionId: dto.sessionId,
      teacherFullName: this.teacherLabel(dto.teacherFullName),
      courseLabel: dto.courseLabel,
      roomLabel: dto.roomLabel,
      groupSummary: this.formatGroupSummary(dto.groupIds),
      attendanceLabel: this.attendanceLabel(dto.attendanceStatus),
      attendanceVariant: this.attendanceVariant(dto.attendanceStatus),
      sessionMethodLabel: this.methodLabel(dto.sessionMethod),
      markMethodLabel: this.methodLabel(dto.markMethod),
      sessionScheduleLabel: this.formatScheduleRange(startedAt, endsAt),
      startedAtLabel: this.dateTimeFormatter.format(startedAt),
      endsAtLabel: this.dateTimeFormatter.format(endsAt),
      endedAtLabel: dto.endedAt ? this.formatDateTime(dto.endedAt) : null,
      markedAtLabel: dto.markedAt ? this.formatDateTime(dto.markedAt) : null,
      studentFullName: `${dto.firstName} ${dto.lastName}`.trim(),
      studentEmail: dto.email,
      numApogee: dto.numApogee,
      deviceId: dto.deviceId,
      gpsLabel:
        dto.markedGpsLat && dto.markedGpsLon
          ? `${dto.markedGpsLat}, ${dto.markedGpsLon}`
          : null,
      raw: dto,
    };
  }

  toOverviewViewModel(dto: StudentAttendanceOverviewDto): StudentSessionsOverviewViewModel {
    return {
      totalSessions: dto.totalSessions,
      presentCount: dto.presents,
      absentCount: dto.absences,
      attendanceRateLabel: `${(dto.attendanceRate * 100).toFixed(1)}%`,
    };
  }

  private buildQueryParams(query: StudentAttendanceSessionQuery): HttpParams {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') {
        continue;
      }

      params = params.set(key, String(value));
    }

    return params;
  }

  private attendanceLabel(status: AttendanceStudentStatus): string {
    switch (status) {
      case 'PRESENT':
        return 'Présent';
      case 'ABSENT':
        return 'Absent';
      default:
        return 'Inconnu';
    }
  }

  private attendanceVariant(status: AttendanceStudentStatus): AttendanceBadgeVariant {
    switch (status) {
      case 'PRESENT':
        return 'success';
      case 'ABSENT':
        return 'error';
      default:
        return 'neutral';
    }
  }

  private getMockStudentSessions(
    query: StudentAttendanceSessionQuery,
  ): PagedResponseDto<StudentAttendanceSessionSummaryDto> {
    const page = query.page ?? 0;
    const size = query.size ?? 20;
    const filteredItems = MOCK_STUDENT_ATTENDANCE_SUMMARIES.filter((session) =>
      this.matchesMockQuery(session, query),
    );
    const sortedItems = this.sortMockSessions(filteredItems, query.sort);
    const startIndex = page * size;
    const items = sortedItems.slice(startIndex, startIndex + size);

    return {
      items,
      page,
      size,
      totalElements: sortedItems.length,
      totalPages: size <= 0 ? 0 : Math.ceil(sortedItems.length / size),
    };
  }

  private matchesMockQuery(
    session: StudentAttendanceSessionSummaryDto,
    query: StudentAttendanceSessionQuery,
  ): boolean {
    if (query.status && session.attendanceStatus !== query.status) {
      return false;
    }

    const startedAt = new Date(session.startedAt).getTime();
    if (query.dateFrom && startedAt < this.startOfDay(query.dateFrom).getTime()) {
      return false;
    }

    if (query.dateTo && startedAt >= this.startOfNextDay(query.dateTo).getTime()) {
      return false;
    }

    return true;
  }

  private sortMockSessions(
    sessions: readonly StudentAttendanceSessionSummaryDto[],
    sort: string | undefined,
  ): readonly StudentAttendanceSessionSummaryDto[] {
    const [property = 'startedAt', direction = 'desc'] = sort?.split(',') ?? [];
    if (property !== 'startedAt') {
      return [...sessions];
    }

    const directionMultiplier = direction.toLowerCase() === 'asc' ? 1 : -1;
    return [...sessions].sort(
      (first, second) =>
        (new Date(first.startedAt).getTime() - new Date(second.startedAt).getTime()) *
        directionMultiplier,
    );
  }

  private startOfDay(date: string): Date {
    return new Date(`${date}T00:00:00`);
  }

  private startOfNextDay(date: string): Date {
    const value = this.startOfDay(date);
    value.setDate(value.getDate() + 1);
    return value;
  }

  private methodLabel(method: AttendanceSessionMethod | null): string {
    if (!method) {
      return 'Non marqué';
    }

    switch (method) {
      case 'QR_CODE':
        return 'QR code';
      case 'FACE_ID':
        return 'Reconnaissance faciale';
      case 'MANUAL':
        return 'Manuel';
      default:
        return method;
    }
  }

  private teacherLabel(value: string | null): string {
    const normalized = value?.trim();
    return normalized || 'Enseignant non renseigné';
  }

  private formatGroupSummary(groupIds: readonly number[]): string {
    if (groupIds.length === 0) {
      return 'Aucun groupe';
    }

    if (groupIds.length === 1) {
      return `Groupe ${groupIds[0]}`;
    }

    return `Groupes ${groupIds.join(', ')}`;
  }

  private formatDate(value: string): string {
    return this.dateFormatter.format(new Date(value));
  }

  private formatDateTime(value: string): string {
    return this.dateTimeFormatter.format(new Date(value));
  }

  private formatScheduleRange(startedAt: Date, endsAt: Date): string {
    const startDate = this.dateFormatter.format(startedAt);
    const endDate = this.dateFormatter.format(endsAt);
    const startTime = this.timeFormatter.format(startedAt);
    const endTime = this.timeFormatter.format(endsAt);

    if (startDate === endDate) {
      return `${startDate}, ${startTime} - ${endTime}`;
    }

    return `${startDate}, ${startTime} - ${endDate}, ${endTime}`;
  }

  private formatTimeRange(startedAt: string, endedAt: string | null): string {
    const start = this.timeFormatter.format(new Date(startedAt));
    if (!endedAt) {
      return start;
    }

    return `${start} - ${this.timeFormatter.format(new Date(endedAt))}`;
  }
}
