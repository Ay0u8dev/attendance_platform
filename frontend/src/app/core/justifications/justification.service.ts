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

  getJustifications(status?: JustificationStatus) {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<JustificationDto[]>(this.baseUrl, { params });
  }

  approveJustification(id: number, payload: ReviewJustificationRequest) {
    return this.http.patch<JustificationDto>(`${this.baseUrl}/${id}/approve`, payload);
  }

  declineJustification(id: number, payload: ReviewJustificationRequest) {
    return this.http.patch<JustificationDto>(`${this.baseUrl}/${id}/decline`, payload);
  }
}
