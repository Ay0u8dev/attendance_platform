import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '../../../../environments/environment';
import {
  AdminStudentInscriptionDto,
  AdminStudentInscriptionRequest,
  AdminTeacherAssignmentDto,
  AdminTeacherAssignmentRequest,
} from '../models/admin-inscription.model';

@Injectable({ providedIn: 'root' })
export class AdminInscriptionService {
  private readonly http = inject(HttpClient);
  private readonly studentBaseUrl = `${environment.apiBaseUrl}/users/student/inscription`;
  private readonly teacherBaseUrl = `${environment.apiBaseUrl}/users/teacher/assignments`;

  getStudentInscriptions() {
    return this.http.get<AdminStudentInscriptionDto[]>(this.studentBaseUrl);
  }

  createStudentInscription(payload: AdminStudentInscriptionRequest) {
    return this.http.post<AdminStudentInscriptionDto>(this.studentBaseUrl, payload);
  }

  updateStudentInscription(id: number, payload: AdminStudentInscriptionRequest) {
    return this.http.put<AdminStudentInscriptionDto>(`${this.studentBaseUrl}/${id}`, payload);
  }

  deleteStudentInscription(id: number) {
    return this.http.delete<void>(`${this.studentBaseUrl}/${id}`);
  }

  getTeacherAssignments() {
    return this.http.get<AdminTeacherAssignmentDto[]>(this.teacherBaseUrl);
  }

  createTeacherAssignment(payload: AdminTeacherAssignmentRequest) {
    return this.http.post<AdminTeacherAssignmentDto>(this.teacherBaseUrl, payload);
  }

  updateTeacherAssignment(id: number, payload: AdminTeacherAssignmentRequest) {
    return this.http.put<AdminTeacherAssignmentDto>(`${this.teacherBaseUrl}/${id}`, payload);
  }

  deleteTeacherAssignment(id: number) {
    return this.http.delete<void>(`${this.teacherBaseUrl}/${id}`);
  }
}
