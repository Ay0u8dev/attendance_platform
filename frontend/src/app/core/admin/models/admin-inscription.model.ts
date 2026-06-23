export interface AdminStudentInscriptionDto {
  readonly id: number;
  readonly studentId: number;
  readonly studentFirstName: string;
  readonly studentLastName: string;
  readonly formationId: number;
  readonly formationName: string;
  readonly groupeId: number;
  readonly groupeName: string;
  readonly academicYearId: number;
  readonly academicYearName: string;
}

export interface AdminStudentInscriptionRequest {
  readonly studentId: number;
  readonly formationId: number;
  readonly groupeId: number;
  readonly academicYearId: number;
}

export interface AdminTeacherAssignmentDto {
  readonly id: number;
  readonly teacherId: number;
  readonly teacherEmail: string;
  readonly teacherFirstName: string;
  readonly teacherLastName: string;
  readonly academicYearId: number;
  readonly academicYearName: string;
  readonly formationId: number;
  readonly formationName: string;
  readonly groupeId: number;
  readonly groupeName: string;
  readonly moduleId: number;
  readonly moduleCode: string;
  readonly moduleName: string;
}

export interface AdminTeacherAssignmentRequest {
  readonly teacherId: number;
  readonly academicYearId: number;
  readonly formationId: number;
  readonly groupeId: number;
  readonly moduleId: number;
}
