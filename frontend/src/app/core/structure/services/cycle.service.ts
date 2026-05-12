import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../../environments/environment';
import { Cycle, CycleRequest } from '../models/cycle.model';

@Injectable({ providedIn: 'root' })
export class CycleService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/users/structure/cycles`;

  getAll() {
    return this.http.get<Cycle[]>(this.baseUrl);
  }

  getById(id: number) {
    return this.http.get<Cycle>(`${this.baseUrl}/${id}`);
  }

  create(payload: CycleRequest) {
    return this.http.post<Cycle>(this.baseUrl, payload);
  }

  update(id: number, payload: CycleRequest) {
    return this.http.put<Cycle>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
