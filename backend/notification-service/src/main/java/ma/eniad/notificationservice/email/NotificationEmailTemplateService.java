package ma.eniad.notificationservice.email;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import ma.eniad.notificationservice.entity.Notification;
import ma.eniad.notificationservice.entity.enums.NotificationType;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
public class NotificationEmailTemplateService {

    private static final DateTimeFormatter DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm", Locale.FRENCH);

    private final NotificationEmailProperties properties;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public NotificationEmailTemplateService(NotificationEmailProperties properties) {
        this.properties = properties;
    }

    public EmailTemplateContent build(EmailNotificationMessage message, Notification notification) {
        JsonNode metadata = metadata(notification.getMetadataJson());
        String subject = hasText(message.subject()) ? message.subject() : fallbackSubject(notification);

        if (notification.getType() == NotificationType.ABSENCE_RECORDED) {
            return absenceRecorded(subject, message, metadata);
        }

        if (isAbsenceWarning(notification.getType())) {
            return absenceWarning(subject, message, metadata);
        }

        if (notification.getType() == NotificationType.JUSTIFICATION_APPROVED
                || isApproved(metadata.path("status").asText(null))) {
            return justificationApproved(subject, message, metadata);
        }

        return justificationRejected(subject, message, metadata);
    }

    private EmailTemplateContent absenceRecorded(
            String subject,
            EmailNotificationMessage message,
            JsonNode metadata
    ) {
        String greeting = greeting(message.recipientName());
        String course = value(metadata, "courseLabel", "la séance concernée");
        String room = value(metadata, "roomLabel", null);
        String date = firstDate(metadata, "finalizedAt", "startedAt", "sessionDate");
        String teacher = value(metadata, "teacherFullName", null);

        StringBuilder plain = new StringBuilder();
        plain.append(greeting).append("\n\n");
        plain.append("Vous avez été marqué(e) absent(e) pour ").append(course);

        if (hasText(room)) {
            plain.append(" en ").append(room);
        }

        if (hasText(date)) {
            plain.append(" du ").append(date);
        }

        plain.append(".\n\n");

        if (hasText(teacher)) {
            plain.append("Enseignant : ").append(teacher).append("\n\n");
        }

        plain.append("Si cette absence est justifiée, vous pouvez déposer un justificatif depuis votre espace étudiant.\n\n");
        plain.append(automaticFooter());

        String details = detail("Module", course)
                + optionalDetail("Salle", room)
                + optionalDetail("Date", date)
                + optionalDetail("Enseignant", teacher);

        return new EmailTemplateContent(
                subject,
                plain.toString(),
                cardHtml(
                        subject,
                        greeting,
                        "warning",
                        details,
                        "Vous avez été marqué(e) absent(e). Si besoin, vous pouvez déposer un justificatif depuis votre espace étudiant."
                )
        );
    }

    private EmailTemplateContent absenceWarning(
            String subject,
            EmailNotificationMessage message,
            JsonNode metadata
    ) {
        String greeting = greeting(message.recipientName());
        String course = value(metadata, "courseLabel", "la séance concernée");
        String room = value(metadata, "roomLabel", null);
        String date = firstDate(metadata, "finalizedAt", "startedAt", "sessionDate");
        String teacher = value(metadata, "teacherFullName", null);
        String absenceCount = firstValue(metadata, "absenceCount", "absencesCount", "studentAbsenceCount");

        StringBuilder plain = new StringBuilder();
        plain.append(greeting).append("\n\n");
        plain.append("Vous avez dépassé le seuil autorisé d'absences pour ").append(course).append(".\n\n");

        if (hasText(absenceCount)) {
            plain.append("Nombre actuel d'absences dans ce module : ").append(absenceCount).append(".\n\n");
        }

        if (hasText(teacher)) {
            plain.append("Enseignant : ").append(teacher).append("\n\n");
        }

        plain.append("Veuillez consulter votre espace étudiant et déposer les justificatifs nécessaires si certaines absences sont justifiées.\n\n");
        plain.append(automaticFooter());

        String details = detail("Séance", course)
                + optionalDetail("Salle", room)
                + optionalDetail("Date", date)
                + optionalDetail("Enseignant", teacher)
                + optionalDetail("Nombre actuel d'absences", absenceCount);

        return new EmailTemplateContent(
                subject,
                plain.toString(),
                cardHtml(
                        subject,
                        greeting,
                        "warning",
                        details,
                        "Le seuil autorisé d'absences pour ce module est dépassé. Veuillez consulter votre espace étudiant et déposer les justificatifs nécessaires."
                )
        );
    }

