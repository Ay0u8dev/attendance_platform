package ma.eniad.userservice.dto.student;

public class StudentRosterDto {
        private final Long studentId;
        private final Long groupId;
        private final String firstName;
        private final String lastName;
        private final String email;
        private final String pfpUrl;
        private final String numApogee;
        private final String filiere;
        private final String groupeName;

        public StudentRosterDto(
                        Long studentId,
                        Long groupId,
                        String firstName,
                        String lastName,
                        String email,
                        String pfpUrl,
                        String numApogee,
                        String filiere,
                        String groupeName
        ) {
                this.studentId = studentId;
                this.groupId = groupId;
                this.firstName = firstName;
                this.lastName = lastName;
                this.email = email;
                this.pfpUrl = pfpUrl;
                this.numApogee = numApogee;
                this.filiere = filiere;
                this.groupeName = groupeName;
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

        public String getFiliere() {
                return filiere;
        }

        public String getGroupeName() {
                return groupeName;
        }
}
