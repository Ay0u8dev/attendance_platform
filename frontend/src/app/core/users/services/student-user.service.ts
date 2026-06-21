import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '../../../../environments/environment';
import { StudentUser } from '../models/student.model';

@Injectable({ providedIn: 'root' })
export class StudentUserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/users/student`;

  getAll() {
    return this.http.get<StudentUser[]>(this.baseUrl);
  }

  getByGroupeId(groupeId: number) {
    return this.http.get<StudentUser[]>(`${this.baseUrl}/groupe/${groupeId}`);
  }
}
