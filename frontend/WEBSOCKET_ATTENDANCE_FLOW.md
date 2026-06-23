# Fonctionnement du WebSocket de presence

Ce document explique comment le WebSocket fonctionne dans le frontend et comment on recupere les donnees de l'etudiant qui a scanne le QR code.

## 1. Objectif du WebSocket

Le WebSocket sert a mettre a jour l'ecran du professeur en temps reel pendant une session d'appel.

Sans WebSocket, le frontend doit refaire regulierement un `GET /api/attendance/sessions/{sessionId}` pour savoir si un etudiant a scanne. Avec WebSocket, le backend envoie directement un evenement au navigateur quand une presence change.

Dans notre cas, le WebSocket est utilise sur la page :

```text
frontend/src/app/features/teacher/markattendance/qr-code-marking/qr-code-marking.ts
```

Le service WebSocket est ici :

```text
frontend/src/app/core/websocket/websocket.service.ts
```

## 2. Chemin complet d'une session

1. Le professeur lance une session depuis `start-session`.
2. Le backend cree la session et renvoie un `sessionId`.
3. Le frontend navigue vers la page QR avec ce `sessionId`.
4. La page QR charge les details complets de la session.
5. La page QR ouvre une connexion WebSocket STOMP pour cette session.
6. Quand un etudiant scanne le QR, le backend met a jour la presence.
7. Le backend envoie un evenement WebSocket au professeur.
8. Le frontend recoit l'evenement et met a jour l'affichage.

## 3. Connexion WebSocket cote frontend

Le service construit l'URL WebSocket a partir de `environment.apiBaseUrl`.

Comme `apiBaseUrl` vaut generalement :

```ts
'/api'
```

le service construit :

```text
ws://localhost:4201/api/ws/attendance/ws
```

En dev, Angular utilise `proxy.conf.json`, donc `/api/ws/attendance/ws` est proxyfie vers Traefik, puis Traefik envoie la connexion vers `attendance-service`.

En production HTTPS, le protocole devient automatiquement :

```text
wss://...
```

La methode responsable est :

```ts
private buildWebSocketUrl(): string
```

## 4. Authentification WebSocket

Le WebSocket utilise STOMP. L'authentification ne passe pas par un intercepteur HTTP Angular, car une connexion WebSocket n'est pas une requete HTTP classique apres le handshake.

Le token JWT est donc ajoute manuellement dans le header STOMP `CONNECT`.

Dans `websocket.service.ts` :

```ts
const token = this.storage.getItem(this.tokenKey);

this.stompClient.connect(
  { Authorization: `Bearer ${token}` },
  () => {
    this.connected = true;
    this.subscribeToSessionTopic(sessionId);
  },
);
```

Le backend lit ce header :

```text
Authorization: Bearer <jwt>
```

Puis il valide le token avec `auth-service`.

## 5. Topic WebSocket utilise

Une fois connecte, le frontend s'abonne au topic de la session :

```text
/topic/attendance.sessions.{sessionId}
```

Exemple :

```text
/topic/attendance.sessions.5
```

Dans le code :

```ts
this.stompClient.subscribe(
  `/topic/attendance.sessions.${sessionId}`,
  (message: Message) => {
    this.eventsSubject.next(JSON.parse(message.body));
  },
);
```

Le backend autorise uniquement :

- le professeur proprietaire de la session
- un admin

Les autres utilisateurs ne peuvent pas s'abonner au topic.

## 6. Evenement recu quand un etudiant scanne

Quand un etudiant scanne le QR, le backend envoie un evenement comme ceci :

```json
{
  "eventType": "ATTENDANCE_UPDATED",
  "sessionId": 5,
  "studentId": 12,
  "status": "PRESENT",
  "markMethod": "QR_CODE",
  "markedAt": "2026-04-28T12:01:00",
  "presentCount": 11,
  "absentCount": 0,
  "unknownCount": 31
}
```

