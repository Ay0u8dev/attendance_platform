import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../../environments/environment';
import { Formation, FormationRequest } from '../models/formation.model';

@Injectable({ providedIn: 'root' })
export class FormationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/users/structure/formations`;

  getAll() {
    return this.http.get<Formation[]>(this.baseUrl);
  }

  getById(id: number) {
    return this.http.get<Formation>(`${this.baseUrl}/${id}`);
  }

  create(payload: FormationRequest) {
    return this.http.post<Formation>(this.baseUrl, payload);
  }

  update(id: number, payload: FormationRequest) {
    return this.http.put<Formation>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
