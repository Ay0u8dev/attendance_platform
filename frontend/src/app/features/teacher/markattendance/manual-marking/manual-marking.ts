import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

export type AttendanceStatus = 'present' | 'absent' | null;

export interface Student {
  id: string;
  name: string;
  apogee: string;
  avatarInitials: string;
  status: AttendanceStatus;
  hasNote: boolean;
}

@Component({
  selector: 'app-manual-marking',
  imports: [FormsModule],
  templateUrl: './manual-marking.html',
  styleUrl: './manual-marking.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManualMarking {
  readonly sessionInfo = {
    module: 'Algorithmique et Programmation',
    group: 'Groupe GI A',
    time: '08:30 - 10:30',
    location: 'AmphithéPtre A',
    date: 'Lundi 22 Mai, 2024',
  };

  readonly searchQuery = signal('');

  readonly allStudents = signal<Student[]>([
    {
      id: '1',
      name: 'Marc-André Lefebvre',
      apogee: '2023-GI-0045',
      avatarInitials: 'ML',
      status: 'present',
      hasNote: false,
    },
    {
      id: '2',
      name: 'Sophie Valcourt',
      apogee: '2023-GI-0012',
      avatarInitials: 'SV',
      status: 'absent',
      hasNote: true,
    },
    {
      id: '3',
      name: 'Thomas Bernard',
      apogee: '2023-GI-0089',
      avatarInitials: 'TB',
      status: null,
      hasNote: false,
    },
    {
      id: '4',
      name: 'Julien Moreau',
      apogee: '2023-GI-0033',
      avatarInitials: 'JM',
      status: 'present',
      hasNote: false,
    },
    {
      id: '5',
      name: 'Léa Dubois',
      apogee: '2023-GI-0105',
      avatarInitials: 'LD',
      status: 'present',
      hasNote: false,
    },
  ]);

  readonly filteredStudents = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.allStudents();
    return this.allStudents().filter(
      (s) => s.name.toLowerCase().includes(q) || s.apogee.toLowerCase().includes(q),
    );
  });

  readonly presentCount = computed(
    () => this.allStudents().filter((s) => s.status === 'present').length,
  );
  readonly absentCount = computed(
    () => this.allStudents().filter((s) => s.status === 'absent').length,
  );
  readonly unmarkedCount = computed(
    () => this.allStudents().filter((s) => s.status === null).length,
  );

  readonly currentPage = signal(1);
  readonly pageSize = 5;
  readonly totalPages = computed(() => Math.ceil(this.allStudents().length / this.pageSize));

  markAll(): void {
    this.allStudents.update((students) =>
      students.map((s) => ({ ...s, status: 'present' as AttendanceStatus })),
    );
  }

  setStatus(studentId: string, status: AttendanceStatus): void {
    this.allStudents.update((students) =>
      students.map((s) => (s.id === studentId ? { ...s, status } : s)),
    );
  }

  endSession(): void {
    // Navigate away or show confirmation
  }
}
