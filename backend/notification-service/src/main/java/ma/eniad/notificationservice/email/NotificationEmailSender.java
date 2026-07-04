package ma.eniad.notificationservice.email;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationEmailSender {

    private final JavaMailSender javaMailSender;
    private final NotificationEmailProperties properties;

    public void send(EmailNotificationMessage message, EmailTemplateContent content) {
        try {
            var mimeMessage = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    mimeMessage,
                    true,
                    StandardCharsets.UTF_8.name()
            );

            helper.setTo(message.recipientEmail());
            helper.setSubject(content.subject());
            if (properties.senderName() == null || properties.senderName().isBlank()) {
                helper.setFrom(properties.from());
            } else {
                helper.setFrom(properties.from(), properties.senderName());
            }
            helper.setText(content.plainText(), content.html());

            javaMailSender.send(mimeMessage);
            log.info(
                    "Notification email sent notificationId={} recipientUserId={} type={}",
                    message.notificationId(),
                    message.recipientUserId(),
                    message.notificationType()
            );
        } catch (Exception ex) {
            throw new NotificationEmailSendException("Failed to send notification email", ex);
        }
    }

}
