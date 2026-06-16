package ma.eniad.attendanceservice.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "attendance_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String courseLabel;
    @Column(nullable = false)
    private String roomLabel;

    @Column(nullable = false)
    private String gpsLat;
    @Column(nullable = false)
    private String gpsLon;

    @Column(nullable = false)
    private LocalDateTime startedAt;
    @Column(nullable = false)
    private LocalDateTime endsAt;
    @Column
    private LocalDateTime endedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AttendanceSessionStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "session_method", nullable = false)
    private AttendanceSessionMethod method;


    @Column(nullable = false)
    private Long teacherId;
    @Column
    private String teacherFullName;

    @Column(nullable = false)
    @Builder.Default
    private int presentCount = 0;

    @Column(nullable = false)
    @Builder.Default
    private int absentCount = 0;

    @Column(nullable = false)
    @Builder.Default
    private int unknownCount = 0;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "attendance_session_group_ids", joinColumns = @JoinColumn(name = "session_id"))
    @Column(name = "group_id", nullable = false)
    @OrderColumn(name = "group_order")
    @Builder.Default
    private List<Long> groupIds = new ArrayList<>();
}
