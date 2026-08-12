-- ============================================================
--  SprintCUC - Datos de prueba coherentes con un proyecto Scrum real
--  Carga:  psql "<EXTERNAL_DATABASE_URL>" -f database/seed.sql
--
--  Contiene:
--    Sprint 1 CERRADO  (con Review, Retrospective e Incremento)
--    Sprint 2 ACTIVO   (el que se usa en la demostracion)
--  El Sprint 1 cerrado es lo que permite que el Velocity Chart
--  tenga sentido: con un solo Sprint no hay velocidad historica.
--
--  Password de todos los usuarios: demo1234
-- ============================================================

TRUNCATE status_history, retro_notes, retros, review_feedback, review_items,
         reviews, increments, item_dod_checks, dod_criteria, impediments,
         dailies, tasks, sprint_items, sprints, backlog_items, products,
         team_members, teams, users RESTART IDENTITY CASCADE;

-- ---------- Usuarios ----------
INSERT INTO users (id, nombre, email, password_hash, especialidad, disponibilidad_horas) VALUES
 (1,'Ana Rodriguez','ana@sprintcuc.cr','$2b$10$6198Rn8jkCa0sXCryX1CKe8sDKTCoLaGheDLa.6llvD72Jg.nOsE6','Analisis de negocio',20),
 (2,'Marco Jimenez','marco@sprintcuc.cr','$2b$10$6198Rn8jkCa0sXCryX1CKe8sDKTCoLaGheDLa.6llvD72Jg.nOsE6','Facilitacion agil',20),
 (3,'Jose Hernandez','jose@sprintcuc.cr','$2b$10$6198Rn8jkCa0sXCryX1CKe8sDKTCoLaGheDLa.6llvD72Jg.nOsE6','Backend / Node',32),
 (4,'Lucia Vargas','lucia@sprintcuc.cr','$2b$10$6198Rn8jkCa0sXCryX1CKe8sDKTCoLaGheDLa.6llvD72Jg.nOsE6','Frontend / React',28);

-- ---------- Equipo Scrum ----------
INSERT INTO teams (id, nombre) VALUES (1,'Equipo Relampago');

INSERT INTO team_members (team_id, user_id, rol, capacidad_horas) VALUES
 (1,1,'PO',0),      -- el PO no aporta capacidad de desarrollo
 (1,2,'SM',0),
 (1,3,'DEV',32),
 (1,4,'DEV',28);    -- capacidad del equipo = 60 h

-- ---------- Producto ----------
INSERT INTO products (id, team_id, nombre, vision, product_goal, descripcion) VALUES
 (1,1,'SprintCUC',
  'Que cualquier equipo pueda ejecutar Scrum desde el celular sin perder rigor.',
  'Permitir que un Scrum Team ejecute y evidencie un Sprint completo desde el telefono, respetando las responsabilidades reales de cada rol.',
  'Aplicacion movil de gestion de proyectos de software bajo Scrum. Alcance del MVP: un flujo critico completo desde el Product Goal hasta la Retrospective, con indicadores calculados sobre datos reales.');

-- ---------- Definition of Done ----------
INSERT INTO dod_criteria (id, product_id, texto) VALUES
 (1,1,'Codigo desarrollado e integrado en la rama principal'),
 (2,1,'Criterios de aceptacion cumplidos y verificados'),
 (3,1,'Code Review realizado por otro Developer'),
 (4,1,'Pruebas funcionales aprobadas'),
 (5,1,'Documentacion / README actualizado');

-- ---------- Product Backlog ----------
INSERT INTO backlog_items
 (id, product_id, codigo, epica, titulo, como, quiero, para,
  criterios_aceptacion, prioridad_orden, story_points, valor_negocio, estado) VALUES

