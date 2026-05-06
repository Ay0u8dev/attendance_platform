package ma.eniad.userservice.entity.structure;

import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
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
@Table(name = "filieres")
@SQLDelete(sql = "UPDATE filieres SET deleted = true WHERE id = ?")
@SQLRestriction("deleted = false")
public class Filiere extends BaseEntity {
    @NotBlank
    @Size(max = 20)
    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @NotBlank
    @Size(max = 120)
    @Column(nullable = false, length = 120)
    private String name;

    @OneToMany(mappedBy = "filiere", cascade = CascadeType.REMOVE)
    private List<Formation> formations;
}
