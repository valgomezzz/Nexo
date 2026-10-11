package co.edu.javeriana.nexo.service;

import co.edu.javeriana.nexo.model.Asignatura;
import co.edu.javeriana.nexo.model.Estado;
import co.edu.javeriana.nexo.model.Reporte;
import co.edu.javeriana.nexo.model.Rol;
import co.edu.javeriana.nexo.model.Usuario;
import co.edu.javeriana.nexo.support.ApiException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** HU-04: Métricas cuantitativas consolidadas y estadísticas pedagógicas. */
public class StatsService {

  private final ReportService reports;
  private final SubjectService subjects;

  public StatsService(ReportService reports, SubjectService subjects) {
    this.reports = reports;
    this.subjects = subjects;
  }

  public Map<String, Object> resumen(Usuario u, String subjectId, String categoria) {
    if (u.rol() == Rol.ESTUDIANTE) {
      throw new ApiException(403, "Las métricas consolidadas son exclusivas para docentes y dirección");
    }

    List<Reporte> todos = reports.visibles(u).stream()
        .filter(r -> vacio(subjectId) || "todos".equalsIgnoreCase(subjectId) || r.subjectId().equals(subjectId))
        .filter(r -> vacio(categoria) || "todos".equalsIgnoreCase(categoria) || r.categoria().equalsIgnoreCase(categoria))
        .toList();

    int total = todos.size();
    long pendientes = todos.stream().filter(r -> r.estado() == Estado.PENDIENTE).count();
    long enRevision = todos.stream().filter(r -> r.estado() == Estado.EN_REVISION).count();
    long atendidos = todos.stream().filter(r -> r.estado() == Estado.ATENDIDO).count();
    int tasaAtencion = total > 0 ? (int) Math.round((atendidos * 100.0) / total) : 0;

    Map<String, Object> out = new LinkedHashMap<>();
    out.put("total", total);
    out.put("pendientes", pendientes);
    out.put("enRevision", enRevision);
    out.put("atendidos", atendidos);
    out.put("tasaAtencion", tasaAtencion);
    out.put("sinReportes", total == 0);
    out.put("mensaje", total == 0 ? "Sin reportes registrados" : null);

    // Distribución por categoría
    List<Map<String, Object>> cats = new ArrayList<>();
    for (String c : new String[] {"Metodología", "Contenido", "Ritmo"}) {
      long n = todos.stream().filter(r -> c.equalsIgnoreCase(r.categoria())).count();
      int pct = total > 0 ? (int) Math.round((n * 100.0) / total) : 0;
      cats.add(Map.of("nombre", c, "total", n, "porcentaje", pct));
    }
    out.put("porCategoria", cats);

    return out;
  }

  private static boolean vacio(String s) {
    return s == null || s.isBlank();
  }
}
