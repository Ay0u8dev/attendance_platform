import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../../environments/environment';
import { Filiere, FiliereRequest } from '../models/filiere.model';

@Injectable({ providedIn: 'root' })
export class FiliereService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/users/structure/filieres`;

  getAll() {
    return this.http.get<Filiere[]>(this.baseUrl);
  }

  getById(id: number) {
    return this.http.get<Filiere>(`${this.baseUrl}/${id}`);
  }

  create(payload: FiliereRequest) {
    return this.http.post<Filiere>(this.baseUrl, payload);
  }

  update(id: number, payload: FiliereRequest) {
    return this.http.put<Filiere>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
