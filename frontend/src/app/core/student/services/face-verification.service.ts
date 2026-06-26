import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { FaceVerificationResponse } from '../models/face-verification.model';

@Injectable({ providedIn: 'root' })
export class FaceVerificationService {
  private readonly http = inject(HttpClient);
  private readonly verificationUrl = `${environment.apiBaseUrl}/face/student/verify`;

  verify(image: Blob): Observable<FaceVerificationResponse> {
    const formData = new FormData();
    formData.append('image', image, 'face-verification.jpg');
    return this.http.post<FaceVerificationResponse>(this.verificationUrl, formData);
  }

  toUserMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Une erreur inattendue est survenue.';
    }

    const detail = this.readDetail(error.error);
    if (detail) {
      return detail;
    }

    switch (error.status) {
      case 400:
      case 422:
        return 'Image invalide. Reprenez la capture puis réessayez.';
      case 404:
        return 'Aucun visage enregistré. Mettez à jour votre profil avant de réessayer.';
      case 409:
        return 'Votre profil facial doit être enregistré à nouveau.';
      case 413:
        return 'Image trop volumineuse. Reprenez une capture plus légère.';
      case 503:
      case 504:
        return 'La vérification faciale est temporairement indisponible.';
      default:
        return 'Impossible de vérifier votre identité.';
    }
  }

  private readDetail(body: unknown): string | null {
    if (typeof body === 'string' && body.trim()) {
      return body.trim();
    }
    if (body && typeof body === 'object') {
      const detail = (body as Record<string, unknown>)['detail'];
      if (typeof detail === 'string' && detail.trim()) {
        return detail.trim();
      }
    }
    return null;
  }
}
