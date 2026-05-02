package ma.eniad.userservice.entity.structure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import ma.eniad.userservice.entity.BaseEntity;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Getter 
@Setter
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
    name = "modules",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_modules_formation_code",
        columnNames = {"formation_id", "code"}
    ),
    indexes = {
        @Index(name = "idx_modules_formation", columnList = "formation_id")
    }
)
@SQLDelete(sql = "UPDATE modules SET deleted = true WHERE id = ?")
@SQLRestriction("deleted = false")
public class Module extends BaseEntity {
    @NotBlank
    @Size(max = 120)
    @Column(nullable = false, length = 120)
    private String name;

    @NotBlank
    @Size(max = 30)
    @Column(nullable = false, length = 30)
    private String code;

    @Positive
    private Integer semester;

    @Positive
    private Integer hours;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "formation_id", nullable = false)
    private Formation formation;
}
