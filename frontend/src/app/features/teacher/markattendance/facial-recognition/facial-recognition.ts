import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

export type AttendanceStatus = 'present' | 'absent' | null;

export interface RecognizedStudent {
  id: string;
  name: string;
  apogee: string;
  avatarInitials: string;
  avatarBg: string;
  avatarColor: string;
  status: AttendanceStatus;
}

export interface DetectionBox {
  id: string;
  name: string;
  /** percent offsets inside the video feed */
  x: number;
  y: number;
  w: number;
  h: number;
  confirmed: boolean;
}

@Component({
  selector: 'app-facial-recognition',
  imports: [FormsModule],
  templateUrl: './facial-recognition.html',
  styleUrl: './facial-recognition.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacialRecognition {
  // ── Session info ──────────────────────────────────────────────
  readonly sessionInfo = {
    module: 'Algorithmique et Programmation',
    group: 'Groupe GI A',
    time: '08:30 - 10:30',
    location: 'AmphithéPtre A',
    date: 'Lundi 22 Mai, 2024',
  };

  readonly confidenceThreshold = 85;
  readonly uptime = '01:14:22';
  readonly totalStudents = 45;

  // ── Detection boxes on the video feed ────────────────────────
  readonly activeDetections = signal<DetectionBox[]>([
    {
      id: 'd1',
      name: 'IDENTITÉ: M. DUPONT',
      x: 35,
      y: 18,
      w: 26,
      h: 46,
      confirmed: true,
    },
  ]);

  // ── Auto-identified students ──────────────────────────────────
  private readonly _autoIdentified = signal<RecognizedStudent[]>([
    {
      id: '1',
      name: 'Ahmed Benali',
      apogee: 'Et-2023-045',
      avatarInitials: 'AB',
      avatarBg: '#dbeafe',
      avatarColor: '#2563eb',
      status: 'present',
    },
    {
      id: '2',
      name: 'Sara Mansouri',
      apogee: 'Et-2023-012',
      avatarInitials: 'SM',
      avatarBg: '#fce7f3',
      avatarColor: '#db2777',
      status: 'present',
    },
    {
      id: '3',
      name: 'Karim Tazi',
      apogee: 'Et-2023-088',
      avatarInitials: 'KT',
      avatarBg: '#dcfce7',
      avatarColor: '#16a34a',
      status: 'present',
    },
  ]);

  readonly autoIdentified = this._autoIdentified.asReadonly();
  readonly autoIdentifiedCount = computed(() => this._autoIdentified().length);

  // ── All students pool (auto + not-yet-identified) ─────────────
  private readonly _allStudents = signal<RecognizedStudent[]>([
    ...this._autoIdentified(),
    {
      id: '4',
      name: 'Nadia El Fassi',
      apogee: 'Et-2023-031',
      avatarInitials: 'NE',
      avatarBg: '#fef9c3',
      avatarColor: '#ca8a04',
      status: null,
    },
    {
      id: '5',
      name: 'Youssef Amrani',
      apogee: 'Et-2023-062',
      avatarInitials: 'YA',
      avatarBg: '#ede9fe',
      avatarColor: '#7c3aed',
      status: null,
    },
    {
      id: '6',
      name: 'Fatima Zahra Idrissi',
      apogee: 'Et-2023-019',
      avatarInitials: 'FZ',
      avatarBg: '#ffedd5',
      avatarColor: '#ea580c',
      status: null,
    },
  ]);

  // ── Manual search ─────────────────────────────────────────────
  manualSearchQuery = '';

  readonly manualSearchResults = computed(() => {
    const q = this.manualSearchQuery.toLowerCase().trim();
    if (!q) return [];
    return this._allStudents().filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.apogee.toLowerCase().includes(q)
    );
  });

  // ── Actions ───────────────────────────────────────────────────
  markPresent(studentId: string): void {
    this._allStudents.update((students) =>
      students.map((s) =>
        s.id === studentId ? { ...s, status: 'present' as AttendanceStatus } : s
      )
    );
  }

  markSelectedPresent(): void {
    const results = this.manualSearchResults();
    if (results.length === 0) return;
    const ids = new Set(results.map((s) => s.id));
    this._allStudents.update((students) =>
      students.map((s) =>
        ids.has(s.id) ? { ...s, status: 'present' as AttendanceStatus } : s
      )
    );
  }

  seeAllStudents(): void {
    // Navigate to full student list or expand the panel
    console.log('Navigate to full students list');
  }

  endSession(): void {
    // Navigate away or show confirmation dialog
    console.log('End session');
  }
}
