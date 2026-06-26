import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '../../../../environments/environment';
import { TeacherRequest, TeacherUser } from '../models/teacher.model';

@Injectable({ providedIn: 'root' })
export class TeacherService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/users/teacher`;

  getAll() {
    return this.http.get<TeacherUser[]>(this.baseUrl);
  }

  getById(id: number) {
    return this.http.get<TeacherUser>(`${this.baseUrl}/${id}`);
  }

  create(payload: TeacherRequest) {
    return this.http.post<TeacherUser>(this.baseUrl, payload);
  }

  update(id: number, payload: TeacherRequest) {
    return this.http.put<TeacherUser>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
