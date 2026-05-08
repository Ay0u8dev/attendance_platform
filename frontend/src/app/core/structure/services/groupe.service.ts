import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../../environments/environment';
import { Groupe, GroupeRequest } from '../models/groupe.model';

@Injectable({ providedIn: 'root' })
export class GroupeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/users/structure/groupes`;

  getAll() {
    return this.http.get<Groupe[]>(this.baseUrl);
  }

  getById(id: number) {
    return this.http.get<Groupe>(`${this.baseUrl}/${id}`);
  }

  create(payload: GroupeRequest) {
    return this.http.post<Groupe>(this.baseUrl, payload);
  }

  update(id: number, payload: GroupeRequest) {
    return this.http.put<Groupe>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
