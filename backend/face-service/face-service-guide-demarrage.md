# Guide de demarrage du face-service

Ce document explique comment demarrer correctement le service de reconnaissance faciale du projet `attendance_platform`, comment verifier qu'il fonctionne, et comment l'utiliser avec les autres services.

Chemin du service:

```powershell
D:\PFA\Code Source\attendance_platform\backend\face-service
```

## 1. Role du service

Le `face-service` est une API FastAPI responsable de trois operations:

- Enroler le visage d'un etudiant.
- Verifier que l'image envoyee correspond au visage enrole.
- Marquer la presence par reconnaissance faciale.

Il utilise OpenCV avec deux modeles ONNX:

- `models/face_detection_yunet_2023mar.onnx`
- `models/face_recognition_sface_2021dec.onnx`

Le service ne doit normalement pas etre appele directement par le navigateur. En developpement, le frontend passe par Traefik:

```text
Frontend -> http://localhost/api/face/... -> Traefik -> face-service:8002
```

Traefik valide le JWT avec `auth-service`, supprime les faux headers envoyes par le client, puis injecte les headers internes necessaires.

## 2. Services necessaires avant de demarrer

Avant de lancer `face-service`, verifier que les services suivants sont disponibles:

- `auth-service` sur `http://localhost:8081`
- `user-service` sur `http://localhost:8082`
- `attendance-service` sur `http://localhost:8083`
- Traefik sur `http://localhost`

Pour les bases et Traefik:

```powershell
cd "D:\PFA\Code Source\attendance_platform"
docker compose up -d traefik redis user-db attendance-db
```

Puis demarrer les services Java necessaires dans des terminaux separes:

```powershell
cd "D:\PFA\Code Source\attendance_platform\backend\user-service"
.\mvnw.cmd spring-boot:run
```

```powershell
cd "D:\PFA\Code Source\attendance_platform\backend\attendance-service"
.\mvnw.cmd spring-boot:run
```

Lancer aussi `auth-service` selon sa procedure habituelle, car Traefik utilise `/auth/validate` pour proteger les routes `/api/face`.

## 3. Configuration `.env`

Le `face-service` lit son fichier:

```text
backend/face-service/.env
```

Traefik lit le fichier racine:

```text
.env
```

Les tokens doivent etre coherents entre les services.

Exemple pour `backend/face-service/.env`:

```env
ATTENDANCE_SERVICE_URL=http://localhost:8083
USER_SERVICE_URL=http://localhost:8082

FACE_SERVICE_INTERNAL_TOKEN=replace-with-a-long-random-secret
FACE_ATTENDANCE_INTERNAL_TOKEN=replace-with-a-long-random-secret
FACE_VALIDATION_STUB_ENABLED=false

MAX_IMAGE_SIZE_BYTES=2000000
FACE_MATCH_COSINE_THRESHOLD=0.363
FACE_BLUR_LAPLACIAN_THRESHOLD=15.0

FACE_DETECTION_MODEL_PATH=models/face_detection_yunet_2023mar.onnx
FACE_RECOGNITION_MODEL_PATH=models/face_recognition_sface_2021dec.onnx

HTTP_CONNECT_TIMEOUT_SECONDS=3
HTTP_READ_TIMEOUT_SECONDS=10
```

Important:

- `FACE_SERVICE_INTERNAL_TOKEN` doit etre le meme dans `backend/face-service/.env` et dans le `.env` racine, car Traefik l'injecte dans `X-Internal-Service-Token`.
- `FACE_ATTENDANCE_INTERNAL_TOKEN` doit etre le meme cote `face-service` et cote `attendance-service`.
- Ne jamais mettre de vrais secrets dans Git.

## 4. Installation locale

Version Python recommandee: Python 3.11 ou 3.12.

Depuis le dossier du service:

```powershell
cd "D:\PFA\Code Source\attendance_platform\backend\face-service"
```

Creer l'environnement virtuel si necessaire:

```powershell
py -3.11 -m venv venv
```

Activer l'environnement:

```powershell
.\venv\Scripts\activate
```

Installer les dependances:

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Pour les tests:

```powershell
python -m pip install -r requirements-dev.txt
```

Installer les modeles ONNX:

Le dossier `models/` est garde dans Git, mais les fichiers lourds `.onnx` sont ignores par `.gitignore`

Depuis `backend/face-service`, creer le dossier puis telecharger les deux modeles depuis OpenCV Zoo:

```powershell
New-Item -ItemType Directory -Force .\models

Invoke-WebRequest `
  -Uri "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx" `
  -OutFile ".\models\face_detection_yunet_2023mar.onnx"

Invoke-WebRequest `
  -Uri "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx" `
  -OutFile ".\models\face_recognition_sface_2021dec.onnx"
```

Verifier ensuite que les modeles existent:

```powershell
Get-ChildItem .\models
```

Il faut voir:

```text
face_detection_yunet_2023mar.onnx
face_recognition_sface_2021dec.onnx
```

Tailles attendues approximatives:

- `face_detection_yunet_2023mar.onnx`: environ 227 KB.
- `face_recognition_sface_2021dec.onnx`: environ 37 MB.

