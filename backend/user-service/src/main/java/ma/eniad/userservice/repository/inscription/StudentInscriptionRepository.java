package ma.eniad.userservice.repository.inscription;

import ma.eniad.userservice.entity.Inscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface StudentInscriptionRepository extends JpaRepository<Inscription, Long> {
    @Query("select i from Inscription i " +
            "where i.groupe.id in :groupIds and i.anneeUniversitaire.id = :anneeUniversitaireId")
    List<Inscription> findRosterByGroupIdsAndAnneeUniversitaireId(
            @Param("groupIds") List<Long> groupIds,
            @Param("anneeUniversitaireId") Long anneeUniversitaireId
    );

    boolean existsByStudentIdAndAnneeUniversitaireId(Long studentId, Long anneeId);

    @Query("select i.student.id, i.anneeUniversitaire.id from Inscription i " +
            "where i.student.id in :studentIds and i.anneeUniversitaire.id in :anneeIds")
    List<Object[]> findExistingStudentYearPairs(
            @Param("studentIds") Set<Long> studentIds,
            @Param("anneeIds") Set<Long> anneeIds
    );

    @Query("select i from Inscription i " +
            "join fetch i.formation " +
            "join fetch i.groupe g " +
            "join fetch g.formation f " +
            "left join fetch f.filiere fi " +
            "where i.student.id = :studentId and i.anneeUniversitaire.id = :anneeUniversitaireId")
    Optional<Inscription> findActiveByStudentIdAndYearId(
            @Param("studentId") Long studentId,
            @Param("anneeUniversitaireId") Long anneeUniversitaireId
    );

    @Query("select i from Inscription i " +
            "join fetch i.student s " +
            "join fetch i.anneeUniversitaire ay " +
            "join fetch i.formation f " +
            "join fetch f.cycle c " +
            "left join fetch f.filiere fi " +
            "join fetch i.groupe g " +
            "where i.anneeUniversitaire.id = :anneeUniversitaireId")
    List<Inscription> findActiveByYearId(@Param("anneeUniversitaireId") Long anneeUniversitaireId);

    boolean existsByStudentIdAndGroupeIdAndAnneeUniversitaireId(
            Long studentId,
            Long groupeId,
            Long anneeUniversitaireId
    );
}
