package ma.eniad.attendanceservice.controller;

import ma.eniad.attendanceservice.config.RoleCheckInterceptor;
import ma.eniad.attendanceservice.config.WebConfig;
import ma.eniad.attendanceservice.dto.AttendanceUpdateResponse;
import ma.eniad.attendanceservice.dto.JustificationContextResponse;
import ma.eniad.attendanceservice.entity.enums.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.enums.AttendanceStudentStatus;
import ma.eniad.attendanceservice.exception.GlobalExceptionHandler;
import ma.eniad.attendanceservice.service.AttendanceUpdateService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static ma.eniad.attendanceservice.controller.TestRequestHeaders.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AttendanceUpdateController.class)
@Import({WebConfig.class, RoleCheckInterceptor.class, GlobalExceptionHandler.class})
class AttendanceUpdateControllerWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AttendanceUpdateService attendanceUpdateService;

    @Test
    void teacherManualUpdateRouteSucceeds() throws Exception {
        when(attendanceUpdateService.updateManualAttendance(anyLong(), anyLong(), any()))
                .thenReturn(new AttendanceUpdateResponse(
                        100L, 10L, AttendanceStudentStatus.PRESENT, AttendanceSessionMethod.MANUAL,
                        LocalDateTime.of(2026, 4, 28, 12, 0), 1, 0, 1
                ));

        mockMvc.perform(post("/attendance/sessions/100/attendance")
                        .with(teacherUser())
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {
                                  "studentId": 10,
                                  "status": "PRESENT"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value(10))
                .andExpect(jsonPath("$.status").value("PRESENT"))
                .andExpect(jsonPath("$.markMethod").value("MANUAL"));
    }

    @Test
    void teacherManualUpdateRejectsCallerWithoutTeacherRole() throws Exception {
        mockMvc.perform(post("/attendance/sessions/100/attendance")
                        .with(user("1", "ADMIN", "admin@ump.ac.ma"))
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {
                                  "studentId": 10,
                                  "status": "PRESENT"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void internalUpdateRouteSucceedsForTrustedCaller() throws Exception {
        when(attendanceUpdateService.updateInternalAttendance(anyString(), anyString(), anyLong(), any()))
                .thenReturn(new AttendanceUpdateResponse(
                        100L, 10L, AttendanceStudentStatus.PRESENT, AttendanceSessionMethod.QR_CODE,
                        LocalDateTime.of(2026, 4, 28, 12, 0), 1, 0, 1
                ));

        mockMvc.perform(post("/attendance/internal/sessions/100/attendance")
                        .with(internalSource("qr-service"))
                        .header("X-Internal-Service-Token", "test-token")
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {
                                  "studentId": 10,
                                  "method": "QR_CODE",
                                  "deviceId": "phone-10",
                                  "gpsLat": "34.6820",
                                  "gpsLon": "-1.9091"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.markMethod").value("QR_CODE"))
                .andExpect(jsonPath("$.deviceId").doesNotExist())
                .andExpect(jsonPath("$.markedGpsLat").doesNotExist())
                .andExpect(jsonPath("$.markedGpsLon").doesNotExist());
    }

    @Test
    void internalUpdateRejectsUntrustedSource() throws Exception {
        mockMvc.perform(post("/attendance/internal/sessions/100/attendance")
                        .with(internalSource("unknown-service"))
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {
                                  "studentId": 10,
                                  "method": "QR_CODE",
                                  "deviceId": "phone-10",
                                  "gpsLat": "34.6820",
                                  "gpsLon": "-1.9091"
                                }
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void internalFaceUpdateRouteAcceptsDeviceAndGpsWithoutReturningThem() throws Exception {
        when(attendanceUpdateService.updateInternalAttendance(anyString(), anyString(), anyLong(), any()))
                .thenReturn(new AttendanceUpdateResponse(
                        100L, 10L, AttendanceStudentStatus.PRESENT, AttendanceSessionMethod.FACE_ID,
                        LocalDateTime.of(2026, 4, 28, 12, 0), 1, 0, 1
                ));

        mockMvc.perform(post("/attendance/internal/sessions/100/attendance")
                        .with(internalSource("face-service"))
                        .header("X-Internal-Service-Token", "test-token")
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {
                                  "studentId": 10,
                                  "method": "FACE_ID",
                                  "deviceId": "phone-10",
                                  "gpsLat": "34.6820",
                                  "gpsLon": "-1.9091"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.markMethod").value("FACE_ID"))
                .andExpect(jsonPath("$.deviceId").doesNotExist())
                .andExpect(jsonPath("$.markedGpsLat").doesNotExist())
                .andExpect(jsonPath("$.markedGpsLon").doesNotExist());
    }

    @Test
    void justificationContextRouteAllowsCanonicalService() throws Exception {
        when(attendanceUpdateService.getJustificationContext("justification-service", "test-token", 100L, 10L))
                .thenReturn(new JustificationContextResponse(
                        501L,
                        100L,
                        10L,
                        20L,
                        77L,
                        "Prof. Idrissi",
                        "Aya Bennani",
                        "aya@ump.ac.ma",
                        "A001",
                        "Distributed Systems",
                        "B12",
                        LocalDateTime.of(2026, 6, 20, 9, 0),
                        LocalDateTime.of(2026, 6, 20, 10, 30),
                        AttendanceStudentStatus.ABSENT
                ));

        mockMvc.perform(get("/attendance/internal/sessions/100/students/10/justification-context")
                        .with(internalSource("justification-service"))
                        .header("X-Internal-Service-Token", "test-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attendanceRecordId").value(501))
                .andExpect(jsonPath("$.teacherId").value(77))
                .andExpect(jsonPath("$.attendanceStatus").value("ABSENT"));
    }

    @Test
    void justifyRouteAllowsCanonicalService() throws Exception {
        doNothing().when(attendanceUpdateService).justifyFinalizedAbsence(
                anyString(),
                anyString(),
                anyLong(),
                anyLong(),
                any()
        );

        mockMvc.perform(patch("/attendance/internal/sessions/100/students/10/justify")
                        .with(internalSource("justification-service"))
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {
                                  "justificationId": 50,
                                  "decidedBy": "5",
                                  "decidedByRole": "ADMIN"
                                }
                                """))
                .andExpect(status().isNoContent());
    }
}
