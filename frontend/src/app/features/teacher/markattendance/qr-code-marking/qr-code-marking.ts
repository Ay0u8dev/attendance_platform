import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, signal } from '@angular/core';

interface ScannedStudent {
  id: string;
  name: string;
  studentId: string;
  initials: string;
  scannedAt: string;
}

@Component({
  selector: 'app-qr-code-marking',
  templateUrl: './qr-code-marking.html',
  styleUrl: './qr-code-marking.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrCodeMarking implements OnInit, OnDestroy {
  readonly sessionInfo = {
    module: 'Algorithmique et Programmation',
    group: 'Groupe GI A',
    time: '08:30 - 10:30',
    location: 'AmphithéPtre A',
    date: 'Lundi 22 Mai, 2024',
  };

  readonly totalStudents = 45;
  readonly countdownSeconds = signal(323); // 5:23
  readonly maxSeconds = 600; // 10 minutes

  readonly scannedStudents = signal<ScannedStudent[]>([
    { id: '1', name: 'Ahmed Benali', studentId: '645', initials: 'AB', scannedAt: ':12' },
    { id: '2', name: 'Sara Mansouri', studentId: '645-12', initials: 'SM', scannedAt: ':55' },
    { id: '3', name: 'Karim Tazi', studentId: '645-89', initials: 'KT', scannedAt: ':30' },
  ]);

  private timer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.timer = setInterval(() => {
      this.countdownSeconds.update((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  get formattedCountdown(): string {
    const s = this.countdownSeconds();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  get progressPercent(): number {
    return (this.countdownSeconds() / this.maxSeconds) * 100;
  }

  regenerateQr(): void {
    this.countdownSeconds.set(600);
  }

  extendTime(): void {
    this.countdownSeconds.update((s) => s + 300);
  }

  endSession(): void {
    // Navigate away
  }
}
