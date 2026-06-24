import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import {
  DecisionJustificationRequest,
  JustificationDto,
  JustificationStatus,
  SubmitJustificationRequest,
} from './justification.model';

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

  getById(id: number) {
    return this.http.get<JustificationDto>(`${this.baseUrl}/${id}`);
  }

  submitForStudent(payload: SubmitJustificationRequest) {
    return this.http.post<JustificationDto>(`${this.baseUrl}/student`, payload);
  }

  decide(id: number, payload: DecisionJustificationRequest) {
    return this.http.patch<JustificationDto>(`${this.baseUrl}/${id}/decision`, payload);
  }

  private getForRole(role: 'admin' | 'teacher' | 'student', status?: JustificationStatus | null) {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<JustificationDto[]>(`${this.baseUrl}/${role}`, { params });
  }
}
