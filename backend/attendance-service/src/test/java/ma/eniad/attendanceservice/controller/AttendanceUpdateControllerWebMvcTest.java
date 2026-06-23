package ma.eniad.attendanceservice.controller;

import ma.eniad.attendanceservice.config.RoleCheckInterceptor;
import ma.eniad.attendanceservice.config.WebConfig;
import ma.eniad.attendanceservice.dto.AttendanceUpdateResponse;
import ma.eniad.attendanceservice.entity.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;
import ma.eniad.attendanceservice.exception.GlobalExceptionHandler;
import ma.eniad.attendanceservice.service.AttendanceUpdateService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static ma.eniad.attendanceservice.controller.TestRequestHeaders.internalSource;
import static ma.eniad.attendanceservice.controller.TestRequestHeaders.teacherUser;
import static ma.eniad.attendanceservice.controller.TestRequestHeaders.user;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
}
