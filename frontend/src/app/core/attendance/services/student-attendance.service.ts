import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

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

  getStudentSessions(query: StudentAttendanceSessionQuery) {
    return this.http.get<PagedResponseDto<StudentAttendanceSessionSummaryDto>>(
      `${this.baseUrl}/sessions`,
      {
        params: this.buildQueryParams(query),
      },
    );
  }

  getStudentSession(sessionId: number) {
    return this.http.get<StudentAttendanceSessionDetailDto>(`${this.baseUrl}/sessions/${sessionId}`);
  }

  getStudentOverview() {
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

  private methodLabel(method: AttendanceSessionMethod): string {
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