Important : cet evenement contient surtout l'identifiant de l'etudiant (`studentId`) et les nouveaux compteurs. Il ne contient pas forcement le nom, le prenom ou le numero Apogee.

## 7. Comment on extrait les donnees de l'etudiant scanne

La page QR a deja charge la session complete avec :

```ts
this.attendanceService.getSession(sessionId)
```

Cette session contient une liste :

```ts
session.students
```

Chaque etudiant dans cette liste contient les donnees detaillees :

```ts
studentId
firstName
lastName
numApogee
status
markMethod
markedAt
```

Quand le WebSocket recoit un evenement `ATTENDANCE_UPDATED`, il appelle :

```ts
this.handleAttendanceUpdate(notification);
```

Dans cette methode, on cherche l'etudiant correspondant dans la session deja chargee :

```ts
const student =
  this.session()?.students?.find((item) => item.studentId === notification.studentId) ?? null;
```

Donc le WebSocket donne seulement :

```ts
notification.studentId
```

Et le frontend utilise ce `studentId` pour retrouver l'objet complet de l'etudiant dans :

```ts
this.session()?.students
```

## 8. Construction de la ligne "Etudiants scannes"

Si l'evenement dit que l'etudiant est present par QR code ou reconnaissance faciale :

```ts
notification.status === 'PRESENT'
notification.markMethod === 'QR_CODE' || notification.markMethod === 'FACE_ID'
```

alors le frontend construit un objet `ScannedStudent` :

```ts
const name = `${student.firstName} ${student.lastName}`.trim();

const newScannedStudent = {
  id: notification.studentId,
  name,
  studentId: student.numApogee,
  initials: this.getInitials(name),
  scannedAt: new Date(notification.markedAt).toLocaleTimeString(...)
};
```

Puis il l'ajoute en haut de la liste :

```ts
this.scannedStudents.update((students) => [
  newScannedStudent,
  ...students.filter((item) => item.id !== notification.studentId),
]);
```

Le `filter` evite d'avoir deux lignes pour le meme etudiant.

## 9. Mise a jour des listes et compteurs

Apres reception de l'evenement, le frontend met aussi a jour :

- la liste de marquage manuel
- la session locale
- les compteurs `presentCount`, `absentCount`, `unknownCount`

Exemple :

```ts
this.session.update((current) =>
  current
    ? {
        ...current,
        presentCount: notification.presentCount,
        absentCount: notification.absentCount,
        unknownCount: notification.unknownCount,
        students: current.students?.map((student) =>
          student.studentId === notification.studentId
            ? {
                ...student,
                status: notification.status,
                markMethod: notification.markMethod,
                markedAt: notification.markedAt,
              }
            : student,
        ),
      }
    : current,
);
```

Donc l'ecran professeur est mis a jour sans recharger toute la page.

## 10. Fallback polling

Le code garde aussi un polling de securite.

Si le WebSocket ne marche pas, la page continue de faire des appels HTTP reguliers :

```ts
this.refreshSession();
```

Si le WebSocket marche, le polling devient moins frequent :

```ts
const interval = this.webSocketConnected() ? 15000 : 5000;
```

Cela permet de garder l'ecran coherent meme si la connexion WebSocket tombe.

## 11. Resume rapide

Le backend envoie seulement l'evenement de changement de presence avec `studentId`.

Le frontend recupere les informations completes de l'etudiant comme ceci :

1. Charger la session complete avec `getSession(sessionId)`.
2. Stocker la session dans `this.session`.
3. Recevoir l'evenement WebSocket.
4. Lire `notification.studentId`.
5. Chercher l'etudiant dans `this.session()?.students`.
6. Construire l'affichage avec `firstName`, `lastName`, `numApogee` et `markedAt`.

En bref :

```text
WebSocket event -> studentId -> recherche dans session.students -> affichage et mise a jour
```
