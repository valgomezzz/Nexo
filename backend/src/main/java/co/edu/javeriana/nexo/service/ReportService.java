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
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

/** HU-02 (crear reportes) y HU-03 (consultar y cambiar estado). */
public class ReportService {

  public static final int MIN_LONGITUD = 20;
  private static final String[] CATEGORIAS = {"Metodología", "Contenido", "Ritmo"};

  private final SubjectService subjects;

  // Almacenamiento local en memoria thread-safe
  private static final List<Reporte> LOCAL_REPORTS = new CopyOnWriteArrayList<>();

  static {
    Instant ahora = Instant.now();
    LOCAL_REPORTS.add(new Reporte(
        "rep-001", "demo-est-01", "Ana María Ruiz", "subj-poo",
        "Programación Orientada a Objetos", "G1", "demo-doc-01",
        1, 2, 2, "Metodología",
        "Ejercicios de herencia y polimorfismo muy extensos para el tiempo de clase",
        "Sentimos que los ejercicios de herencia múltiple y polimorfismo planteados en los talleres prácticos son sumamente extensos para resolver en el bloque de 2 horas. Sería de gran ayuda contar con retroalimentación previa.",
        Estado.PENDIENTE, ahora.minus(2, ChronoUnit.DAYS), ahora.minus(2, ChronoUnit.DAYS)
    ));

    LOCAL_REPORTS.add(new Reporte(
        "rep-002", "demo-est-01", "Ana María Ruiz", "subj-edd",
        "Estructuras de Datos y Algoritmos", "G1", "demo-doc-01",
        2, 2, 1, "Ritmo",
        "Avance muy rápido en árboles binarios balanceados (AVL y Rojinegros)",
        "El ritmo en la última semana fue bastante acelerado al explicar rotaciones dobles en árboles AVL. Varios compañeros nos quedamos con dudas en el rastreo de punteros en memoria.",
        Estado.EN_REVISION, ahora.minus(4, ChronoUnit.DAYS), ahora.minus(1, ChronoUnit.DAYS)
    ));

    LOCAL_REPORTS.add(new Reporte(
        "rep-003", "demo-est-02", "Juan Diego Morales", "subj-poo",
        "Programación Orientada a Objetos", "G1", "demo-doc-01",
        3, 1, 2, "Contenido",
        "Discrepancia entre la versión del compilador local y las pruebas automáticas",
        "El entorno de entrega automática en GitHub Classroom evalúa con Java 21 mientras que la guía del laboratorio especifica Java 17, generando errores de compilación con las sintaxis de Switch expresiones.",
        Estado.ATENDIDO, ahora.minus(6, ChronoUnit.DAYS), ahora.minus(3, ChronoUnit.DAYS)
    ));
  }

  public ReportService(SubjectService subjects) {
    this.subjects = subjects;
  }

  private CollectionReference col() {
    return Firebase.db().collection("reports");
  }

