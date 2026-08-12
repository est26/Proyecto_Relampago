-- ============================================================
--  SprintCUC - Esquema PostgreSQL
--  Reto 24h - Gestion de proyectos bajo Scrum
--  Carga:  psql "<EXTERNAL_DATABASE_URL>" -f database/schema.sql
-- ============================================================

DROP TABLE IF EXISTS status_history, retro_notes, retros, review_feedback,
  review_items, reviews, increments, item_dod_checks, dod_criteria,
  impediments, dailies, tasks, sprint_items, sprints, backlog_items,
  products, team_members, teams, users CASCADE;

-- ------------------------------------------------------------
-- Epica 1: Usuarios
-- ------------------------------------------------------------
CREATE TABLE users (
  id                   SERIAL PRIMARY KEY,
  nombre               VARCHAR(120) NOT NULL,
  email                VARCHAR(160) UNIQUE NOT NULL,
  password_hash        VARCHAR(255) NOT NULL,
  especialidad         VARCHAR(120),
  disponibilidad_horas INT DEFAULT 8,          -- HU-006
  creado_en            TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Epica 2: Equipo Scrum
-- ------------------------------------------------------------
CREATE TABLE teams (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL
);

CREATE TABLE team_members (
  team_id         INT REFERENCES teams(id) ON DELETE CASCADE,
  user_id         INT REFERENCES users(id) ON DELETE CASCADE,
  rol             VARCHAR(3) NOT NULL CHECK (rol IN ('PO','SM','DEV')),  -- HU-009
  capacidad_horas INT DEFAULT 0,                                          -- HU-011
  PRIMARY KEY (team_id, user_id)
);

-- ------------------------------------------------------------
-- Epica 3: Producto
-- ------------------------------------------------------------
CREATE TABLE products (
  id           SERIAL PRIMARY KEY,
  team_id      INT REFERENCES teams(id) ON DELETE CASCADE,
  nombre       VARCHAR(160) NOT NULL,
  vision       TEXT,
  product_goal TEXT NOT NULL,          -- HU-015: obligatorio por diseno
  descripcion  TEXT,
  creado_en    TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Epicas 4, 5 y 7: Product Backlog, historias y estimacion
-- ------------------------------------------------------------
CREATE TABLE backlog_items (
  id                   SERIAL PRIMARY KEY,
  product_id           INT REFERENCES products(id) ON DELETE CASCADE,
  codigo               VARCHAR(20),
  epica                VARCHAR(120),                 -- HU-023
  titulo               VARCHAR(200) NOT NULL,
  como                 TEXT,                         -- HU-029
  quiero               TEXT,
  para                 TEXT,
  criterios_aceptacion TEXT,                         -- HU-030
  prioridad_orden      INT NOT NULL DEFAULT 0,       -- HU-022  (solo PO)
  story_points         INT,                          -- HU-043/048 (solo DEV)
  valor_negocio        SMALLINT,                     -- HU-032
  estado               VARCHAR(15) NOT NULL DEFAULT 'backlog'
                       CHECK (estado IN ('backlog','sprint','en_progreso','done')),
  creado_en            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_backlog_orden  ON backlog_items (product_id, prioridad_orden);
CREATE INDEX idx_backlog_estado ON backlog_items (product_id, estado);

-- ------------------------------------------------------------
-- Epicas 8 y 9: Sprints y Sprint Planning
-- ------------------------------------------------------------
CREATE TABLE sprints (
  id           SERIAL PRIMARY KEY,
  product_id   INT REFERENCES products(id) ON DELETE CASCADE,
  numero       INT NOT NULL,
  sprint_goal  TEXT NOT NULL,                        -- HU-052
  fecha_inicio DATE NOT NULL,                        -- HU-050
  fecha_fin    DATE NOT NULL,
  estado       VARCHAR(12) NOT NULL DEFAULT 'planificado'
               CHECK (estado IN ('planificado','activo','cerrado')),
  UNIQUE (product_id, numero)
);

CREATE TABLE sprint_items (                          -- HU-058/061: Sprint Backlog
  sprint_id            INT REFERENCES sprints(id) ON DELETE CASCADE,
  item_id              INT REFERENCES backlog_items(id) ON DELETE CASCADE,
  puntos_comprometidos INT DEFAULT 0,
  PRIMARY KEY (sprint_id, item_id)
);

-- ------------------------------------------------------------
-- Epicas 10 y 11: Tareas y tablero
-- ------------------------------------------------------------
CREATE TABLE tasks (
  id              SERIAL PRIMARY KEY,
  item_id         INT REFERENCES backlog_items(id) ON DELETE CASCADE,
  titulo          VARCHAR(200) NOT NULL,             -- HU-062
  asignado_a      INT REFERENCES users(id) ON DELETE SET NULL,  -- HU-063
  horas_estimadas NUMERIC(5,1) DEFAULT 0,            -- HU-064
  estado          VARCHAR(12) NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente','progreso','revision','pruebas','terminado')),
  bloqueada       BOOLEAN DEFAULT FALSE,             -- HU-072
  creado_en       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_tasks_item ON tasks (item_id);

-- ------------------------------------------------------------
-- Epicas 12 y 13: Daily Scrum e impedimentos
-- ------------------------------------------------------------
CREATE TABLE dailies (
  id              SERIAL PRIMARY KEY,
  sprint_id       INT REFERENCES sprints(id) ON DELETE CASCADE,
  user_id         INT REFERENCES users(id) ON DELETE CASCADE,
  fecha           DATE NOT NULL,
  avance          TEXT,                              -- HU-074
  siguiente       TEXT,
  impedimento_txt TEXT,
  creado_en       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (sprint_id, user_id, fecha)
);

CREATE TABLE impediments (
  id             SERIAL PRIMARY KEY,
  sprint_id      INT REFERENCES sprints(id) ON DELETE CASCADE,
  daily_id       INT REFERENCES dailies(id) ON DELETE SET NULL,  -- HU-077
  descripcion    TEXT NOT NULL,                                  -- HU-078
  prioridad      VARCHAR(8) NOT NULL DEFAULT 'media'
                 CHECK (prioridad IN ('baja','media','alta','critica')),  -- HU-079
  estado         VARCHAR(12) NOT NULL DEFAULT 'abierto'
                 CHECK (estado IN ('abierto','gestionando','resuelto','escalado')), -- HU-081
  reportado_por  INT REFERENCES users(id) ON DELETE SET NULL,
  responsable_id INT REFERENCES users(id) ON DELETE SET NULL,     -- HU-080
  creado_en      TIMESTAMPTZ DEFAULT NOW(),
  resuelto_en    TIMESTAMPTZ                                      -- HU-082
);

-- ------------------------------------------------------------
-- Epica 14: Definition of Done
-- ------------------------------------------------------------
CREATE TABLE dod_criteria (
  id         SERIAL PRIMARY KEY,
  product_id INT REFERENCES products(id) ON DELETE CASCADE,
  texto      VARCHAR(255) NOT NULL,                  -- HU-084
  activo     BOOLEAN DEFAULT TRUE
);

CREATE TABLE item_dod_checks (                       -- HU-085
  item_id        INT REFERENCES backlog_items(id) ON DELETE CASCADE,
  criterio_id    INT REFERENCES dod_criteria(id) ON DELETE CASCADE,
  cumplido       BOOLEAN DEFAULT FALSE,
  verificado_por INT REFERENCES users(id) ON DELETE SET NULL,
  fecha          TIMESTAMPTZ,
  PRIMARY KEY (item_id, criterio_id)
);

-- ------------------------------------------------------------
-- Epica 16: Incremento
-- ------------------------------------------------------------
CREATE TABLE increments (                            -- HU-093/094
  id          SERIAL PRIMARY KEY,
  sprint_id   INT UNIQUE REFERENCES sprints(id) ON DELETE CASCADE,
  descripcion TEXT,
  version     VARCHAR(20),
  creado_en   TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Epica 17: Sprint Review
-- ------------------------------------------------------------
CREATE TABLE reviews (
  id        SERIAL PRIMARY KEY,
  sprint_id INT UNIQUE REFERENCES sprints(id) ON DELETE CASCADE,
  resultado TEXT,                                    -- HU-102
  fecha     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE review_items (                          -- HU-099: el PO acepta
  review_id  INT REFERENCES reviews(id) ON DELETE CASCADE,
  item_id    INT REFERENCES backlog_items(id) ON DELETE CASCADE,
  aceptada   BOOLEAN DEFAULT FALSE,
  comentario TEXT,
  PRIMARY KEY (review_id, item_id)
);

CREATE TABLE review_feedback (                       -- HU-100
  id               SERIAL PRIMARY KEY,
  review_id        INT REFERENCES reviews(id) ON DELETE CASCADE,
  autor            VARCHAR(120),
  texto            TEXT NOT NULL,
  item_generado_id INT REFERENCES backlog_items(id) ON DELETE SET NULL  -- HU-101
);

-- ------------------------------------------------------------
-- Epica 18: Sprint Retrospective
-- ------------------------------------------------------------
CREATE TABLE retros (
  id        SERIAL PRIMARY KEY,
  sprint_id INT UNIQUE REFERENCES sprints(id) ON DELETE CASCADE,
  fecha     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE retro_notes (
  id             SERIAL PRIMARY KEY,
  retro_id       INT REFERENCES retros(id) ON DELETE CASCADE,
  tipo           VARCHAR(8) NOT NULL CHECK (tipo IN ('bien','mejorar','accion')),
  texto          TEXT NOT NULL,                      -- HU-104/105/106
  autor_id       INT REFERENCES users(id) ON DELETE SET NULL,
  responsable_id INT REFERENCES users(id) ON DELETE SET NULL,  -- HU-109
  estado         VARCHAR(10) NOT NULL DEFAULT 'pendiente'
                 CHECK (estado IN ('pendiente','en_curso','hecha')),
  votos          INT DEFAULT 0
);

-- ------------------------------------------------------------
-- Historial de estados: base de Burndown, Cycle Time y auditoria
-- Todo endpoint que cambie un estado escribe aqui. Sin excepcion.
-- ------------------------------------------------------------
CREATE TABLE status_history (
  id              SERIAL PRIMARY KEY,
  entidad         VARCHAR(10) NOT NULL CHECK (entidad IN ('item','task')),
  entidad_id      INT NOT NULL,
  sprint_id       INT REFERENCES sprints(id) ON DELETE CASCADE,
  estado_anterior VARCHAR(30),
  estado_nuevo    VARCHAR(30) NOT NULL,
  story_points    INT DEFAULT 0,
  user_id         INT REFERENCES users(id) ON DELETE SET NULL,
  creado_en       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sh_sprint ON status_history (sprint_id, creado_en);
CREATE INDEX idx_sh_entidad ON status_history (entidad, entidad_id);
