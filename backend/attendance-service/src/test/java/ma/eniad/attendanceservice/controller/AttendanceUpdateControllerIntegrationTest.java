package ma.eniad.attendanceservice.controller;

import ma.eniad.attendanceservice.dto.AttendanceUpdateResponse;
import ma.eniad.attendanceservice.entity.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;
import ma.eniad.attendanceservice.service.AttendanceUpdateService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AttendanceUpdateControllerIntegrationTest {

    @org.springframework.beans.factory.annotation.Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AttendanceUpdateService attendanceUpdateService;

    @Test
    void teacherManualUpdateRouteSucceeds() throws Exception {
        when(attendanceUpdateService.updateManualAttendance(anyLong(), anyLong(), any()))
                .thenReturn(new AttendanceUpdateResponse(
                        100L,
                        10L,
                        AttendanceStudentStatus.PRESENT,
                        AttendanceSessionMethod.MANUAL,
                        null,
                        null,
                        null,
                        LocalDateTime.of(2026, 4, 28, 12, 0),
                        1,
                        0,
                        1
                ));

        mockMvc.perform(post("/attendance/sessions/100/attendance")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-User-Id", "77")
                        .header("X-User-Roles", "TEACHER")
                        .header("X-User-Email", "teacher@ump.ac.ma")
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
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-User-Id", "77")
                        .header("X-User-Roles", "ADMIN")
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
        when(attendanceUpdateService.updateInternalAttendance(anyString(), anyLong(), any()))
                .thenReturn(new AttendanceUpdateResponse(
                        100L,
                        10L,
                        AttendanceStudentStatus.PRESENT,
                        AttendanceSessionMethod.QR_CODE,
                        "phone-10",
                        "34.6820",
                        "-1.9091",
                        LocalDateTime.of(2026, 4, 28, 12, 0),
                        1,
                        0,
                        1
                ));

        mockMvc.perform(post("/attendance/internal/sessions/100/attendance")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Request-Source", "qr-service")
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
                .andExpect(jsonPath("$.deviceId").value("phone-10"))
                .andExpect(jsonPath("$.markedGpsLat").value("34.6820"))
                .andExpect(jsonPath("$.markedGpsLon").value("-1.9091"));
    }

    @Test
    void internalUpdateRejectsUntrustedSource() throws Exception {
        mockMvc.perform(post("/attendance/internal/sessions/100/attendance")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Request-Source", "unknown-service")
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
    void internalFaceUpdateRouteAcceptsNullDeviceAndGps() throws Exception {
        when(attendanceUpdateService.updateInternalAttendance(anyString(), anyLong(), any()))
                .thenReturn(new AttendanceUpdateResponse(
                        100L,
                        10L,
                        AttendanceStudentStatus.PRESENT,
                        AttendanceSessionMethod.FACE_ID,
                        null,
                        null,
                        null,
                        LocalDateTime.of(2026, 4, 28, 12, 0),
                        1,
                        0,
                        1
                ));

        mockMvc.perform(post("/attendance/internal/sessions/100/attendance")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Request-Source", "face-service")
                        .content("""
                                {
                                  "studentId": 10,
                                  "method": "FACE_ID",
                                  "deviceId": null,
                                  "gpsLat": null,
                                  "gpsLon": null
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.markMethod").value("FACE_ID"))
                .andExpect(jsonPath("$.deviceId").doesNotExist());
    }
}
