package ma.eniad.userservice.entity.structure;

import java.time.LocalDate;
import java.util.List;
import ma.eniad.userservice.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.CascadeType;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
        name = "annee_universitaires", 
        indexes = {
                @Index(name = "idx_annee_univ_active", columnList = "is_active")
        }
)
public class AnneeUniversitaire extends BaseEntity {
        @NotBlank
        @Size(max = 20)
        @Column(nullable = false, unique = true, length = 20)
        private String name;

        @Column(nullable = false)
        private LocalDate startDate;

        @Column(nullable = false)
        private LocalDate endDate;

        @Column(name = "is_active", nullable = false)
        private boolean active = false;

        @OneToMany(mappedBy = "anneeUniversitaire", cascade = CascadeType.REMOVE)
        private List<Formation> formations;

        @AssertTrue
        public boolean isValidAcademicYear() {
                return startDate != null && endDate != null && !startDate.isAfter(endDate);
        }
}
