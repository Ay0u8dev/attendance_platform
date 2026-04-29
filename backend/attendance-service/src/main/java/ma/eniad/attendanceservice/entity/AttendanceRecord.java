package ma.eniad.attendanceservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "attendance_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long sessionId;

    @Column(nullable = false)
    private Long studentId;

    @Column(nullable = false)
    private Long groupId;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String numApogee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AttendanceStudentStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = true)
    private AttendanceSessionMethod markMethod;

    @Column(nullable = true)
    private LocalDateTime markedAt;

    @Column(nullable = true)
    private String deviceId;

    @Column(nullable = true)
    private String markedGpsLat;

    @Column(nullable = true)
    private String markedGpsLon;
}
