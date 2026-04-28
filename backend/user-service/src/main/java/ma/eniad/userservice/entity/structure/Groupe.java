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
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import ma.eniad.userservice.entity.BaseEntity;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Getter
@Setter
@Table(
    name = "groupes",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_groupes_formation_name",
        columnNames = {"formation_id", "name"}
    ),
    indexes = {
        @Index(name = "idx_groupes_formation", columnList = "formation_id")
    }
)
@SQLDelete(sql = "UPDATE groupes SET deleted = true WHERE id = ?")
@SQLRestriction("deleted = false")
public class Groupe extends BaseEntity {
    @NotBlank
    @Size(max = 60)
    @Column(nullable = false, length = 60)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "formation_id", nullable = false)
    private Formation formation;
}