Si le telechargement echoue avec `Invoke-WebRequest`, ouvrir les liens dans un navigateur, cliquer sur `Download raw file`, puis placer les fichiers manuellement dans:

```text
D:\PFA\Code Source\attendance_platform\backend\face-service\models
```

## 5. Demarrage local

Commande recommandee en developpement:

```powershell
cd "D:\PFA\Code Source\attendance_platform\backend\face-service"
.\venv\Scripts\activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload
```

Pourquoi le port `8002`?

Dans `traefik/routes.dev.yml`, Traefik envoie les requetes du service face vers:

```text
http://host.docker.internal:8002
```

Donc, en local, il faut utiliser le port `8002` pour que le frontend via Traefik fonctionne directement.

Verifier le demarrage direct:

```powershell
Invoke-WebRequest http://localhost:8002/face/health
```

Reponse attendue:

```json
{ "status": "UP" }
```

Attention: via Traefik, `/api/face/...` est protege par auth. Le health check direct `http://localhost:8002/face/health` est plus simple pour tester que le processus FastAPI est bien lance.

## 6. Endpoints disponibles

### Health check

```http
GET /face/health
```

Utilisation directe:

```powershell
Invoke-WebRequest http://localhost:8002/face/health
```

### Enrolement du visage

```http
POST /face/student/enrollment
Content-Type: multipart/form-data
```

Champ fichier:

```text
image
```

Via Traefik depuis le frontend:

```text
POST http://localhost/api/face/student/enrollment
```

Le service:

1. Verifie les headers authentifies.
2. Verifie le token interne injecte par Traefik.
3. Detecte un seul visage dans l'image.
4. Controle la qualite de l'image.
5. Genere l'embedding facial.
6. Enregistre le profil facial dans `user-service`.

Reponse typique:

```json
{
  "studentId": 12,
  "enrolled": true,
  "firstLogin": false,
  "faceEnrolledAt": "2026-06-21T10:00:00Z",
  "authenticationRefreshRequired": true
}
```

### Verification simple du visage

```http
POST /face/student/verify
Content-Type: multipart/form-data
```

Champ fichier:

```text
image
```

Via Traefik:

```text
POST http://localhost/api/face/student/verify
```

Le service charge le profil facial depuis `user-service`, compare l'image envoyee avec l'embedding stocke, puis retourne:

```json
{
  "verified": true,
  "score": 0.74
}
```

### Pointage par visage

```http
POST /face/student/attendance
Content-Type: multipart/form-data
```

Champs:

```text
sessionId
deviceId
gpsLat   optionnel
gpsLon   optionnel
image
```

Via Traefik:

```text
POST http://localhost/api/face/student/attendance
```

Le service:

1. Charge le profil facial de l'etudiant depuis `user-service`.
2. Compare l'image envoyee avec le profil stocke.
3. Si le visage correspond, appelle `attendance-service`.
4. `attendance-service` marque l'etudiant present avec la methode `FACE_ID`.

Reponse typique:

```json
{
  "sessionId": 5,
  "studentId": 12,
  "status": "PRESENT",
  "markMethod": "FACE_ID",
  "markedAt": "2026-06-24T10:15:00",
  "presentCount": 1,
  "absentCount": 0,
  "unknownCount": 20
}
```

## 7. Test manuel direct sans Traefik

Normalement, il faut utiliser Traefik. Pour tester directement `face-service`, il faut fournir les headers internes manuellement.

Exemple PowerShell pour l'enrolement:

```powershell
$headers = @{
  "X-Internal-Service-Token" = "replace-with-a-long-random-secret"
  "X-User-Id" = "12"
  "X-User-Roles" = "STUDENT"
  "X-User-Email" = "student@ump.ac.ma"
}

$form = @{
  image = Get-Item "C:\path\to\face.jpg"
}

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8002/face/student/enrollment" `
  -Headers $headers `
  -Form $form
```

Le token doit correspondre a `FACE_SERVICE_INTERNAL_TOKEN`.

## 8. Tests automatiques

Depuis `backend/face-service`:

```powershell
.\venv\Scripts\activate
python -m pytest
```

Tests utiles:

```powershell
python -m pytest tests/test_face_enrollment_api.py
python -m pytest tests/test_face_verification_api.py
python -m pytest tests/test_face_verification_service.py
python -m pytest tests/test_gateway_security_config.py
```

## 9. Qualite des images acceptees

Le service refuse l'image si:

- Le fichier n'est pas une image.
- L'image est vide.
- L'image depasse `MAX_IMAGE_SIZE_BYTES`.
- Le format n'est pas JPEG ou PNG.
- L'image est trop petite.
- L'image est trop grande.
- Aucun visage n'est detecte.
- Plusieurs visages sont detectes.
- Le visage est trop petit ou trop loin.
- Le visage n'est pas centre.
- L'image est trop sombre.
- L'image est trop claire.
- L'image est floue.

Parametres importants:

```env
MAX_IMAGE_SIZE_BYTES=2000000
FACE_BLUR_LAPLACIAN_THRESHOLD=15.0
FACE_MATCH_COSINE_THRESHOLD=0.363
```

