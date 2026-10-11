package co.edu.javeriana.nexo.service;

import co.edu.javeriana.nexo.model.Asignatura;
import co.edu.javeriana.nexo.model.Usuario;
import co.edu.javeriana.nexo.support.ApiException;
import co.edu.javeriana.nexo.support.Firebase;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Query;
import java.util.Comparator;
import java.util.List;

/** Asignaturas visibles según el rol: inscritas (estudiante), a cargo (docente) o todas. */
public class SubjectService {

  private CollectionReference col() {
    return Firebase.db().collection("subjects");
  }

  public List<Asignatura> visibles(Usuario u) {
    Query q = switch (u.rol()) {
      case ESTUDIANTE -> col().whereArrayContains("studentUids", u.uid());
      case DOCENTE -> col().whereEqualTo("professorUid", u.uid());
      case DIRECCION, ADMIN -> col();
    };
    return Firebase.await(q.get()).getDocuments().stream()
        .map(Asignatura::desde)
        .sorted(Comparator.comparing(Asignatura::nombre).thenComparing(Asignatura::grupo))
        .toList();
  }

  public Asignatura obtener(String id) {
    if (id == null || id.isBlank()) throw new ApiException(400, "Selecciona una asignatura");
    DocumentSnapshot d = Firebase.await(col().document(id).get());
    if (!d.exists()) throw new ApiException(404, "La asignatura no existe");
    return Asignatura.desde(d);
  }
}
