import '@angular/compiler';

import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { qrAttendanceErrorMessage } from './qr-attendance.service';

describe('QrAttendanceService', () => {
  it('prefers backend detail over generic forbidden role message', () => {
    const error = new HttpErrorResponse({
      status: 403,
      error: { detail: 'Student is too far from the attendance session location' },
    });

    expect(qrAttendanceErrorMessage(error)).toBe(
      'Student is too far from the attendance session location',
    );
  });

  it('uses generic forbidden message when backend gives no detail', () => {
    const error = new HttpErrorResponse({ status: 403 });

    expect(qrAttendanceErrorMessage(error)).toBe('Acces refuse pour ce role.');
  });
});
