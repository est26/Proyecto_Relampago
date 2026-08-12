# Backlog implementado — SprintCUC

Entregable exigido por el enunciado: *"listado de historias seleccionadas para el MVP y su estado"*.

Verificado contra el código, no contra el plan.

---

## Resumen

| Estado | Cantidad |
|---|:--:|
| ✅ **Completas** (API + interfaz + prueba) | **60** |
| 🟡 **Solo API** (endpoint funcional y probado, sin pantalla) | **14** |
| ⬜ Fuera de alcance | 76 |
| | **150** |

---

## ✅ Completas (60)

### Épica 1 — Usuarios y autenticación
| HU | Historia | Dónde |
|---|---|---|
| 002 | Inicio de sesión seguro | `/login` · JWT en cookie httpOnly |

### Épica 2 — Equipo Scrum
| HU | Historia | Dónde |
|---|---|---|
| 010 | Consultar quién forma el Scrum Team | `/equipo` |
| 011 | Capacidad disponible del equipo | `/equipo` y `/planning/:id` |

### Épica 4 — Product Backlog
| HU | Historia | Dónde |
|---|---|---|
| 019 | Crear elemento de backlog | `/backlog` · solo PO |
| 022 | **Ordenar y priorizar** por arrastre | `/backlog` · solo PO |
| 025 | Filtrar por estado | `/backlog` |
| 026 | Buscar historias | `/backlog` |

### Épica 5 — Historias de usuario
| HU | Historia | Dónde |
|---|---|---|
| 029 | Formato Como / Quiero / Para | `/backlog` y `/historia/:id` |
| 030 | Criterios de aceptación | `/historia/:id` |
| 031 | Establecer prioridad | vía el orden del backlog |

### Épica 7 — Estimación ágil
| HU | Historia | Dónde |
|---|---|---|
| 043 | Estimar en Story Points | `/backlog` · solo Developers |
| 048 | Registrar la estimación definitiva | idem · serie de Fibonacci validada |

### Épica 8 — Gestión de Sprints
| HU | Historia | Dónde |
|---|---|---|
| 049 | Crear Sprint | `/sprint` · solo SM |
| 050 | Fechas de inicio y fin | `/sprint` |
| 052 | **Sprint Goal** | `/sprint` y `/planning/:id` · todo el Scrum Team |
| 053 | Consultar Sprints actuales, futuros y cerrados | `/sprint` |
| 054 | Cerrar el Sprint | `/cierre` · exige Review y Retro |

### Épica 9 — Sprint Planning
| HU | Historia | Dónde |
|---|---|---|
| 057 | Consultar la capacidad disponible | `/planning/:id` |
| 058 | **Developers seleccionan el trabajo** | `/planning/:id` |
| 059 | Total de Story Points comprometidos | `/planning/:id` |
| 060 | Comparar con la velocidad histórica | `/planning/:id` · aviso si excede 25% |
| 061 | Generar el Sprint Backlog | `/planning/:id` |

### Épica 10 — Descomposición en tareas
| HU | Historia | Dónde |
|---|---|---|
| 062 | Crear tarea técnica | `/historia/:id` |
| 063 | **Asumir la tarea uno mismo** | `/tablero` |
| 064 | Estimar horas de la tarea | `/historia/:id` |

### Épica 11 — Tablero Scrum
| HU | Historia | Dónde |
|---|---|---|
| 068 | Tablero de 5 columnas | `/tablero` |
| 069 | Mover tarjetas | `/tablero` · arrastre o menú |
| 070 | Actualización inmediata | consulta cada 8 s |
| 072 | Marcar tarea bloqueada | `/tablero` |

### Épica 12 — Daily Scrum
| HU | Historia | Dónde |
|---|---|---|
| 074 | Registrar el Daily (tres preguntas) | `/daily` |
| 075 | Resumen de los Dailies del equipo | `/daily` |
| 076 | Detectar quién no registró | `/daily` |
| 077 | **Crear impedimento desde el Daily** | automático |

### Épica 13 — Gestión de impedimentos
| HU | Historia | Dónde |
|---|---|---|
| 078 | Reportar impedimento | `/impedimentos` · cualquiera |
| 079 | Definir criticidad | `/impedimentos` · solo SM |
| 080 | Asignar responsable del seguimiento | `/impedimentos` · solo SM |
| 081 | Estado: abierto / gestionando / resuelto | `/impedimentos` |
| 082 | Tiempo que lleva abierto | en horas, resaltado tras 24 h |
| 083 | Escalar fuera del equipo | `/impedimentos` · solo SM |

### Épica 14 — Definition of Done
| HU | Historia | Dónde |
|---|---|---|
| 084 | Definir el DoD | `/equipo` · todo el Scrum Team |
| 085 | Checklist por historia | `/historia/:id` · solo Developers |
| 086 | **Impedir el cierre incompleto** | responde 422 con lo que falta |

### Épica 16 — Incremento
| HU | Historia | Dónde |
|---|---|---|
| 093 | Registrar el Incremento | `/cierre` |
| 094 | Historias que lo componen | `/cierre` |

### Épica 17 — Sprint Review
| HU | Historia | Dónde |
|---|---|---|
| 097 | Convocar el Sprint Review | `/cierre` · solo SM |
| 099 | **Aceptar o rechazar historias** | `/cierre` · solo PO |
| 100 | Registrar retroalimentación | `/cierre` · incluye stakeholders |
| 101 | Convertir feedback en historia | `/cierre` · solo PO |

