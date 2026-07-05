import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../../environments/environment';
import { Module, ModuleRequest } from '../models/module.model';

@Injectable({ providedIn: 'root' })
export class ModuleService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/users/structure/modules`;

  getAll() {
    return this.http.get<Module[]>(this.baseUrl);
  }

  getById(id: number) {
    return this.http.get<Module>(`${this.baseUrl}/${id}`);
  }

  create(payload: ModuleRequest) {
    return this.http.post<Module>(this.baseUrl, payload);
  }

  update(id: number, payload: ModuleRequest) {
    return this.http.put<Module>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
