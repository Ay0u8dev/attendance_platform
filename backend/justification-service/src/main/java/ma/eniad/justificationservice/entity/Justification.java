package ma.eniad.justificationservice.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "justifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Justification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long studentId;

    @Column(nullable = false)
    private String studentName;

    @Column(nullable = false)
    private String module;

    @Column(nullable = false)
    private LocalDateTime sessionDate;

    @Column(nullable = false)
    private String status;

    @Column(length = 1024)
    private String reason;

    @Column(nullable = false)
    private LocalDateTime submittedAt;

    @Column(length = 512)
    private String documentUrl;

    @Column(length = 512)
    private String teacherComment;
}
