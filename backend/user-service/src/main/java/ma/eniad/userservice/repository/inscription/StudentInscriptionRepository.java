package ma.eniad.userservice.repository.inscription;

import ma.eniad.userservice.entity.Inscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Set;
import java.util.Optional;

<<<<<<< HEAD:backend/user-service/src/main/java/ma/eniad/userservice/repository/InscriptionRepository.java
public interface InscriptionRepository extends JpaRepository<Inscription, Long> {
    boolean existsByStudentIdAndGroupeIdAndAnneeUniversitaireId(
            Long studentId,
            Long groupeId,
            Long anneeUniversitaireId
    );

=======
public interface StudentInscriptionRepository extends JpaRepository<Inscription, Long> {
>>>>>>> origin/dev:backend/user-service/src/main/java/ma/eniad/userservice/repository/inscription/StudentInscriptionRepository.java
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
}
