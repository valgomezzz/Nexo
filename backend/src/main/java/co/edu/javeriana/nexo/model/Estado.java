package co.edu.javeriana.nexo.model;

import co.edu.javeriana.nexo.support.ApiException;

/** Estados de un reporte académico (HU-03). */
public enum Estado {
  PENDIENTE("pend", "Pendiente"),
  EN_REVISION("rev", "En revisión"),
  ATENDIDO("ok", "Atendido");

  private final String codigo;
  private final String etiqueta;

  Estado(String codigo, String etiqueta) {
    this.codigo = codigo;
    this.etiqueta = etiqueta;
  }

  public String codigo() {
    return codigo;
  }

  public String etiqueta() {
    return etiqueta;
  }

  public static Estado desdeCodigo(String codigo) {
    if (codigo == null) throw new ApiException(400, "El estado no puede ser nulo");
    for (Estado e : values()) {
      if (e.codigo.equalsIgnoreCase(codigo) || e.name().equalsIgnoreCase(codigo)) return e;
    }
    throw new ApiException(400, "Estado inválido. Valores aceptados: pend (Pendiente), rev (En revisión), ok (Atendido)");
  }
}
