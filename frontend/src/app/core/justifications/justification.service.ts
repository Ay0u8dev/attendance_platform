import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  DecisionJustificationRequest,
  JustificationDto,
  JustificationStatus,
  ReviewJustificationRequest,
  SubmitJustificationRequest,
} from './justification.model';

type JustificationUploadNameParts = {
  readonly studentName?: string;
  readonly moduleName?: string;
  readonly sessionMonth?: string;
  readonly sessionDay?: string;
  readonly sessionStartTime?: string;
  readonly sessionEndTime?: string;
};

@Injectable({ providedIn: 'root' })
export class JustificationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/justifications`;

  getAdminJustifications(status?: JustificationStatus | null) {
    return this.getForRole('admin', status);
  }

  getTeacherJustifications(status?: JustificationStatus | null) {
    return this.getForRole('teacher', status);
  }

  getStudentJustifications(status?: JustificationStatus | null) {
    return this.getForRole('student', status);
  }

  getJustifications(status?: JustificationStatus, studentId?: number) {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    if (studentId) {
      params = params.set('studentId', studentId.toString());
    }

    return this.http.get<JustificationDto[]>(this.baseUrl, { params });
  }

  getById(id: number) {
    return this.http.get<JustificationDto>(`${this.baseUrl}/${id}`);
  }

  getJustification(id: number) {
    return this.getById(id);
  }

  submitForStudent(payload: SubmitJustificationRequest) {
    return this.http.post<JustificationDto>(`${this.baseUrl}/student`, payload);
  }

  submitJustification(payload: unknown) {
    return this.http.post<JustificationDto>(this.baseUrl, payload);
  }

  decide(id: number, payload: DecisionJustificationRequest) {
    return this.http.patch<JustificationDto>(`${this.baseUrl}/${id}/decision`, payload);
  }

  approveJustification(id: number, payload: ReviewJustificationRequest) {
    return this.http.patch<JustificationDto>(`${this.baseUrl}/${id}/approve`, payload);
  }

  declineJustification(id: number, payload: ReviewJustificationRequest) {
    return this.http.patch<JustificationDto>(`${this.baseUrl}/${id}/decline`, payload);
  }

  uploadDocument(file: File, nameParts: JustificationUploadNameParts = {}): Observable<string> {
    const contentType = file.type || 'application/octet-stream';
    let params = new HttpParams().set('contentType', contentType);

    for (const [key, value] of Object.entries(nameParts)) {
      if (value) {
        params = params.set(key, value);
      }
    }

    return this.http
      .get<{ url: string; key: string }>(`${this.baseUrl}/presigned-url`, { params })
      .pipe(
        switchMap((presignedData) =>
          this.http
            .put(presignedData.url, file, {
              headers: {
                'Content-Type': contentType,
              },
            })
            .pipe(map(() => `${environment.r2PublicUrl}/${presignedData.key}`)),
        ),
      );
  }

  resolveDocumentUrl(documentUrl: string | null | undefined): string | null {
    const trimmed = documentUrl?.trim();
    if (!trimmed) {
      return null;
    }

    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }

    return `${environment.r2PublicUrl}/${trimmed.replace(/^\/+/, '')}`;
  }

  private getForRole(role: 'admin' | 'teacher' | 'student', status?: JustificationStatus | null) {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<JustificationDto[]>(`${this.baseUrl}/${role}`, { params });
  }
}
