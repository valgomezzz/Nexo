package co.edu.javeriana.nexo.service;

import co.edu.javeriana.nexo.model.Asignatura;
import co.edu.javeriana.nexo.model.Estado;
import co.edu.javeriana.nexo.model.Reporte;
import co.edu.javeriana.nexo.model.Rol;
import co.edu.javeriana.nexo.model.Usuario;
import co.edu.javeriana.nexo.support.ApiException;
import co.edu.javeriana.nexo.support.Firebase;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.FieldValue;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.Query;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** HU-02 (crear reportes) y HU-03 (consultar y cambiar estado). */
public class ReportService {

  public static final int MIN_PALABRAS = 20;
  private static final String[] CATEGORIAS = {"Metodología", "Contenido", "Ritmo"};

  private final SubjectService subjects;

  public ReportService(SubjectService subjects) {
    this.subjects = subjects;
  }

  private CollectionReference col() {
    return Firebase.db().collection("reports");
  }

  /** Reportes que el usuario puede ver, del más reciente al más antiguo. */
  public List<Reporte> visibles(Usuario u) {
    Query q = switch (u.rol()) {
      case ESTUDIANTE -> col().whereEqualTo("studentUid", u.uid());
      case DOCENTE -> col().whereEqualTo("professorUid", u.uid());
      case DIRECCION, ADMIN -> col();
    };
    return Firebase.await(q.get()).getDocuments().stream()
        .map(Reporte::desde)
        .sorted(Comparator.comparing(Reporte::createdAt,
            Comparator.nullsLast(Comparator.reverseOrder())))
        .toList();
  }

  public Reporte crear(Usuario u, JsonObject body) {
    if (u.rol() != Rol.ESTUDIANTE) {
      throw new ApiException(403, "Solo los estudiantes pueden crear reportes");
    }
    Asignatura a = subjects.obtener(texto(body, "subjectId"));
    if (!a.estudiantes().contains(u.uid())) {
      throw new ApiException(403, "No estás inscrito en " + a.nombre());
    }

    String detalle = texto(body, "detalle").trim();
    int palabras = detalle.isEmpty() ? 0 : detalle.split("\\s+").length;
    if (palabras < MIN_PALABRAS) {
      throw new ApiException(400, "La descripción debe tener al menos " + MIN_PALABRAS
          + " palabras (tiene " + palabras + ")");
    }

    JsonObject moods = body.has("moods") && body.get("moods").isJsonObject()
        ? body.getAsJsonObject("moods") : new JsonObject();
    int[] valores = {mood(moods, "metodologia"), mood(moods, "contenido"), mood(moods, "ritmo")};

    // La categoría del reporte es el aspecto peor valorado
    int peor = 0;
    for (int i = 1; i < valores.length; i++) if (valores[i] < valores[peor]) peor = i;

    Timestamp ahora = Timestamp.now();
    Map<String, Object> data = new HashMap<>();
    data.put("studentUid", u.uid());
    data.put("subjectId", a.id());
    data.put("subjectNombre", a.nombre());
    data.put("grupo", a.grupo());
    data.put("professorUid", a.profesorUid());
    data.put("moods", Map.of("metodologia", valores[0], "contenido", valores[1], "ritmo", valores[2]));
    data.put("comentarios", comentarios(body));
    data.put("categoria", CATEGORIAS[peor]);
    data.put("titulo", extracto(detalle));
    data.put("detalle", detalle);
    data.put("estado", Estado.PENDIENTE.name());
    data.put("historial", List.of(Map.of("estado", Estado.PENDIENTE.name(), "por", u.uid(), "fecha", ahora)));
    data.put("createdAt", ahora);
    data.put("updatedAt", ahora);

    DocumentReference ref = col().document();
    Firebase.await(ref.set(data));
    return Reporte.desde(Firebase.await(ref.get()));
  }

  /** Cambia el estado. Solo el docente a cargo de la asignatura (o un admin) puede hacerlo. */
  public Reporte cambiarEstado(Usuario u, String id, JsonObject body) {
    if (u.rol() != Rol.DOCENTE && u.rol() != Rol.ADMIN) {
      throw new ApiException(403, "Solo los docentes pueden cambiar el estado de un reporte");
    }
    Estado nuevo = Estado.desdeCodigo(texto(body, "estado"));
    Firestore db = Firebase.db();
    DocumentReference ref = col().document(id);

    // Transacción para que dos cambios simultáneos no se pisen
    Firebase.await(db.runTransaction(tx -> {
      DocumentSnapshot d = tx.get(ref).get();
      if (!d.exists()) throw new ApiException(404, "El reporte no existe");
      if (u.rol() == Rol.DOCENTE && !u.uid().equals(d.getString("professorUid"))) {
        throw new ApiException(403, "Este reporte no pertenece a tus asignaturas");
      }
      Timestamp ahora = Timestamp.now();
      tx.update(ref, Map.of(
          "estado", nuevo.name(),
          "updatedAt", ahora,
          "historial", FieldValue.arrayUnion(Map.of("estado", nuevo.name(), "por", u.uid(), "fecha", ahora))));
      return null;
    }));
    return Reporte.desde(Firebase.await(ref.get()));
  }

  // ---------- utilidades ----------

  private static String texto(JsonObject o, String campo) {
    JsonElement e = o.get(campo);
    return e == null || e.isJsonNull() ? "" : e.getAsString();
  }

  private static int mood(JsonObject moods, String campo) {
    JsonElement e = moods.get(campo);
    if (e == null || e.isJsonNull()) throw new ApiException(400, "Falta responder la pregunta de " + campo);
    int v;
    try {
      v = e.getAsInt();
    } catch (RuntimeException ex) {
      throw new ApiException(400, "Valoración inválida en " + campo);
    }
    if (v < 0 || v > 4) throw new ApiException(400, "La valoración de " + campo + " debe estar entre 0 y 4");
    return v;
  }

  private static Map<String, String> comentarios(JsonObject body) {
    Map<String, String> out = new LinkedHashMap<>();
    if (body.has("comments") && body.get("comments").isJsonObject()) {
      for (Map.Entry<String, JsonElement> e : body.getAsJsonObject("comments").entrySet()) {
        if (!e.getValue().isJsonNull()) {
          String t = e.getValue().getAsString().trim();
          if (!t.isEmpty()) out.put(e.getKey(), t.length() > 1000 ? t.substring(0, 1000) : t);
        }
      }
    }
    return out;
  }

  private static String extracto(String detalle) {
    String t = detalle.replaceAll("\\s+", " ");
    return t.length() <= 70 ? t : t.substring(0, 70).replaceAll("\\s\\S*$", "") + "…";
  }
}
