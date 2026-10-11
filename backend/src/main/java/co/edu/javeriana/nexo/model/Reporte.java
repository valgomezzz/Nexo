package co.edu.javeriana.nexo.model;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/** Reporte de dificultad académica guardado en la colección "reports". */
public record Reporte(String id, String studentUid, String subjectId, String subjectNombre,
                      String grupo, String professorUid, int moodMetodologia, int moodContenido,
                      int moodRitmo, String categoria, String titulo, String detalle,
                      Estado estado, Instant createdAt, Instant updatedAt) {

  public static Reporte desde(DocumentSnapshot d) {
    return new Reporte(d.getId(), d.getString("studentUid"), d.getString("subjectId"),
        d.getString("subjectNombre"), d.getString("grupo"), d.getString("professorUid"),
        entero(d, "moods.metodologia"), entero(d, "moods.contenido"), entero(d, "moods.ritmo"),
        d.getString("categoria"), d.getString("titulo"), d.getString("detalle"),
        Estado.valueOf(d.getString("estado")), instante(d.getTimestamp("createdAt")),
        instante(d.getTimestamp("updatedAt")));
  }

  /** Valor más bajo de las tres preguntas (0 = Muy mal ... 4 = Muy bien). */
  public int moodMinimo() {
    return Math.min(moodMetodologia, Math.min(moodContenido, moodRitmo));
  }

  /**
   * JSON para el cliente. Los docentes y la dirección no reciben el uid del estudiante:
   * los reportes son anónimos para ellos.
   */
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
    m.put("createdAt", createdAt == null ? null : createdAt.toString());
    m.put("updatedAt", updatedAt == null ? null : updatedAt.toString());
    if (incluirEstudiante) m.put("studentUid", studentUid);
    return m;
  }

  private static int entero(DocumentSnapshot d, String campo) {
    Long v = d.getLong(campo);
    return v == null ? 2 : v.intValue();
  }

  private static Instant instante(Timestamp t) {
    return t == null ? null : Instant.ofEpochSecond(t.getSeconds(), t.getNanos());
  }
}
