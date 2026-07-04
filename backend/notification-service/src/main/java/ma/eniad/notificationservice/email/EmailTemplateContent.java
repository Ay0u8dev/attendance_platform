package ma.eniad.notificationservice.email;

public record EmailTemplateContent(
        String subject,
        String plainText,
        String html
) {
}
