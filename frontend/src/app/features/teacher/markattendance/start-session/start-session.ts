import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Router } from '@angular/router';

export type AttendanceMethod = 'manual' | 'qr-code' | 'facial';

@Component({
  selector: 'app-start-session',
  templateUrl: './start-session.html',
  styleUrl: './start-session.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartSession {
  readonly groups = ['GI 2 A', 'GI 2 B', 'IRSI 2 A', 'IRSI 2 B'];
  readonly module = 'Algorithmique';
  readonly timeSlot = '08:30 - 10:30';
  readonly location = 'Amphi A';

  readonly methods: { id: AttendanceMethod; label: string; description: string; icon: string }[] = [
    {
      id: 'manual',
      label: 'Manuel',
      description: 'Marquer chaque étudiant manuellement sur la liste.',
      icon: 'fa-solid fa-hand-pointer',
    },
    {
      id: 'qr-code',
      label: 'Qr Code',
      description: 'Générez un code que les étudiants scannent avec leur mobile.',
      icon: 'fa-solid fa-qrcode',
    },
    {
      id: 'facial',
      label: 'Reconnaissance Faciale',
      description: 'Identification automatique via la caméra de la salle ou mobile.',
      icon: 'fa-solid fa-face-smile',
    },
  ];

  readonly selectedMethod = signal<AttendanceMethod | null>(null);
  readonly showConfirmModal = signal(false);

  constructor(private readonly router: Router) {}

  selectMethod(method: AttendanceMethod): void {
    this.selectedMethod.set(method);
  }

  openConfirmModal(): void {
    if (!this.selectedMethod()) return;
    this.showConfirmModal.set(true);
  }

  cancelModal(): void {
    this.showConfirmModal.set(false);
  }

  confirmAndStart(): void {
    const method = this.selectedMethod();
    this.showConfirmModal.set(false);
    switch (method) {
      case 'manual':
        this.router.navigate(['/sessions/mark/manual']);
        break;
      case 'qr-code':
        this.router.navigate(['/sessions/mark/qr-code']);
        break;
      case 'facial':
        this.router.navigate(['/sessions/mark/facial']);
        break;
    }
  }

  methodLabel(): string {
    return this.methods.find((m) => m.id === this.selectedMethod())?.label ?? '';
  }
}
