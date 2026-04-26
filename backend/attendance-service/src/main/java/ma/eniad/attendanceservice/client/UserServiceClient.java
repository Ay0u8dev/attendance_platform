package ma.eniad.attendanceservice.client;

import ma.eniad.attendanceservice.dto.StudentRosterDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@FeignClient(
        name = "user-service",
        url = "${services.user-service.url:http://localhost:8082}",
        path = "/users"
)
public interface UserServiceClient {

    @GetMapping("/internal/students/roster")
    List<StudentRosterDto> getStudentRosterByGroupIds(@RequestParam("groupIds") List<Long> groupIds);
}