-- Sprint 1 (cerrado)
 (1,1,'HU-001','Usuarios y autenticacion','Registro e inicio de sesion',
  'usuario','registrarme e iniciar sesion de forma segura','participar en proyectos Scrum',
  E'- El correo debe ser unico\n- La contrasena se almacena con hash\n- Sesion invalida devuelve 401',
  1,5,5,'done'),
 (2,1,'HU-009','Equipo Scrum','Asignacion de responsabilidades',
  'administrador','asignar Product Owner, Scrum Master y Developers','que cada quien tenga sus permisos reales',
  E'- Un miembro tiene exactamente un rol por equipo\n- El rol determina lo que la API permite',
  2,3,5,'done'),
 (3,1,'HU-013','Producto','Crear producto con Product Goal',
  'Product Owner','crear un producto y definir su Product Goal','orientar el trabajo del Scrum Team',
  E'- El Product Goal es obligatorio\n- Solo el PO puede editarlo',
  3,5,5,'done'),
 (4,1,'HU-019','Product Backlog','CRUD de elementos del Product Backlog',
  'Product Owner','crear, editar y eliminar elementos del backlog','mantener el backlog vivo',
  E'- Solo el PO puede crear, editar o eliminar\n- Los Developers solo pueden estimar',
  4,8,5,'done'),
 (5,1,'HU-022','Product Backlog','Ordenar y priorizar el backlog',
  'Product Owner','ordenar los elementos segun valor y prioridad','que el equipo tome primero lo mas valioso',
  E'- El orden persiste\n- Solo el PO puede reordenar',
  5,5,4,'backlog'),   -- NO se termino en el Sprint 1: vuelve al Product Backlog

-- Sprint 2 (activo)
 (6,1,'HU-029','Historias de usuario','Historia con criterios de aceptacion',
  'Product Owner','documentar historias en formato Como/Quiero/Para con criterios','que el equipo sepa cuando esta terminada',
  E'- Formato Como/Quiero/Para\n- Criterios de aceptacion editables',
  6,5,5,'done'),
 (7,1,'HU-043','Estimacion agil','Estimacion en Story Points',
  'equipo de desarrollo','estimar historias usando Story Points','planificar con base en esfuerzo relativo',
  E'- Solo los Developers pueden estimar\n- Serie de Fibonacci',
  7,3,4,'done'),
 (8,1,'HU-049','Sprints','Crear Sprint con Sprint Goal',
  'Scrum Team','crear un Sprint y definir su Sprint Goal','tener un objetivo comun para el ciclo',
  E'- El Sprint Goal lo define todo el Scrum Team\n- Solo un Sprint activo a la vez',
  8,5,5,'en_progreso'),
 (9,1,'HU-058','Sprint Planning','Conformar el Sprint Backlog',
  'Developers','seleccionar los elementos que creemos poder completar','comprometernos con un alcance realista',
  E'- Solo los Developers seleccionan\n- Se muestra la capacidad disponible del equipo',
  9,8,5,'en_progreso'),
 (10,1,'HU-068','Tablero Scrum','Tablero con movimiento de tarjetas',
  'Developer','visualizar y mover el trabajo del Sprint','ver el progreso de inmediato',
  E'- Estados: pendiente, progreso, revision, pruebas, terminado\n- Solo los Developers mueven tarjetas',
  10,8,5,'sprint'),
 (11,1,'HU-074','Daily Scrum','Registro del Daily e impedimentos',
  'Developer','registrar mi actualizacion diaria y reportar impedimentos','que el equipo inspeccione y se adapte',
  E'- Un registro por persona y dia\n- Un impedimento se puede crear desde el Daily',
  11,5,4,'sprint'),

