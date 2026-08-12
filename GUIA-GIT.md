# Guía de Git para el equipo

Repositorio: **https://github.com/JPablo-HM/proyecto-relampago**

---

## Parte 1 — Primera subida (solo José Pablo, una vez)

### Paso 0: instalar dependencias

Hágalo **antes** de los commits. Genera los `package-lock.json`, que fijan las versiones exactas y deben subirse al repositorio: sin ellos, Render puede instalar versiones distintas a las que ustedes probaron.

```powershell
npm install
npm install --prefix frontend
```

(`node_modules/` no se sube: ya está en `.gitignore`.)

### Paso 1: iniciar el repositorio

Desde la terminal de VS Code (`Ctrl + ñ`), en la carpeta del proyecto:

```powershell
git init
git branch -M main
git remote add origin https://github.com/JPablo-HM/proyecto-relampago.git
```

### Antes de nada: confirmar que `.env` NO se sube

El repositorio es **público**. Si sube el `.env`, expone la contraseña de la base de datos.

```powershell
git status
```

En la lista **no debe aparecer** `.env` ni `node_modules`. Si aparece `.env`, deténgase y avise.

### Commits por módulo, no uno solo

El criterio 11 de la rúbrica evalúa la evolución del trabajo. Un único commit gigante llamado "primer commit" se ve mal. Haga la subida inicial en varios commits con sentido:

```powershell
git add .gitignore .env.example package.json package-lock.json README.md GUIA-GIT.md
git commit -m "chore: estructura del proyecto, dependencias y documentacion"

git add database/
git commit -m "feat(bd): esquema PostgreSQL de 19 tablas y datos de prueba"

git add db.js middleware/ server.js
git commit -m "feat(api): servidor Express, pool de PostgreSQL y permisos por rol Scrum"

git add routes/
git commit -m "feat(api): 12 routers del flujo Scrum completo"

git add frontend/
git commit -m "feat(web): PWA movil en React con las 12 pantallas"

git add scripts/ render.yaml
git commit -m "chore(deploy): configuracion de Render y scripts de base de datos"

git add tests/ ESTADO-DEL-PROYECTO.md
git commit -m "test: 63 pruebas de extremo a extremo del flujo Scrum"
```

Súbalo:

```powershell
git push -u origin main
```

> Si GitHub rechaza el push porque el repositorio ya tenía un README creado desde la web:
> ```powershell
> git pull --rebase origin main
> git push -u origin main
> ```

---

## Parte 2 — Los otros dos integrantes

Cada uno, en su computadora:

```powershell
git clone https://github.com/JPablo-HM/proyecto-relampago.git
cd proyecto-relampago
npm install
npm install --prefix frontend
```

Después: copiar `.env.example` a `.env` y pegar la **External Database URL** de Render (José Pablo se las pasa **por mensaje privado, nunca por el repositorio**).

```powershell
npm run dev          # terminal 1
npm run dev:front    # terminal 2
```

---

## Parte 3 — Trabajo diario

**Cada quien en su rama.** Nadie trabaja directo en `main`.

```powershell
git checkout main
git pull                                  # traer lo último antes de empezar
git checkout -b feat/nombre-de-lo-que-hace
```

Trabaje, y haga commits **pequeños y frecuentes** (cada 30–60 minutos, no al final del día):

```powershell
git add .
git commit -m "feat(HU-022): ordenar el backlog con arrastre"
git push -u origin feat/nombre-de-lo-que-hace
```

En GitHub: **Compare & pull request** → que otro compañero lo revise → **Merge**.

Eso, además, deja evidencia de Code Review, que es uno de los criterios del Definition of Done del propio proyecto.

### Formato de los mensajes

```
tipo(alcance): que hace, en presente

feat(HU-069): mover tarjetas entre columnas del tablero
fix(HU-086): el DoD no bloqueaba cuando no habia criterios activos
docs: agregar credenciales de prueba al README
test: cubrir el cierre del Sprint sin Review
```

Tipos: `feat` (nueva funcionalidad), `fix` (corrección), `docs`, `test`, `chore`, `refactor`.

Referenciar la **HU** conecta cada commit con una historia del backlog. Es trazabilidad directa para los criterios 1 y 11.

---

## Reparto sugerido de módulos

Así cada quien defiende sus criterios en la evaluación:

| Integrante | Archivos | Criterios que defiende |
|---|---|---|
| **A** | `middleware/auth.js`, `routes/auth.js`, `products.js`, `backlog.js` · `pages/Backlog.jsx`, `Historia.jsx`, `Equipo.jsx` | 1 y 2 (27 pts) |
| **B** | `routes/sprints.js`, `tasks.js`, `dailies.js`, `impediments.js` · `pages/Sprint.jsx`, `Planning.jsx`, `Tablero.jsx`, `Daily.jsx`, `Impedimentos.jsx` | 3, 4 y 5 (30 pts) |
| **C** | `routes/dod.js`, `increment.js`, `review.js`, `retro.js`, `metrics.js` · `pages/Cierre.jsx`, `Metricas.jsx`, `Dashboard.jsx` · despliegue | 6, 7 y 8 (23 pts) |

> La rúbrica penaliza no poder explicar el código entregado. Cada quien debe entender sus archivos a fondo, no solo haberlos subido.

---

## Reglas que evitan problemas

| Regla | Por qué |
|---|---|
| **Nunca subir `.env`** | El repositorio es público; expondría la base de datos |
| **Sí subir `package-lock.json`** | Render instala exactamente las mismas versiones que ustedes |
| `git pull` antes de empezar | Evita conflictos al hacer merge |
| Commits pequeños y seguidos | Es la evidencia del criterio 11 |
| Nadie hace push directo a `main` | Todo entra por pull request revisado |

---

## Si algo sale mal

```powershell
git status                    # ver en qué estado está todo
git log --oneline --graph     # ver el historial

git restore <archivo>         # descartar cambios de un archivo
git reset HEAD~1              # deshacer el último commit (conserva los cambios)
git checkout main             # volver a la rama principal
```

**Si subió el `.env` por accidente:** avise de inmediato, cambie la contraseña de la base en Render y bórrela del historial. No basta con borrar el archivo en un commit nuevo: queda en el historial y el repositorio es público.
