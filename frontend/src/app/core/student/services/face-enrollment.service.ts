import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { FaceEnrollmentResponse } from '../models/face-enrollment.model';

@Injectable({ providedIn: 'root' })
export class FaceEnrollmentService {
  private readonly http = inject(HttpClient);
  private readonly enrollmentUrl = `${environment.apiBaseUrl}/face/student/enrollment`;

  enroll(image: Blob): Observable<FaceEnrollmentResponse> {
    const formData = new FormData();
    formData.append('image', image, 'face-enrollment.jpg');

    return this.http.post<FaceEnrollmentResponse>(this.enrollmentUrl, formData);
  }

  toUserMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Une erreur inattendue est survenue.';
    }

    const upstreamMessage = this.readMessage(error.error);
    if (upstreamMessage) {
      return upstreamMessage;
    }

    switch (error.status) {
      case 0:
        return "Le service d'enrôlement est inaccessible. Vérifiez votre connexion.";
      case 400:
      case 422:
        return 'La capture ne peut pas être utilisée. Reprenez une photo claire et centrée.';
      case 401:
        return 'Votre session a expiré. Reconnectez-vous pour continuer.';
      case 403:
        return "Vous n'êtes pas autorisé à effectuer cet enrôlement.";
      case 404:
        return 'Le compte étudiant associé à cette session est introuvable.';
      case 413:
        return 'La capture est trop volumineuse. Reprenez une photo.';
      case 502:
      case 503:
        return "Le service d'enrôlement est temporairement indisponible.";
      case 504:
        return "Le service d'enrôlement met trop de temps à répondre. Réessayez.";
      default:
        return "Impossible de terminer l'enrôlement facial.";
    }
  }

  private readMessage(body: unknown): string | null {
    if (typeof body === 'string' && body.trim()) {
      return body.trim();
    }
    if (!body || typeof body !== 'object') {
      return null;
    }

    const candidate = body as Record<string, unknown>;
    for (const key of ['detail', 'message', 'error']) {
      const value = candidate[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return null;
  }
}
