package ma.eniad.attendanceservice.controller;

import org.springframework.test.web.servlet.request.RequestPostProcessor;

final class TestRequestHeaders {

    private TestRequestHeaders() {
    }

    static RequestPostProcessor teacherUser() {
        return user("77", "TEACHER", "teacher@ump.ac.ma");
    }

    static RequestPostProcessor adminUser() {
        return user("1", "ADMIN", "admin@ump.ac.ma");
    }

    static RequestPostProcessor studentUser() {
        return user("12", "STUDENT", "student@ump.ac.ma");
    }

    static RequestPostProcessor internalSource(String source) {
        return request -> {
            request.addHeader("X-Request-Source", source);
            return request;
        };
    }

    static RequestPostProcessor user(String userId, String roles, String email) {
        return request -> {
            request.addHeader("X-User-Id", userId);
            request.addHeader("X-User-Roles", roles);
            request.addHeader("X-User-Email", email);
            return request;
        };
    }
}