  public List<Reporte> visibles(Usuario u) {
    if (Firebase.isCloudActive()) {
      try {
        Query q = switch (u.rol()) {
          case ESTUDIANTE -> col().whereEqualTo("studentUid", u.uid());
          case DOCENTE -> col().whereEqualTo("professorUid", u.uid());
          case DIRECCION, ADMIN -> col();
        };
        List<Reporte> list = Firebase.await(q.get()).getDocuments().stream()
            .map(Reporte::desde)
            .sorted(Comparator.comparing(Reporte::createdAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .toList();
        if (!list.isEmpty()) return list;
      } catch (Exception e) {}
    }

    return switch (u.rol()) {
      case ESTUDIANTE -> LOCAL_REPORTS.stream().filter(r -> r.studentUid().equals(u.uid()) || r.studentUid().equals("demo-est-01")).toList();
      case DOCENTE -> LOCAL_REPORTS.stream().filter(r -> r.professorUid().equals(u.uid()) || r.professorUid().equals("demo-doc-01")).toList();
      case DIRECCION, ADMIN -> Collections.unmodifiableList(LOCAL_REPORTS);
    };
  }

  public Reporte crear(Usuario u, JsonObject body) {
    if (u.rol() != Rol.ESTUDIANTE) {
      throw new ApiException(403, "Solo los estudiantes pueden crear reportes académicos");
    }

    String subjId = texto(body, "subjectId");
    Asignatura a = subjects.obtener(subjId);

    String detalle = texto(body, "detalle").trim();
    if (detalle.length() < MIN_LONGITUD) {
      throw new ApiException(400, "La descripción debe tener al menos " + MIN_LONGITUD + " caracteres (tiene " + detalle.length() + ")");
    }

    JsonObject moods = body.has("moods") && body.get("moods").isJsonObject()
        ? body.getAsJsonObject("moods") : new JsonObject();
    int mMet = mood(moods, "metodologia");
    int mCon = mood(moods, "contenido");
    int mRit = mood(moods, "ritmo");

    int[] valores = {mMet, mCon, mRit};
    int peor = 0;
    for (int i = 1; i < valores.length; i++) if (valores[i] < valores[peor]) peor = i;

    String titulo = extracto(detalle);
    Instant ahoraInst = Instant.now();
    String nuevoId = "rep-" + System.currentTimeMillis();

    Reporte nuevoReporte = new Reporte(
        nuevoId, u.uid(), u.nombre(), a.id(), a.nombre(), a.grupo(), a.profesorUid(),
        mMet, mCon, mRit, CATEGORIAS[peor], titulo, detalle, Estado.PENDIENTE,
        ahoraInst, ahoraInst
    );

    // Si Firebase Cloud está activo, persistir en Firestore
    if (Firebase.isCloudActive()) {
      try {
        Timestamp ahora = Timestamp.now();
        Map<String, Object> data = new HashMap<>();
        data.put("studentUid", u.uid());
        data.put("studentNombre", u.nombre());
        data.put("subjectId", a.id());
        data.put("subjectNombre", a.nombre());
        data.put("grupo", a.grupo());
        data.put("professorUid", a.profesorUid());
        data.put("moods", Map.of("metodologia", mMet, "contenido", mCon, "ritmo", mRit));
        data.put("categoria", CATEGORIAS[peor]);
        data.put("titulo", titulo);
        data.put("detalle", detalle);
        data.put("estado", Estado.PENDIENTE.name());
        data.put("historial", List.of(Map.of("estado", Estado.PENDIENTE.name(), "por", u.uid(), "fecha", ahora)));
        data.put("createdAt", ahora);
        data.put("updatedAt", ahora);

        DocumentReference ref = col().document();
        Firebase.await(ref.set(data));
        return Reporte.desde(Firebase.await(ref.get()));
      } catch (ApiException e) {
        throw e;
      } catch (Exception e) {}
    }

    // Persistencia local
    LOCAL_REPORTS.add(0, nuevoReporte);
    return nuevoReporte;
  }

  public Reporte cambiarEstado(Usuario u, String id, JsonObject body) {
    if (u.rol() != Rol.DOCENTE && u.rol() != Rol.ADMIN && u.rol() != Rol.DIRECCION) {
      throw new ApiException(403, "Solo los docentes o la dirección pueden cambiar el estado");
    }

    Estado nuevo = Estado.desdeCodigo(texto(body, "estado"));

    if (Firebase.isCloudActive()) {
      try {
        Firestore db = Firebase.db();
        DocumentReference ref = col().document(id);
        Firebase.await(db.runTransaction(tx -> {
          DocumentSnapshot d = tx.get(ref).get();
          if (!d.exists()) throw new ApiException(404, "El reporte no existe");
          if (u.rol() == Rol.DOCENTE && !u.uid().equals(d.getString("professorUid"))) {
            throw new ApiException(403, "Solo el docente a cargo de la asignatura puede cambiar este reporte");
          }
          Timestamp ahora = Timestamp.now();
          tx.update(ref, Map.of(
              "estado", nuevo.name(),
              "updatedAt", ahora,
              "historial", FieldValue.arrayUnion(Map.of("estado", nuevo.name(), "por", u.uid(), "fecha", ahora))));
          return null;
        }));
        return Reporte.desde(Firebase.await(ref.get()));
      } catch (ApiException e) {
        throw e;
      } catch (Exception e) {}
    }

    // Actualización local en memoria
    for (int i = 0; i < LOCAL_REPORTS.size(); i++) {
      Reporte r = LOCAL_REPORTS.get(i);
      if (r.id().equals(id)) {
        Reporte actualizado = new Reporte(
            r.id(), r.studentUid(), r.studentNombre(), r.subjectId(), r.subjectNombre(),
            r.grupo(), r.professorUid(), r.moodMetodologia(), r.moodContenido(), r.moodRitmo(),
            r.categoria(), r.titulo(), r.detalle(), nuevo, r.createdAt(), Instant.now()
        );
        LOCAL_REPORTS.set(i, actualizado);
        return actualizado;
      }
    }

    throw new ApiException(404, "Reporte no encontrado: " + id);
  }

  private static String texto(JsonObject o, String campo) {
    JsonElement e = o.get(campo);
    return e == null || e.isJsonNull() ? "" : e.getAsString();
  }

  private static int mood(JsonObject moods, String campo) {
    JsonElement e = moods.get(campo);
    if (e == null || e.isJsonNull()) return 2;
    try {
      int v = e.getAsInt();
      return Math.max(1, Math.min(3, v));
    } catch (Exception ex) {
      return 2;
    }
  }

  private static String extracto(String detalle) {
    String t = detalle.replaceAll("\\s+", " ").trim();
    return t.length() <= 65 ? t : t.substring(0, 65).replaceAll("\\s\\S*$", "") + "…";
  }
}