    private EmailTemplateContent justificationApproved(
            String subject,
            EmailNotificationMessage message,
            JsonNode metadata
    ) {
        String greeting = greeting(message.recipientName());
        String module = firstValue(metadata, "module", "courseLabel");
        String reviewedBy = value(metadata, "reviewedBy", null);
        String reviewedAt = firstDate(metadata, "reviewedAt");
        String comment = firstValue(metadata, "decisionComment", "teacherComment", "comment");

        String plain = greeting + "\n\n"
                + "Votre justification a été acceptée.\n\n"
                + optionalPlainLine("Module", module)
                + optionalPlainLine("Décision", comment)
                + optionalPlainLine("Traité par", reviewedBy)
                + optionalPlainLine("Date de traitement", reviewedAt)
                + "Vous pouvez consulter les détails depuis votre espace étudiant.\n\n"
                + automaticFooter();

        String details = optionalDetail("Module", module)
                + optionalDetail("Décision", comment)
                + optionalDetail("Traité par", reviewedBy)
                + optionalDetail("Date de traitement", reviewedAt);

        return new EmailTemplateContent(
                subject,
                plain,
                cardHtml(
                        subject,
                        greeting,
                        "success",
                        details,
                        "Votre justification a été acceptée."
                )
        );
    }

    private EmailTemplateContent justificationRejected(
            String subject,
            EmailNotificationMessage message,
            JsonNode metadata
    ) {
        String greeting = greeting(message.recipientName());
        String module = firstValue(metadata, "module", "courseLabel");
        String reviewedBy = value(metadata, "reviewedBy", null);
        String reviewedAt = firstDate(metadata, "reviewedAt");
        String comment = firstValue(metadata, "decisionComment", "teacherComment", "comment");

        String plain = greeting + "\n\n"
                + "Votre justification a été refusée.\n\n"
                + optionalPlainLine("Module", module)
                + optionalPlainLine("Motif", comment)
                + optionalPlainLine("Traité par", reviewedBy)
                + optionalPlainLine("Date de traitement", reviewedAt)
                + "Vous pouvez consulter les détails depuis votre espace étudiant.\n\n"
                + automaticFooter();

        String details = optionalDetail("Module", module)
                + optionalDetail("Motif", comment)
                + optionalDetail("Traité par", reviewedBy)
                + optionalDetail("Date de traitement", reviewedAt);

        return new EmailTemplateContent(
                subject,
                plain,
                cardHtml(
                        subject,
                        greeting,
                        "danger",
                        details,
                        "Votre justification a été refusée."
                )
        );
    }

    private String cardHtml(String subject, String greeting, String accent, String details, String body) {
        String color = accentColor(accent);
        String lightColor = accentLightColor(accent);
        String badgeText = accentBadgeText(accent);
        String frontendUrl = escape(properties.frontendBaseUrl());

        String safeDetails = hasText(details)
                ? """
                  <tr>
                    <td style="padding:0 32px 24px 32px;">
                      <table role="presentation" width="100%%" cellspacing="0" cellpadding="0"
                             style="border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                        <tr>
                          <td style="padding:16px 18px;border-bottom:1px solid #e2e8f0;">
                            <p style="margin:0;font-size:13px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:.04em;">
                              Détails de la notification
                            </p>
                          </td>
                        </tr>
                        %s
                      </table>
                    </td>
                  </tr>
                  """.formatted(details)
                : "";

        return """
                <!doctype html>
                <html lang="fr">
                  <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>%s</title>
                  </head>

                  <body style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
                    <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#eef2f7;">
                      Notification de la plateforme de gestion de présence ENIAD Berkane.
                    </div>

                    <table role="presentation" width="100%%" cellspacing="0" cellpadding="0"
                           style="border-collapse:collapse;background:#eef2f7;">
                      <tr>
                        <td align="center" style="padding:32px 14px;">

                          <table role="presentation" width="100%%" cellspacing="0" cellpadding="0"
                                 style="border-collapse:collapse;max-width:640px;background:#ffffff;border:1px solid #dbe3ef;border-radius:18px;overflow:hidden;box-shadow:0 12px 30px rgba(15,23,42,0.08);">

                            <tr>
                              <td style="height:6px;background:%s;font-size:0;line-height:0;">&nbsp;</td>
                            </tr>

                            <tr>
                              <td style="padding:28px 32px 22px 32px;background:linear-gradient(135deg,#ffffff 0%%,%s 100%%);">
                                <table role="presentation" width="100%%" cellspacing="0" cellpadding="0"
                                       style="border-collapse:collapse;">
                                  <tr>
                                    <td>
                                      <p style="margin:0 0 10px 0;font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.05em;">
                                        Plateforme de gestion de l'assiduité
                                      </p>

                                      <h1 style="margin:0;font-size:23px;line-height:1.35;font-weight:800;color:#0f172a;">
                                        %s
                                      </h1>
                                    </td>

                                    <td align="right" style="vertical-align:top;">
                                      <span style="display:inline-block;padding:7px 12px;background:#ffffff;border:1px solid %s;border-radius:999px;color:%s;font-size:12px;font-weight:700;">
                                        %s
                                      </span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>

                            <tr>
                              <td style="padding:28px 32px 12px 32px;">
                                <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#0f172a;">
                                  %s
                                </p>

                                <p style="margin:0;font-size:15px;line-height:1.7;color:#334155;">
                                  %s
                                </p>
                              </td>
                            </tr>

                            %s

                            <tr>
                              <td style="padding:4px 32px 32px 32px;">
                                <a href="%s"
                                   style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:13px 18px;border-radius:10px;font-size:14px;font-weight:700;">
                                  Consulter mon espace
                                </a>
                              </td>
                            </tr>

                            <tr>
                              <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                                <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">
                                  Ceci est un message automatique. Merci de ne pas répondre directement à cet e-mail.
                                </p>
                              </td>
                            </tr>

                          </table>

                        </td>
                      </tr>
                    </table>
                  </body>
                </html>
                """.formatted(
                escape(subject),
                color,
                lightColor,
                escape(subject),
                color,
                color,
                escape(badgeText),
                escape(greeting),
                escape(body),
                safeDetails,
                frontendUrl
        );
    }

