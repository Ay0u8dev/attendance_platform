package ma.eniad.userservice.entity.structure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import ma.eniad.userservice.entity.BaseEntity;
import ma.eniad.userservice.entity.enums.CycleType;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Getter
@Setter
@Table(name = "cycles")
@SQLDelete(sql = "UPDATE cycles SET deleted = true WHERE id = ?")
@SQLRestriction("deleted = false")
public class Cycle extends BaseEntity {
    @NotBlank
    @Size(max = 20)
    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @NotBlank
    @Size(max = 120)
    @Column(nullable = false, length = 120)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CycleType type;
}