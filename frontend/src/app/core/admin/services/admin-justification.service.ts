import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '../../../../environments/environment';
import {
  AdminJustificationDto,
  AdminJustificationReviewRequest,
  AdminJustificationStatus,
} from '../models/admin-justification.model';

@Injectable({ providedIn: 'root' })
export class AdminJustificationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/attendance/admin/justifications`;

  getAll(status?: AdminJustificationStatus | null) {
    const params = status ? new HttpParams().set('status', status) : undefined;
    return this.http.get<AdminJustificationDto[]>(this.baseUrl, { params });
  }

  review(id: number, payload: AdminJustificationReviewRequest) {
    return this.http.patch<AdminJustificationDto>(`${this.baseUrl}/${id}/review`, payload);
  }
}