Si le service refuse trop d'images floues, diminuer legerement `FACE_BLUR_LAPLACIAN_THRESHOLD`.
Si le service accepte trop facilement de mauvais matches, augmenter `FACE_MATCH_COSINE_THRESHOLD`.

## 10. Erreurs frequentes et solutions

### `ModuleNotFoundError: No module named 'app'`

Vous n'etes probablement pas dans le bon dossier ou vous lancez le mauvais module.

Depuis `backend/face-service`, utiliser:

```powershell
python -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload
```

### `Face model file was not found`

Les fichiers ONNX sont absents ou le chemin `.env` est incorrect. C'est normal apres un clone Git si personne n'a encore telecharge les modeles, car les fichiers `models/*.onnx` sont ignores par `.gitignore`.

Verifier:

```powershell
Get-ChildItem "D:\PFA\Code Source\attendance_platform\backend\face-service\models"
```

Si le dossier est vide ou n'existe pas, telecharger les modeles:

```powershell
cd "D:\PFA\Code Source\attendance_platform\backend\face-service"
New-Item -ItemType Directory -Force .\models

Invoke-WebRequest `
  -Uri "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx" `
  -OutFile ".\models\face_detection_yunet_2023mar.onnx"

Invoke-WebRequest `
  -Uri "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx" `
  -OutFile ".\models\face_recognition_sface_2021dec.onnx"
```

Verifier aussi:

```env
FACE_DETECTION_MODEL_PATH=models/face_detection_yunet_2023mar.onnx
FACE_RECOGNITION_MODEL_PATH=models/face_recognition_sface_2021dec.onnx
```

### `Invalid internal service token`

Le token envoye par Traefik ne correspond pas au token lu par `face-service`.

Verifier:

- `.env` racine: utilise par Traefik.
- `backend/face-service/.env`: utilise par `face-service`.

La valeur de `FACE_SERVICE_INTERNAL_TOKEN` doit etre identique dans les deux.

### `User service is unavailable`

Le `face-service` ne peut pas joindre `user-service`.

Verifier:

```powershell
Invoke-WebRequest http://localhost:8082/actuator/health
```

Si cela echoue, demarrer `user-service`.

### `Attendance service is unavailable`

Le pointage facial a reussi la verification du visage, mais l'appel vers `attendance-service` a echoue.

Verifier:

```powershell
Invoke-WebRequest http://localhost:8083/actuator/health
```

### `Attendance service authentication failed`

Le token `FACE_ATTENDANCE_INTERNAL_TOKEN` ne correspond pas entre `face-service` et `attendance-service`.

Verifier:

- `backend/face-service/.env`
- `.env` racine ou configuration utilisee par `attendance-service`

### `No face detected`

L'image ne contient pas de visage detecte. Conseils:

- Mettre le visage bien visible.
- Eviter les lunettes tres sombres.
- Ameliorer la lumiere.
- Se rapprocher de la camera.

### `Multiple faces detected`

Un seul visage est autorise. Reprendre la photo seul.

### `Image is blurry`

L'image est trop floue. Conseils:

- Stabiliser la camera.
- Demander a l'etudiant de rester immobile.
- Augmenter la lumiere.

## 11. Ordre recommande pour tout demarrer

Dans des terminaux separes:

1. Infrastructure Docker:

```powershell
cd "D:\PFA\Code Source\attendance_platform"
docker compose up -d traefik redis user-db attendance-db
```

2. `auth-service`:

```powershell
cd "D:\PFA\Code Source\attendance_platform\backend\auth-service"
.\mvnw.cmd spring-boot:run
```

3. `user-service`:

```powershell
cd "D:\PFA\Code Source\attendance_platform\backend\user-service"
.\mvnw.cmd spring-boot:run
```

4. `attendance-service`:

```powershell
cd "D:\PFA\Code Source\attendance_platform\backend\attendance-service"
.\mvnw.cmd spring-boot:run
```

5. `face-service`:

```powershell
cd "D:\PFA\Code Source\attendance_platform\backend\face-service"
.\venv\Scripts\activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload
```

6. Frontend:

```powershell
cd "D:\PFA\Code Source\attendance_platform\frontend"
npm start
```

## 12. Checklist rapide

Avant de dire que le service ne marche pas, verifier:

- `face-service` repond sur `http://localhost:8002/face/health`.
- Traefik est lance sur `http://localhost`.
- `auth-service` repond sur `http://localhost:8081`.
- `user-service` repond sur `http://localhost:8082`.
- `attendance-service` repond sur `http://localhost:8083`.
- Les deux modeles ONNX existent dans `backend/face-service/models`; ils ne viennent pas avec Git car `models/*.onnx` est ignore.
- `FACE_SERVICE_INTERNAL_TOKEN` est identique dans `.env` racine et `backend/face-service/.env`.
- `FACE_ATTENDANCE_INTERNAL_TOKEN` est identique entre `face-service` et `attendance-service`.
- Le frontend appelle `http://localhost/api/face/...`, pas directement `http://localhost:8002/...`.
