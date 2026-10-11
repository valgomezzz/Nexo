package co.edu.javeriana.nexo.model;

import com.google.cloud.firestore.DocumentSnapshot;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Asignatura/grupo guardado en la colección "subjects".
 * Cada documento es un grupo de una materia con su docente y sus estudiantes inscritos.
 */
public record Asignatura(String id, String nombre, String abreviatura, String grupo,
                         String profesorUid, String profesorNombre, List<String> estudiantes) {

  @SuppressWarnings("unchecked")
  public static Asignatura desde(DocumentSnapshot d) {
    List<String> est = (List<String>) d.get("studentUids");
    return new Asignatura(d.getId(), d.getString("nombre"), d.getString("abreviatura"),
        d.getString("grupo"), d.getString("professorUid"), d.getString("professorNombre"),
        est == null ? List.of() : est);
  }

  public Map<String, Object> toJson() {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", id);
    m.put("nombre", nombre);
    m.put("abreviatura", abreviatura);
    m.put("grupo", grupo);
    m.put("profesor", profesorNombre);
    return m;
  }
}
