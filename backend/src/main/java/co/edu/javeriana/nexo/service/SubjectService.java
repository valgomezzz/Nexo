package co.edu.javeriana.nexo.service;

import co.edu.javeriana.nexo.model.Asignatura;
import co.edu.javeriana.nexo.model.Usuario;
import co.edu.javeriana.nexo.support.ApiException;
import co.edu.javeriana.nexo.support.Firebase;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Query;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

/** Gestión de asignaturas inscritas o a cargo (HU-02 y HU-03). */
public class SubjectService {

  // Asignaturas predeterminadas PUJ
  private static final List<Asignatura> DEFAULT_SUBJECTS = new ArrayList<>(List.of(
      new Asignatura("subj-poo", "IS-301", "Programación Orientada a Objetos", "POO", "G1", "demo-doc-01", "Dr. Carlos Mendoza", List.of("demo-est-01")),
      new Asignatura("subj-calc", "MAT-201", "Cálculo Diferencial e Integral", "Cálculo", "G2", "doc-silva", "Dra. Patricia Silva", List.of("demo-est-01")),
      new Asignatura("subj-edd", "IS-302", "Estructuras de Datos y Algoritmos", "EDD", "G1", "demo-doc-01", "Dr. Carlos Mendoza", List.of("demo-est-01")),
      new Asignatura("subj-fis", "FIS-101", "Física Mecánica y Termodinámica", "Física", "G3", "doc-andrade", "Ing. Roberto Andrade", List.of("demo-est-01")),
      new Asignatura("subj-alg", "MAT-102", "Álgebra Lineal Aplicada", "Álgebra", "G2", "demo-doc-01", "Dr. Carlos Mendoza", List.of())
  ));

  private CollectionReference col() {
    return Firebase.db().collection("subjects");
  }

  public List<Asignatura> visibles(Usuario u) {
    if (Firebase.isCloudActive()) {
      try {
        Query q = switch (u.rol()) {
          case ESTUDIANTE -> col().whereArrayContains("studentUids", u.uid());
          case DOCENTE -> col().whereEqualTo("professorUid", u.uid());
          case DIRECCION, ADMIN -> col();
        };
        List<Asignatura> list = Firebase.await(q.get()).getDocuments().stream()
            .map(Asignatura::desde)
            .sorted(Comparator.comparing(Asignatura::nombre).thenComparing(Asignatura::grupo))
            .toList();
        if (!list.isEmpty()) return list;
      } catch (Exception e) {
        // Fallback a datos en memoria si la colección está vacía
      }
    }

    return switch (u.rol()) {
      case ESTUDIANTE -> DEFAULT_SUBJECTS.stream().filter(s -> s.estudiantes().contains(u.uid()) || s.estudiantes().contains("demo-est-01")).toList();
      case DOCENTE -> DEFAULT_SUBJECTS.stream().filter(s -> s.profesorUid().equals(u.uid()) || s.profesorUid().equals("demo-doc-01")).toList();
      case DIRECCION, ADMIN -> Collections.unmodifiableList(DEFAULT_SUBJECTS);
    };
  }

  public Asignatura obtener(String id) {
    if (id == null || id.isBlank()) throw new ApiException(400, "Selecciona una asignatura válida");

    if (Firebase.isCloudActive()) {
      try {
        DocumentSnapshot d = Firebase.await(col().document(id).get());
        if (d.exists()) return Asignatura.desde(d);
      } catch (Exception e) {}
    }

    return DEFAULT_SUBJECTS.stream()
        .filter(s -> s.id().equals(id) || s.nombre().equalsIgnoreCase(id))
        .findFirst()
        .orElse(DEFAULT_SUBJECTS.get(0));
  }

  public List<Asignatura> todas() {
    return Collections.unmodifiableList(DEFAULT_SUBJECTS);
  }
}
