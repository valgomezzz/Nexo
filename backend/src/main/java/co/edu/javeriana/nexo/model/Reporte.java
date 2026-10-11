package co.edu.javeriana.nexo.model;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/** Reporte de dificultad académica (HU-02, HU-03, HU-04 y HU-05). */
public record Reporte(String id, String studentUid, String studentNombre, String subjectId,
                      String subjectNombre, String grupo, String professorUid,
                      int moodMetodologia, int moodContenido, int moodRitmo,
                      String categoria, String titulo, String detalle,
                      Estado estado, Instant createdAt, Instant updatedAt) {

  public static Reporte desde(DocumentSnapshot d) {
    return new Reporte(
        d.getId(),
        d.getString("studentUid"),
        d.getString("studentNombre") != null ? d.getString("studentNombre") : "Estudiante",
        d.getString("subjectId"),
        d.getString("subjectNombre") != null ? d.getString("subjectNombre") : d.getString("asignatura"),
        d.getString("grupo") != null ? d.getString("grupo") : "G1",
        d.getString("professorUid"),
        entero(d, "moods.metodologia"),
        entero(d, "moods.contenido"),
        entero(d, "moods.ritmo"),
        d.getString("categoria") != null ? d.getString("categoria") : "Metodología",
        d.getString("titulo"),
        d.getString("detalle"),
        Estado.desdeCodigo(d.getString("estado")),
        instante(d.getTimestamp("createdAt")),
        instante(d.getTimestamp("updatedAt"))
    );
  }

  public Map<String, Object> toJson(boolean incluirEstudiante) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", id);
    m.put("subjectId", subjectId);
    m.put("asignatura", subjectNombre);
    m.put("grupo", grupo);
    m.put("categoria", categoria);
    m.put("titulo", titulo);
    m.put("detalle", detalle);
    m.put("moods", Map.of("metodologia", moodMetodologia, "contenido", moodContenido, "ritmo", moodRitmo));
    m.put("estado", estado.codigo());
    m.put("createdAt", createdAt == null ? Instant.now().toString() : createdAt.toString());
    m.put("updatedAt", updatedAt == null ? Instant.now().toString() : updatedAt.toString());
    if (incluirEstudiante) {
      m.put("studentUid", studentUid);
      m.put("studentNombre", studentNombre);
    }
    return m;
  }

  private static int entero(DocumentSnapshot d, String campo) {
    Long v = d.getLong(campo);
    return v == null ? 2 : v.intValue();
  }

  private static Instant instante(Timestamp t) {
    return t == null ? Instant.now() : Instant.ofEpochSecond(t.getSeconds(), t.getNanos());
  }
}