### Épica 18 — Sprint Retrospective
| HU | Historia | Dónde |
|---|---|---|
| 103 | Iniciar la retrospectiva | `/cierre` · solo SM |
| 104 | Qué funcionó bien | `/cierre` |
| 105 | Qué debemos mejorar | `/cierre` |
| 106 | Proponer acciones | `/cierre` |
| 107 | Votar propuestas | `/cierre` |
| 108 | Convertir mejoras en acciones | `/cierre` |
| 109 | Asignar responsable | obligatorio: sin él responde 422 |

### Épica 19 — Métricas ágiles
| HU | Historia | Dónde |
|---|---|---|
| 111 | Velocity Chart | `/metricas` |
| 112 | **Burndown Chart** | `/metricas` · desde `status_history` |
| 116 | Cumplimiento del Sprint | `/metricas` |
| 117 | Velocidad promedio | `/metricas` |

### Épica 20 — Dashboard
| HU | Historia | Dónde |
|---|---|---|
| 120 | Dashboard del proyecto | `/` |

---

## 🟡 Solo API (14)

El endpoint existe, funciona y está cubierto por las pruebas, **pero no hay pantalla que lo use**. Son demostrables por API, no desde la aplicación.

| HU | Historia | Endpoint |
|---|---|---|
| 001 | Registro de usuario | `POST /api/auth/register` |
| 004 | Perfil personal | `PUT /api/auth/me` |
| 006 | Disponibilidad del miembro | `PUT /api/auth/me` |
| 008 | Invitar miembros al equipo | `POST /api/products/:id/members` |
| 009 | Asignar responsabilidades PO/SM/DEV | `POST /api/products/:id/members` |
| 013 | Crear producto | `POST /api/products` |
| 015 | Editar el Product Goal | `PUT /api/products/:id/goal` |
| 020 | Editar elemento del backlog | `PUT /api/backlog/:id` |
| 021 | Eliminar elemento del backlog | `DELETE /api/backlog/:id` |
| 023 | Clasificar por épicas | campo `epica` + filtro en la API |
| 032 | Valor de negocio | campo `valor_negocio` |
| 102 | Registrar el resultado del Sprint | `PUT /api/review/:id/resultado` |
| 110 | Seguimiento de acciones anteriores | `GET /api/retro/acciones` |
| 114 | Cycle Time | `GET /api/metrics/cycletime` |

### Cuáles de estas afectan la calificación

| HU | Por qué importa | Riesgo |
|---|---|---|
| **013 + 015** | El alcance mínimo obligatorio exige *"Creación de producto con Product Goal"* | Alto |
| **008 + 009** | El alcance mínimo exige *"asignación de responsabilidades PO, SM y Developers"* | Alto |
| **020 + 021** | El criterio 2 pide, para *Excelente*, *"crear, **editar**, ordenar/priorizar"* | Alto |
| **102** | El criterio 7 menciona registrar el resultado del Review | Medio |
| 001 | El alcance pide *"autenticación o identificación básica"*: el login ya lo cumple | Bajo |
| 004, 006, 023, 032, 110, 114 | No aparecen en ningún criterio | Nulo |

> Cerrar las cuatro primeras filas requiere tres pantallas pequeñas: crear producto, gestionar el equipo, y editar/eliminar historia. La API ya existe y está probada; solo falta la interfaz.

---

## ⬜ Fuera de alcance (76)

Descartadas con un criterio único: **¿sin esta historia se puede ejecutar y evidenciar un Sprint completo?** Si la respuesta era sí, quedó fuera del Sprint 1.

| Épica | Historias | Motivo |
|---|---|---|
| 1, 2 | 003, 005, 012 | Recuperación de clave, notificaciones e historial de altas y bajas: no aparecen en la rúbrica |
| 3 | 014, 016, 017, 018 | Documentación adjunta y stakeholders. **Los adjuntos son inviables en Render: el disco es efímero** |
| 4 | 024, 027, 028 | Etiquetas, dependencias y releases |
| 5 | 033–036 | Riesgo, evidencias, dividir y relacionar historias |
| **6** | 037–042 | **Refinamiento del backlog**: valioso, pero no es requisito de ningún criterio |
| 7 | 044–047 | **Planning Poker**: descartado por decisión del equipo |
| 8, 9 | 051, 055, 056 | Duración fija del Sprint y sesión formal de planificación |
| 10 | 065, 066, 067 | Trabajo restante, subtareas y tareas técnicas invisibles |
| 11 | 071, 073 | Filtros del tablero y límites WIP |
| **15** | 087–092 | **Calidad y pruebas**: el DoD ya cubre la validación que exige la rúbrica |
| 16 | 095, 096 | Versionado del producto y release notes |
| 19 | 113, 115, 118, 119 | Burnup, Lead Time, análisis de impedimentos y defectos |
| 20 | 121, 122, 123 | Dashboards por rol: el general ya cubre el criterio 8 |
| **21** | 124–128 | **Colaboración**: comentarios, menciones, adjuntos, reacciones |
| **22** | 129–134 | **Notificaciones**: requieren infraestructura ajena al alcance |
| **23** | 135–140 | **Calendario Scrum** |
| **24** | 141–144 | **Gestión de releases** |
| **25** | 145–150 | **Administración y seguridad avanzada**: multiorganización, auditoría, respaldos |

### Frase para la defensa

> *"Descartamos 76 historias conscientemente. El criterio fue uno solo: si sin esa historia todavía se puede ejecutar y evidenciar un Sprint completo, salió del Sprint 1. Los adjuntos, además, tienen una razón técnica: el sistema de archivos de Render es efímero y los archivos se perderían en cada despliegue."*
