# Attendance Platform CI/CD Guide

The new CI/CD is main-only and contains two connected workflows:

```text
Pull request to main -> tests + coverage + SonarCloud
Push to main         -> validation -> 7 images -> Trivy -> infra PR -> Slack
```

The restored legacy `backend-ci.yml` remains unchanged from `dev` and therefore
keeps its original `dev` and `main` triggers. `frontend-ci.yml` is also preserved
exactly, but all its lines are currently commented out.

## 1. Pull request validation

`pr-ci.yml` runs for pull requests targeting `main`. `release.yml` also calls it
as a reusable workflow before creating images.

Validation performs:

1. A required SonarCloud configuration check.
2. Compilation, tests, JaCoCo coverage, and analysis for five Java services.
3. Angular tests, production build, and frontend analysis.
4. Face-service tests, Python coverage, and analysis.
5. QR compilation/import validation and analysis.

The Java matrix applies one job definition to five services. Each component has
its own SonarCloud project. Scanner or configuration failures stop validation;
`sonar.qualitygate.wait=false` keeps a red Quality Gate informational.

## 2. Main release and GitOps handoff

`release.yml` runs only after a push to `main`. Releases are serialized and use
an immutable `0.0.N` tag plus `sha-<commit>`; `latest` is never published.

Seven image definitions run in parallel. Each image is pushed to GHCR and
scanned by its immutable digest (`image@sha256:...`). Trivy JSON provides
vulnerability counts and SARIF feeds GitHub Security. HIGH/CRITICAL findings are
warnings, while a scanner execution failure stops the infrastructure handoff.

After all images and scans succeed, the workflow temporarily checks out
`Ay0u8dev/attendance-infra`, changes exactly seven existing image tags, validates
the AKS manifests, and opens or updates a pull request. GitHub Actions never
receives AKS credentials or runs `kubectl apply`; Argo CD deploys after review.

## Credentials and variables

| Name | Type | Purpose |
| --- | --- | --- |
| `SONAR_TOKEN` | Secret | Authenticates all eight SonarCloud analyses. |
| `SONAR_HOST_URL` | Variable | SonarCloud endpoint: `https://sonarcloud.io`. |
| `SONAR_ORGANIZATION` | Variable | SonarCloud organization: `ay0u8dev`. |
| `SLACK_WEBHOOK_URL` | Secret | Sends the final release summary. |
| `INFRA_REPO_TOKEN` | Secret | Opens/updates the infra pull request. |
| `GITHUB_TOKEN` | Automatic token | Publishes GHCR images with `packages: write`. |

Do not add a personal `GHCR_TOKEN` to these workflows. It is needed only for
manual Docker operations outside Actions:

```powershell
$env:GHCR_TOKEN | docker login ghcr.io -u Ay0u8dev --password-stdin
docker pull ghcr.io/ay0u8dev/attendance-platform-frontend:0.0.1
```

If an existing package was created manually, its owner may need to grant
`Ay0u8dev/attendance_platform` **Write** permission under **Manage Actions
access** in the package settings.

## Required SonarCloud projects

- `attendance-platform-auth-service`
- `attendance-platform-user-service`
- `attendance-platform-attendance-service`
- `attendance-platform-justification-service`
- `attendance-platform-notification-service`
- `attendance-platform-frontend`
- `attendance-platform-face-service`
- `attendance-platform-qr-service`

For every project, disable **Administration -> Analysis Method -> Automatic
Analysis**. The token owner needs **Execute Analysis** permission. Do not make
the SonarCloud Quality Gate a required GitHub check while it is warning-only.

## Verification after merge to main

1. Open a pull request targeting `main` and confirm all validation jobs pass.
2. Merge only after review; the resulting push starts `Main Release`.
3. Confirm eight SonarCloud projects received the source commit.
4. Confirm seven `0.0.N` images and Trivy reports exist.
5. Confirm Slack receives one summary and the infra change is only a pull request.

Common failures:

- `Not authorized`: the Sonar token is invalid or lacks analysis permission.
- `Project not found`: a project key does not match SonarCloud.
- `Automatic Analysis is enabled`: disable it for that SonarCloud project.
- GHCR `permission_denied`: grant the repository package write access.
- Fork pull request: GitHub does not expose repository secrets to untrusted forks,
  so mandatory SonarCloud configuration intentionally fails.

References: [SonarCloud GitHub Actions](https://docs.sonarsource.com/sonarqube-cloud/advanced-setup/ci-based-analysis/github-actions-for-sonarcloud),
[SonarCloud automatic analysis](https://docs.sonarsource.com/sonarqube-cloud/advanced-setup/automatic-analysis), and
[GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).
