package ma.eniad.userservice.dto;

public class StudentRosterDto {
        private final Long studentId;
        private final Long groupId;
        private final String firstName;
        private final String lastName;
        private final String email;
        private final String pfpUrl;
        private final String numApogee;

        public StudentRosterDto(
                        Long studentId,
                        Long groupId,
                        String firstName,
                        String lastName,
                        String email,
                        String pfpUrl,
                        String numApogee
        ) {
                this.studentId = studentId;
                this.groupId = groupId;
                this.firstName = firstName;
                this.lastName = lastName;
                this.email = email;
                this.pfpUrl = pfpUrl;
                this.numApogee = numApogee;
        }

        public Long getStudentId() {
                return studentId;
        }

        public Long getGroupId() {
                return groupId;
        }

        public String getFirstName() {
                return firstName;
        }

        public String getLastName() {
                return lastName;
        }

        public String getEmail() {
                return email;
        }

        public String getPfpUrl() {
                return pfpUrl;
        }

        public String getNumApogee() {
                return numApogee;
        }
}