-- Product Backlog pendiente
 (12,1,'HU-084','Definition of Done','DoD verificable que bloquea el cierre',
  'Scrum Team','definir criterios que determinan cuando el trabajo esta terminado','proteger la calidad del incremento',
  E'- No se puede cerrar una historia con criterios sin marcar\n- El sistema indica cuales faltan',
  12,8,5,'backlog'),
 (13,1,'HU-099','Sprint Review','Review con aceptacion del Product Owner',
  'Product Owner','registrar la aceptacion del trabajo presentado','validar el incremento con evidencia',
  E'- Solo el PO acepta o rechaza\n- El feedback se puede convertir en backlog',
  13,5,5,'backlog'),
 (14,1,'HU-103','Retrospective','Retrospectiva con acciones y responsables',
  'Scrum Team','registrar que funciono, que mejorar y acciones concretas','mejorar de forma continua',
  E'- Cada accion tiene responsable y estado\n- Se pueden votar las propuestas',
  14,5,4,'backlog'),
 (15,1,'HU-112','Metricas agiles','Burndown y Velocity con datos reales',
  'Scrum Team','ver cuanto trabajo queda y cuanto rendimos por Sprint','inspeccionar y adaptar con evidencia',
  E'- Calculados desde el historial de estados\n- Nada de datos quemados',
  15,8,5,'backlog'),
 (16,1,'HU-120','Dashboard','Dashboard del proyecto',
  'miembro del equipo','ver el estado general del proyecto en una pantalla','saber donde estamos sin preguntar',
  E'- Sprint actual, meta, dias restantes, puntos y bloqueos',
  16,5,4,'backlog'),
 (17,1,'HU-080','Impedimentos','Seguimiento de impedimentos',
  'Scrum Master','asignar responsable y ver cuanto lleva abierto un impedimento','removerlos a tiempo',
  E'- Muestra antiguedad en horas\n- Estados: abierto, gestionando, resuelto, escalado',
  17,3,4,'backlog'),
 (18,1,'HU-093','Incremento','Registro del Incremento del Sprint',
  'equipo','documentar el incremento producido en cada Sprint','dar trazabilidad al resultado',
  E'- Lista las historias terminadas y sus puntos',
  18,3,3,'backlog'),
 (19,1,'HU-011','Equipo Scrum','Capacidad del equipo en el Planning',
  'Scrum Master','visualizar la capacidad disponible del equipo','planificar sin sobrecomprometer',
  E'- Suma las horas de los Developers\n- Compara con lo comprometido',
  19,5,3,'backlog'),
 (20,1,'HU-025','Product Backlog','Filtros del Product Backlog',
  'usuario','filtrar por estado, epica o texto','encontrar rapido lo que busco',
  E'- Filtro combinable\n- Sin recargar la pantalla',
  20,2,2,'backlog'),
 (21,1,'HU-101','Sprint Review','Exportar el Sprint Backlog a PDF',
  'Product Owner','exportar el Sprint Backlog','compartirlo con los stakeholders externos',
  E'- Generado desde el feedback del Review del Sprint 1',
  21,3,3,'backlog');

-- ---------- Sprints ----------
INSERT INTO sprints (id, product_id, numero, sprint_goal, fecha_inicio, fecha_fin, estado) VALUES
 (1,1,1,'Tener autenticacion con roles y un Product Backlog administrable por el Product Owner.',
      CURRENT_DATE - 24, CURRENT_DATE - 10, 'cerrado'),
 (2,1,2,'Permitir que los Developers planifiquen un Sprint y ejecuten el trabajo en el tablero.',
      CURRENT_DATE - 5,  CURRENT_DATE + 9,  'activo');

-- ---------- Sprint Backlog ----------
INSERT INTO sprint_items (sprint_id, item_id, puntos_comprometidos) VALUES
 (1,1,5),(1,2,3),(1,3,5),(1,4,8),(1,5,5),          -- 26 comprometidos, 21 completados
 (2,6,5),(2,7,3),(2,8,5),(2,9,8),(2,10,8),(2,11,5); -- 34 comprometidos

-- ---------- Tareas del Sprint activo ----------
INSERT INTO tasks (id, item_id, titulo, asignado_a, horas_estimadas, estado, bloqueada) VALUES
 (1, 6,'Modelo de datos de historias y criterios',        3, 4,'terminado', FALSE),
 (2, 6,'Formulario Como/Quiero/Para en movil',            4, 5,'terminado', FALSE),
 (3, 7,'Endpoint de estimacion restringido a Developers', 3, 3,'terminado', FALSE),
 (4, 8,'Endpoint de creacion de Sprint',                  3, 4,'terminado', FALSE),
 (5, 8,'Pantalla de Sprint Goal editable por el equipo',  4, 4,'progreso',  FALSE),
 (6, 9,'Seleccion de historias desde el Product Backlog', 4, 6,'revision',  FALSE),
 (7, 9,'Barra de capacidad del equipo en el Planning',    3, 5,'progreso',  TRUE),
 (8,10,'Tablero con dnd-kit y estados',                   4, 8,'pendiente', FALSE),
 (9,10,'Polling de 8 segundos para actualizacion',        3, 2,'pendiente', FALSE),
 (10,11,'Formulario del Daily con tres preguntas',        4, 4,'pendiente', FALSE);