    private String detail(String label, String value) {
        return optionalDetail(label, value);
    }

    private String optionalDetail(String label, String value) {
        if (!hasText(value)) {
            return "";
        }

        return """
                <tr>
                  <td style="padding:12px 18px;border-bottom:1px solid #e2e8f0;">
                    <table role="presentation" width="100%%" cellspacing="0" cellpadding="0"
                           style="border-collapse:collapse;">
                      <tr>
                        <td style="width:38%%;font-size:13px;font-weight:700;color:#475569;vertical-align:top;">
                          %s
                        </td>
                        <td style="font-size:14px;line-height:1.5;color:#0f172a;vertical-align:top;">
                          %s
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                """.formatted(escape(label), escape(value));
    }

    private String optionalPlainLine(String label, String value) {
        if (!hasText(value)) {
            return "";
        }

        return label + " : " + value + "\n";
    }

    private String automaticFooter() {
        return "Ceci est un message automatique. Merci de ne pas répondre directement à cet e-mail.\n\n"
                + "Cordialement,\n"
                + "Plateforme de gestion de l'assiduité";
    }

    private String greeting(String recipientName) {
        return hasText(recipientName)
                ? "Bonjour " + recipientName.trim() + ","
                : "Bonjour,";
    }

    private String fallbackSubject(Notification notification) {
        if (notification.getType() == NotificationType.ABSENCE_RECORDED) {
            return "Absence enregistrée";
        }

        if (isAbsenceWarning(notification.getType())) {
            return "Avertissement d'absence";
        }

        if (notification.getType() == NotificationType.JUSTIFICATION_APPROVED) {
            return "Justification acceptée";
        }

        return "Justification refusée";
    }

    private JsonNode metadata(String metadataJson) {
        if (!hasText(metadataJson)) {
            return objectMapper.createObjectNode();
        }

        try {
            return objectMapper.readTree(metadataJson);
        } catch (Exception ignored) {
            return objectMapper.createObjectNode();
        }
    }

    private String firstValue(JsonNode node, String... fields) {
        for (String field : fields) {
            String value = value(node, field, null);

            if (hasText(value)) {
                return value;
            }
        }

        return null;
    }

    private String value(JsonNode node, String field, String fallback) {
        JsonNode value = node.path(field);

        if (value.isMissingNode() || value.isNull()) {
            return fallback;
        }

        String text = value.asText(null);
        return hasText(text) ? text.trim() : fallback;
    }

    private String firstDate(JsonNode node, String... fields) {
        String raw = firstValue(node, fields);

        if (!hasText(raw)) {
            return null;
        }

        try {
            return LocalDateTime.parse(raw).format(DATE_TIME_FORMATTER);
        } catch (Exception ignored) {
            return raw.trim();
        }
    }

    private boolean isApproved(String status) {
        if (status == null) {
            return false;
        }

        String normalized = status.trim().toUpperCase(Locale.ROOT);

        return "APPROVED".equals(normalized)
                || "ACCEPTED".equals(normalized)
                || "ACCEPTÉE".equals(normalized)
                || "ACCEPTEE".equals(normalized);
    }

    private boolean isAbsenceWarning(NotificationType type) {
        return type == NotificationType.ABSENCE_AVERTISSMENT
                || type == NotificationType.ABSENCE_AVERTISSEMENT
                || type == NotificationType.ABSENCE_THRESHOLD_EXCEEDED;
    }

    private String accentColor(String accent) {
        return switch (accent) {
            case "success" -> "#16a34a";
            case "danger" -> "#dc2626";
            default -> "#d97706";
        };
    }

    private String accentLightColor(String accent) {
        return switch (accent) {
            case "success" -> "#ecfdf5";
            case "danger" -> "#fef2f2";
            default -> "#fffbeb";
        };
    }

    private String accentBadgeText(String accent) {
        return switch (accent) {
            case "success" -> "Acceptée";
            case "danger" -> "Refusée";
            default -> "Attention";
        };
    }

    private String escape(String value) {
        return HtmlUtils.htmlEscape(value == null ? "" : value);
    }

    private boolean hasText(String value) {
        return value != null
                && !value.isBlank()
                && !"null".equalsIgnoreCase(value.trim())
                && !"undefined".equalsIgnoreCase(value.trim());
    }
}