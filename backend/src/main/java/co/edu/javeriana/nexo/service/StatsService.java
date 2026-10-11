package co.edu.javeriana.nexo.service;

import co.edu.javeriana.nexo.model.Asignatura;
import co.edu.javeriana.nexo.model.Estado;
import co.edu.javeriana.nexo.model.Reporte;
import co.edu.javeriana.nexo.model.Rol;
import co.edu.javeriana.nexo.model.Usuario;
import co.edu.javeriana.nexo.support.ApiException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.ToIntFunction;

/** HU-04: métricas consolidadas, con filtros por asignatura y categoría. */
public class StatsService {

  private static final ZoneId BOGOTA = ZoneId.of("America/Bogota");
  /** Inicio del semestre para numerar las semanas (variable SEMESTER_START, formato AAAA-MM-DD). */
  private static final LocalDate INICIO_SEMESTRE =
      LocalDate.parse(System.getenv().getOrDefault("SEMESTER_START", "2026-07-27"));

  private final ReportService reports;
  private final SubjectService subjects;

  public StatsService(ReportService reports, SubjectService subjects) {
    this.reports = reports;
    this.subjects = subjects;
  }

  public Map<String, Object> resumen(Usuario u, String subjectId, String asignatura, String categoria) {
    if (u.rol() == Rol.ESTUDIANTE) throw new ApiException(403, "Las métricas son para docentes y dirección");

    List<Asignatura> asigs = subjects.visibles(u);
    List<Reporte> todos = reports.visibles(u).stream()
        .filter(r -> vacio(subjectId) || r.subjectId().equals(subjectId))
        .filter(r -> vacio(asignatura) || r.subjectNombre().equals(asignatura))
        .filter(r -> vacio(categoria) || r.categoria().equalsIgnoreCase(categoria))
        .toList();

    Map<String, Object> out = new LinkedHashMap<>();
    out.put("total", todos.size());
    out.put("pendientes", contar(todos, Estado.PENDIENTE));
    out.put("enRevision", contar(todos, Estado.EN_REVISION));
    out.put("atendidos", contar(todos, Estado.ATENDIDO));
    out.put("vacio", todos.isEmpty());
    out.put("mensaje", todos.isEmpty() ? "Sin reportes registrados" : null);

    // Distribución por categoría (porcentaje entero)
    List<Map<String, Object>> cats = new ArrayList<>();
    for (String c : new String[] {"Metodología", "Contenido", "Ritmo"}) {
      long n = todos.stream().filter(r -> c.equals(r.categoria())).count();
      cats.add(Map.of("nombre", c, "total", n,
          "porcentaje", todos.isEmpty() ? 0 : Math.round(n * 100.0 / todos.size())));
    }
    out.put("porCategoria", cats);

    // Valoración promedio de 1 a 5 (el mood se guarda de 0 a 4)
    out.put("valoraciones", List.of(
        valoracion("Metodología", todos, Reporte::moodMetodologia),
        valoracion("Contenido", todos, Reporte::moodContenido),
        valoracion("Ritmo", todos, Reporte::moodRitmo)));

    out.put("porSemana", porSemana(todos));
    out.put("porAsignatura", porAsignatura(asigs, todos));
    return out;
  }

  private static Map<String, Object> valoracion(String nombre, List<Reporte> rs, ToIntFunction<Reporte> f) {
    double prom = rs.stream().mapToInt(f).average().orElse(-1) + 1;
    return Map.of("nombre", nombre, "promedio", Math.round(prom * 10) / 10.0);
  }

  /** Las últimas 6 semanas del semestre hasta la actual. */
  private static List<Map<String, Object>> porSemana(List<Reporte> rs) {
    long actual = semana(LocalDate.now(BOGOTA));
    long desde = Math.max(1, actual - 5);
    List<Map<String, Object>> out = new ArrayList<>();
    for (long s = desde; s <= Math.max(actual, desde + 5); s++) {
      final long sem = s;
      long n = rs.stream().filter(r -> r.createdAt() != null
          && semana(r.createdAt().atZone(BOGOTA).toLocalDate()) == sem).count();
      out.add(Map.of("semana", "S" + s, "total", n));
    }
    return out;
  }

  private static long semana(LocalDate fecha) {
    return Math.max(1, ChronoUnit.DAYS.between(INICIO_SEMESTRE, fecha) / 7 + 1);
  }

  /** Agrupa por materia (nombre) y dentro de cada una por grupo, para el panel de dirección. */
  private static List<Map<String, Object>> porAsignatura(List<Asignatura> asigs, List<Reporte> rs) {
    Map<String, Map<String, Object>> materias = new LinkedHashMap<>();
    for (Asignatura a : asigs) {
      List<Reporte> delGrupo = rs.stream().filter(r -> r.subjectId().equals(a.id())).toList();
      Map<String, Object> m = materias.computeIfAbsent(a.nombre(), k -> {
        Map<String, Object> x = new LinkedHashMap<>();
        x.put("nombre", k);
        x.put("abreviatura", a.abreviatura());
        x.put("pendientes", 0L);
        x.put("enRevision", 0L);
        x.put("atendidos", 0L);
        x.put("grupos", new ArrayList<Map<String, Object>>());
        return x;
      });
      m.merge("pendientes", contar(delGrupo, Estado.PENDIENTE), (x, y) -> (Long) x + (Long) y);
      m.merge("enRevision", contar(delGrupo, Estado.EN_REVISION), (x, y) -> (Long) x + (Long) y);
      m.merge("atendidos", contar(delGrupo, Estado.ATENDIDO), (x, y) -> (Long) x + (Long) y);
      @SuppressWarnings("unchecked")
      List<Map<String, Object>> grupos = (List<Map<String, Object>>) m.get("grupos");
      Map<String, Object> g = new LinkedHashMap<>();
      g.put("subjectId", a.id());
      g.put("grupo", a.grupo());
      g.put("profesor", a.profesorNombre());
      g.put("total", delGrupo.size());
      g.put("pendientes", contar(delGrupo, Estado.PENDIENTE));
      grupos.add(g);
    }
    return new ArrayList<>(materias.values());
  }

  private static long contar(List<Reporte> rs, Estado e) {
    return rs.stream().filter(r -> r.estado() == e).count();
  }

  private static boolean vacio(String s) {
    return s == null || s.isBlank();
  }
}
