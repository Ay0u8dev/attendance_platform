import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import {
  JustificationDto,
  JustificationStatus,
  ReviewJustificationRequest,
} from './justification.model';

@Injectable({ providedIn: 'root' })
export class JustificationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/justifications`;

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

  getJustification(id: number) {
    return this.http.get<JustificationDto>(`${this.baseUrl}/${id}`);
  }

  getPresignedUrl(contentType: string) {
    return this.http.get<{ url: string; key: string }>(`${this.baseUrl}/presigned-url`, {
      params: new HttpParams().set('contentType', contentType)
    });
  }

  uploadToPresignedUrl(url: string, file: File) {
    return this.http.put(url, file, {
      headers: {
        'Content-Type': file.type || 'application/octet-stream'
      }
    });
  }

  submitJustification(payload: any) {
    return this.http.post<JustificationDto>(this.baseUrl, payload);
  }

  approveJustification(id: number, payload: ReviewJustificationRequest) {
    return this.http.patch<JustificationDto>(`${this.baseUrl}/${id}/approve`, payload);
  }

  declineJustification(id: number, payload: ReviewJustificationRequest) {
    return this.http.patch<JustificationDto>(`${this.baseUrl}/${id}/decline`, payload);
  }
}
