package ma.eniad.userservice.entity.structure;

import java.time.LocalDate;
import ma.eniad.userservice.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Getter
@Setter
@Table(
        name = "annee_universitaires",
        indexes = {
                @Index(name = "idx_annee_univ_active", columnList = "is_active")
        }
)
@SQLDelete(sql = "UPDATE annee_universitaires SET deleted = true WHERE id = ?")
@SQLRestriction("deleted = false")
public class AnneeUniversitaire extends BaseEntity{
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

        @AssertTrue
        public boolean isValidAcademicYear() {
                return startDate != null && endDate != null && !startDate.isAfter(endDate);
        }
}