-- ---------- Definition of Done aplicado ----------
-- Historias terminadas del Sprint 1: los 5 criterios cumplidos
INSERT INTO item_dod_checks (item_id, criterio_id, cumplido, verificado_por, fecha)
SELECT i, c, TRUE, 3, NOW() - INTERVAL '12 days'
FROM generate_series(1,4) i CROSS JOIN generate_series(1,5) c;

-- Historias terminadas del Sprint 2
INSERT INTO item_dod_checks (item_id, criterio_id, cumplido, verificado_por, fecha)
SELECT i, c, TRUE, 4, NOW() - INTERVAL '2 days'
FROM generate_series(6,7) i CROSS JOIN generate_series(1,5) c;

-- Historia 8: solo 3 de 5 criterios -> intentar cerrarla devuelve 422.
-- Este es el caso que se muestra en la demostracion.
INSERT INTO item_dod_checks (item_id, criterio_id, cumplido, verificado_por, fecha) VALUES
 (8,1,TRUE, 3, NOW() - INTERVAL '1 day'),
 (8,2,TRUE, 3, NOW() - INTERVAL '1 day'),
 (8,3,TRUE, 4, NOW() - INTERVAL '6 hours'),
 (8,4,FALSE,NULL,NULL),
 (8,5,FALSE,NULL,NULL);

-- ---------- Daily Scrum ----------
INSERT INTO dailies (id, sprint_id, user_id, fecha, avance, siguiente, impedimento_txt) VALUES
 (1,2,3,CURRENT_DATE - 2,'Termine el endpoint de creacion de Sprint.','Sigo con la barra de capacidad.',NULL),
 (2,2,4,CURRENT_DATE - 2,'Avance el formulario de historias.','Continuo con la seleccion de historias.',NULL),
 (3,2,3,CURRENT_DATE - 1,'Empece la barra de capacidad del Planning.','Terminarla y conectarla al Planning.','La base de Render corta conexiones bajo carga.'),
 (4,2,4,CURRENT_DATE - 1,'Seleccion de historias lista, pasa a revision.','Arranco el tablero con dnd-kit.',NULL),
 (5,2,3,CURRENT_DATE,'Sigo bloqueado con las conexiones a la base.','Limitar el pool a 5 conexiones.','Sigue el problema del pool.'),
 (6,2,4,CURRENT_DATE,'Revisando la seleccion de historias con Jose.','Montar las columnas del tablero.',NULL);

-- ---------- Impedimentos ----------
INSERT INTO impediments
 (id, sprint_id, daily_id, descripcion, prioridad, estado, reportado_por, responsable_id, creado_en, resuelto_en) VALUES
 (1,2,3,'La base de datos corta conexiones cuando hay varias peticiones simultaneas.',
   'alta','gestionando',3,2,NOW() - INTERVAL '30 hours',NULL),
 (2,2,NULL,'Falta acordar con el Product Owner el formato de los criterios de aceptacion.',
   'media','resuelto',4,2,NOW() - INTERVAL '4 days',NOW() - INTERVAL '3 days');

-- ---------- Incremento del Sprint 1 ----------
INSERT INTO increments (id, sprint_id, descripcion, version) VALUES
 (1,1,'Autenticacion con roles PO/SM/Developer, creacion de producto con Product Goal y Product Backlog administrable. 21 de 26 puntos comprometidos.','v0.1.0');

-- ---------- Sprint Review del Sprint 1 ----------
INSERT INTO reviews (id, sprint_id, resultado, fecha) VALUES
 (1,1,'Se presentaron 4 de 5 historias. El Product Owner acepto las cuatro. La priorizacion del backlog no se completo y regresa al Product Backlog.',
    NOW() - INTERVAL '10 days');

