import { Injectable, signal } from '@angular/core';

export type DirectoryStatus = 'Active' | 'Pending' | 'Suspended';
export type StatusVariant = 'success' | 'warning' | 'error';

export interface StudentRecord {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly codeApogee: string;
  readonly status: DirectoryStatus;
  readonly cycle: string;
  readonly year: string;
  readonly group: string;
}

export interface TeacherRecord {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly status: DirectoryStatus;
  readonly modules: readonly string[];
  readonly groups: readonly string[];
}

export interface StudentIdentityPayload {
  readonly name: string;
  readonly email: string;
  readonly codeApogee: string;
  readonly status: DirectoryStatus;
}

export interface TeacherIdentityPayload {
  readonly name: string;
  readonly email: string;
  readonly status: DirectoryStatus;
}

export interface StudentInscriptionPayload {
  readonly cycle: string;
  readonly year: string;
  readonly group: string;
}

export interface TeacherAssignmentPayload {
  readonly modules: readonly string[];
  readonly groups: readonly string[];
}

@Injectable({ providedIn: 'root' })
export class AdminDirectoryStore {
  readonly students = signal<StudentRecord[]>(this.buildSampleStudents());
  readonly teachers = signal<TeacherRecord[]>(this.buildSampleTeachers());

  readonly statuses: readonly DirectoryStatus[] = ['Active', 'Pending', 'Suspended'];
  readonly cycles = ['Cycle Ingenieur', 'Master', 'Licence'];
  readonly years = ['1ere annee CI', '2eme annee CI', '3eme annee CI', 'Master 1', 'Master 2'];
  readonly groups = ['GI-1A-A', 'GI-1A-B', 'GI-2A-A', 'GI-3A-A', 'M1-SI'];
  readonly moduleOptions = [
    'Advanced Algorithms',
    'Data Structures',
    'Web Architecture',
    'Cloud Platforms',
    'Linear Algebra',
    'Statistics',
    'Quantum Mechanics',
    'Embedded Systems',
    'Economic Policy',
  ];

  addStudent(payload: StudentIdentityPayload): void {
    this.students.update((students) => [
      ...students,
      {
        ...payload,
        id: this.nextId(
          'STD',
          students.map((student) => student.id),
        ),
        cycle: '',
        year: '',
        group: '',
      },
    ]);
  }

  updateStudent(id: string, payload: StudentIdentityPayload): void {
    this.students.update((students) =>
      students.map((student) => (student.id === id ? { ...student, ...payload } : student)),
    );
  }

  deleteStudent(id: string): void {
    this.students.update((students) => students.filter((student) => student.id !== id));
  }

  updateStudentInscription(id: string, payload: StudentInscriptionPayload): void {
    this.students.update((students) =>
      students.map((student) => (student.id === id ? { ...student, ...payload } : student)),
    );
  }

  clearStudentInscription(id: string): void {
    this.updateStudentInscription(id, { cycle: '', year: '', group: '' });
  }

  addTeacher(payload: TeacherIdentityPayload): void {
    this.teachers.update((teachers) => [
      ...teachers,
      {
        ...payload,
        id: this.nextId(
          'TCH',
          teachers.map((teacher) => teacher.id),
        ),
        modules: [],
        groups: [],
      },
    ]);
  }

  updateTeacher(id: string, payload: TeacherIdentityPayload): void {
    this.teachers.update((teachers) =>
      teachers.map((teacher) => (teacher.id === id ? { ...teacher, ...payload } : teacher)),
    );
  }

  deleteTeacher(id: string): void {
    this.teachers.update((teachers) => teachers.filter((teacher) => teacher.id !== id));
  }

  updateTeacherAssignment(id: string, payload: TeacherAssignmentPayload): void {
    this.teachers.update((teachers) =>
      teachers.map((teacher) => (teacher.id === id ? { ...teacher, ...payload } : teacher)),
    );
  }

  clearTeacherAssignment(id: string): void {
    this.updateTeacherAssignment(id, { modules: [], groups: [] });
  }

  statusVariant(status: DirectoryStatus): StatusVariant {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Pending':
        return 'warning';
      case 'Suspended':
        return 'error';
    }
  }

  initials(name: string): string {
    return name
      .split(' ')
      .filter((part) => !['dr.', 'prof.'].includes(part.toLowerCase()))
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  private nextId(prefix: 'STD' | 'TCH', existingIds: readonly string[]): string {
    const maximumNumericId = existingIds.reduce((maximum, id) => {
      const value = Number(id.replace(`${prefix}-`, ''));
      return Number.isFinite(value) ? Math.max(maximum, value) : maximum;
    }, 999);

    return `${prefix}-${maximumNumericId + 1}`;
  }

  private buildSampleStudents(): StudentRecord[] {
    return [
      {
        id: 'STD-1000',
        name: 'Alex Johnson',
        email: 'alex.j@university.edu',
        codeApogee: 'A10001',
        status: 'Active',
        cycle: 'Cycle Ingenieur',
        year: '1ere annee CI',
        group: 'GI-1A-A',
      },
      {
        id: 'STD-1001',
        name: 'Maria Garcia',
        email: 'm.garcia@university.edu',
        codeApogee: 'A10002',
        status: 'Pending',
        cycle: 'Cycle Ingenieur',
        year: '2eme annee CI',
        group: 'GI-2A-A',
      },
      {
        id: 'STD-1002',
        name: 'Liam Wilson',
        email: 'l.wilson@university.edu',
        codeApogee: 'A10003',
        status: 'Suspended',
        cycle: '',
        year: '',
        group: '',
      },
      {
        id: 'STD-1003',
        name: 'Sarah Chen',
        email: 's.chen@university.edu',
        codeApogee: 'A10004',
        status: 'Active',
        cycle: 'Master',
        year: 'Master 1',
        group: 'M1-SI',
      },
    ];
  }

  private buildSampleTeachers(): TeacherRecord[] {
    return [
      {
        id: 'TCH-1000',
        name: 'Dr. Robert Chen',
        email: 'r.chen@university.edu',
        status: 'Active',
        modules: ['Advanced Algorithms', 'Data Structures'],
        groups: ['GI-1A-A'],
      },
      {
        id: 'TCH-1001',
        name: 'Sarah Jenkins',
        email: 's.jenkins@university.edu',
        status: 'Pending',
        modules: ['Economic Policy'],
        groups: ['GI-2A-A'],
      },
      {
        id: 'TCH-1002',
        name: 'Prof. Marcus Thorne',
        email: 'm.thorne@university.edu',
        status: 'Active',
        modules: ['Quantum Mechanics'],
        groups: ['GI-3A-A'],
      },
      {
        id: 'TCH-1003',
        name: 'Dr. Nadia El Amrani',
        email: 'n.elamrani@university.edu',
        status: 'Active',
        modules: [],
        groups: [],
      },
    ];
  }
}
