package ma.eniad.userservice.repository.inscription;

import ma.eniad.userservice.entity.Inscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Set;

public interface InscriptionRepository extends JpaRepository<Inscription, Long> {
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
}
