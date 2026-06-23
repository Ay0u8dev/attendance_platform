import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '../../../../environments/environment';
import {
  AdminImportResult,
  AdminTeacherDto,
  AdminTeacherRequest,
} from '../models/admin-user.model';

@Injectable({ providedIn: 'root' })
export class AdminTeacherService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/users/teacher`;

  getAll() {
    return this.http.get<AdminTeacherDto[]>(this.baseUrl);
  }

  create(payload: AdminTeacherRequest) {
    return this.http.post<AdminTeacherDto>(this.baseUrl, payload);
  }

  update(id: number, payload: AdminTeacherRequest) {
    return this.http.put<AdminTeacherDto>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  importExcel(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<AdminImportResult>(`${this.baseUrl}/import`, formData);
  }
}