INSERT INTO review_items (review_id, item_id, aceptada, comentario) VALUES
 (1,1,TRUE, 'Cumple los criterios. El manejo de sesion invalida quedo claro.'),
 (1,2,TRUE, 'Los permisos por rol se validaron en la API, no solo en la interfaz.'),
 (1,3,TRUE, 'El Product Goal obligatorio fue una buena decision.'),
 (1,4,TRUE, 'Correcto. Falta el filtrado, pero no era parte de esta historia.'),
 (1,5,FALSE,'No se demostro el reordenamiento persistente. Regresa al Product Backlog.');

INSERT INTO review_feedback (id, review_id, autor, texto, item_generado_id) VALUES
 (1,1,'Profesor Roberto Soto','Seria util poder exportar el Sprint Backlog para compartirlo con personas externas al equipo.',21),
 (1+1,1,'Ana Rodriguez','La pantalla de backlog deberia mostrar el total de Story Points por estado.',NULL);

-- ---------- Retrospectiva del Sprint 1 ----------
INSERT INTO retros (id, sprint_id, fecha) VALUES (1,1,NOW() - INTERVAL '10 days');

INSERT INTO retro_notes (id, retro_id, tipo, texto, autor_id, responsable_id, estado, votos) VALUES
 (1,1,'bien','Definir los permisos en la API desde el inicio evito rehacer trabajo.',3,NULL,'pendiente',3),
 (2,1,'bien','Desplegar en la primera hora nos quito el miedo al despliegue final.',4,NULL,'pendiente',4),
 (3,1,'mejorar','Estimamos 26 puntos sin mirar la capacidad real del equipo.',3,NULL,'pendiente',4),
 (4,1,'mejorar','La historia de priorizacion se quedo a medias por falta de criterios claros.',1,NULL,'pendiente',2),
 (5,1,'accion','Mostrar la capacidad del equipo durante el Sprint Planning antes de comprometer.',2,3,'en_curso',5),
 (6,1,'accion','Revisar los criterios de aceptacion con el Product Owner antes de estimar.',2,4,'pendiente',3);

