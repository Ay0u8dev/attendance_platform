import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '../../../../environments/environment';
import {
  AdminImportResult,
  AdminStudentDto,
  AdminStudentRequest,
} from '../models/admin-user.model';

@Injectable({ providedIn: 'root' })
export class AdminStudentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/users/student`;

  getAll() {
    return this.http.get<AdminStudentDto[]>(this.baseUrl);
  }

  create(payload: AdminStudentRequest) {
    return this.http.post<AdminStudentDto>(this.baseUrl, payload);
  }

  update(id: number, payload: AdminStudentRequest) {
    return this.http.put<AdminStudentDto>(`${this.baseUrl}/${id}`, payload);
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
