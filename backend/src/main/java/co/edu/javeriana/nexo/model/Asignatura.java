package co.edu.javeriana.nexo.model;

import com.google.cloud.firestore.DocumentSnapshot;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Asignatura cursada o a cargo (HU-02 y HU-03). */
public record Asignatura(String id, String codigo, String nombre, String abreviatura,
                         String grupo, String profesorUid, String profesorNombre,
                         List<String> estudiantes) {

  @SuppressWarnings("unchecked")
  public static Asignatura desde(DocumentSnapshot d) {
    List<String> est = (List<String>) d.get("studentUids");
    return new Asignatura(
        d.getId(),
        d.getString("codigo") != null ? d.getString("codigo") : "PUJ",
        d.getString("nombre"),
        d.getString("abreviatura"),
        d.getString("grupo") != null ? d.getString("grupo") : "G1",
        d.getString("professorUid"),
        d.getString("professorNombre"),
        est == null ? List.of() : est
    );
  }

  public Map<String, Object> toJson() {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", id);
    m.put("codigo", codigo);
    m.put("nombre", nombre);
    m.put("abreviatura", abreviatura);
    m.put("grupo", grupo);
    m.put("professorNombre", profesorNombre);
    m.put("professorUid", profesorUid);
    return m;
  }
}
