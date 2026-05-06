import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../../environments/environment';
import { AnneeUniversitaire, AnneeUniversitaireRequest } from '../models/annee-universitaire.model';

@Injectable({ providedIn: 'root' })
export class AnneeUniversitaireService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/users/structure/annees`;

  getAll() {
    return this.http.get<AnneeUniversitaire[]>(this.baseUrl);
  }

  getById(id: number) {
    return this.http.get<AnneeUniversitaire>(`${this.baseUrl}/${id}`);
  }

  create(payload: AnneeUniversitaireRequest) {
    return this.http.post<AnneeUniversitaire>(this.baseUrl, payload);
  }

  update(id: number, payload: AnneeUniversitaireRequest) {
    return this.http.put<AnneeUniversitaire>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