-- ============================================================
--  Historial de estados
--  Con fechas retroactivas para que el Burndown tenga una curva
--  real y el Velocity tenga dos Sprints que comparar.
-- ============================================================
INSERT INTO status_history (entidad, entidad_id, sprint_id, estado_anterior, estado_nuevo, story_points, user_id, creado_en) VALUES
 -- Sprint 1: 26 comprometidos, se cierran 21
 ('item',1,1,'backlog','sprint',      5,3,NOW() - INTERVAL '24 days'),
 ('item',2,1,'backlog','sprint',      3,3,NOW() - INTERVAL '24 days'),
 ('item',3,1,'backlog','sprint',      5,4,NOW() - INTERVAL '24 days'),
 ('item',4,1,'backlog','sprint',      8,4,NOW() - INTERVAL '24 days'),
 ('item',5,1,'backlog','sprint',      5,3,NOW() - INTERVAL '24 days'),
 ('item',1,1,'sprint','en_progreso',  5,3,NOW() - INTERVAL '23 days'),
 ('item',1,1,'en_progreso','done',    5,3,NOW() - INTERVAL '21 days'),
 ('item',2,1,'sprint','en_progreso',  3,3,NOW() - INTERVAL '21 days'),
 ('item',2,1,'en_progreso','done',    3,3,NOW() - INTERVAL '19 days'),
 ('item',3,1,'sprint','en_progreso',  5,4,NOW() - INTERVAL '19 days'),
 ('item',3,1,'en_progreso','done',    5,4,NOW() - INTERVAL '16 days'),
 ('item',4,1,'sprint','en_progreso',  8,4,NOW() - INTERVAL '16 days'),
 ('item',4,1,'en_progreso','done',    8,4,NOW() - INTERVAL '12 days'),
 ('item',5,1,'sprint','backlog',      5,2,NOW() - INTERVAL '10 days'),

 -- Sprint 2: 34 comprometidos, 8 cerrados hasta hoy
 ('item',6, 2,'backlog','sprint',     5,3,NOW() - INTERVAL '5 days'),
 ('item',7, 2,'backlog','sprint',     3,3,NOW() - INTERVAL '5 days'),
 ('item',8, 2,'backlog','sprint',     5,4,NOW() - INTERVAL '5 days'),
 ('item',9, 2,'backlog','sprint',     8,4,NOW() - INTERVAL '5 days'),
 ('item',10,2,'backlog','sprint',     8,3,NOW() - INTERVAL '5 days'),
 ('item',11,2,'backlog','sprint',     5,4,NOW() - INTERVAL '5 days'),
 ('item',6, 2,'sprint','en_progreso', 5,3,NOW() - INTERVAL '5 days'),
 ('item',6, 2,'en_progreso','done',   5,3,NOW() - INTERVAL '3 days'),
 ('item',7, 2,'sprint','en_progreso', 3,3,NOW() - INTERVAL '3 days'),
 ('item',7, 2,'en_progreso','done',   3,3,NOW() - INTERVAL '1 day'),
 ('item',8, 2,'sprint','en_progreso', 5,3,NOW() - INTERVAL '2 days'),
 ('item',9, 2,'sprint','en_progreso', 8,4,NOW() - INTERVAL '2 days'),

 -- Movimiento de tareas del Sprint 2 (base del Cycle Time)
 ('task',1,2,'pendiente','progreso',  0,3,NOW() - INTERVAL '5 days'),
 ('task',1,2,'progreso','terminado',  0,3,NOW() - INTERVAL '4 days'),
 ('task',2,2,'pendiente','progreso',  0,4,NOW() - INTERVAL '4 days'),
 ('task',2,2,'progreso','terminado',  0,4,NOW() - INTERVAL '3 days'),
 ('task',3,2,'pendiente','progreso',  0,3,NOW() - INTERVAL '3 days'),
 ('task',3,2,'progreso','terminado',  0,3,NOW() - INTERVAL '1 day'),
 ('task',4,2,'pendiente','progreso',  0,3,NOW() - INTERVAL '2 days'),
 ('task',4,2,'progreso','terminado',  0,3,NOW() - INTERVAL '1 day'),
 ('task',5,2,'pendiente','progreso',  0,4,NOW() - INTERVAL '1 day'),
 ('task',6,2,'pendiente','progreso',  0,4,NOW() - INTERVAL '2 days'),
 ('task',6,2,'progreso','revision',   0,4,NOW() - INTERVAL '6 hours'),
 ('task',7,2,'pendiente','progreso',  0,3,NOW() - INTERVAL '30 hours');

-- ---------- Sincronizar las secuencias tras insertar IDs explicitos ----------
SELECT setval('users_id_seq',          (SELECT MAX(id) FROM users));
SELECT setval('teams_id_seq',          (SELECT MAX(id) FROM teams));
SELECT setval('products_id_seq',       (SELECT MAX(id) FROM products));
SELECT setval('backlog_items_id_seq',  (SELECT MAX(id) FROM backlog_items));
SELECT setval('sprints_id_seq',        (SELECT MAX(id) FROM sprints));
SELECT setval('tasks_id_seq',          (SELECT MAX(id) FROM tasks));
SELECT setval('dailies_id_seq',        (SELECT MAX(id) FROM dailies));
SELECT setval('impediments_id_seq',    (SELECT MAX(id) FROM impediments));
SELECT setval('dod_criteria_id_seq',   (SELECT MAX(id) FROM dod_criteria));
SELECT setval('increments_id_seq',     (SELECT MAX(id) FROM increments));
SELECT setval('reviews_id_seq',        (SELECT MAX(id) FROM reviews));
SELECT setval('review_feedback_id_seq',(SELECT MAX(id) FROM review_feedback));
SELECT setval('retros_id_seq',         (SELECT MAX(id) FROM retros));
SELECT setval('retro_notes_id_seq',    (SELECT MAX(id) FROM retro_notes));
