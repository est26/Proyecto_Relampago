const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
let pass=0, fail=0;
const sesiones={};

async function api(user, method, path, body){
  const h={'Content-Type':'application/json'};
  if(sesiones[user]) h.Cookie=sesiones[user];
  const r=await fetch(BASE+path,{method,headers:h,body:body?JSON.stringify(body):undefined});
  const sc=r.headers.get('set-cookie');
  if(sc) sesiones[user]=sc.split(';')[0];
  let j=null; try{ j=await r.json(); }catch{}
  return {status:r.status, body:j};
}
function check(nombre, cond, extra=''){
  if(cond){ pass++; console.log('  OK  ', nombre); }
  else { fail++; console.log('  FALLA', nombre, extra); }
}
const login=(u,email)=>api(u,'POST','/api/auth/login',{email,password:'demo1234'});

console.log('\n== Infraestructura ==');
let r=await api('x','GET','/api/ping');
check('GET /api/ping responde con la BD', r.status===200 && r.body.db===1, JSON.stringify(r.body));

console.log('\n== Autenticacion ==');
r=await login('po','ana@sprintcuc.cr');      check('login Product Owner', r.status===200, JSON.stringify(r.body));
r=await login('sm','marco@sprintcuc.cr');    check('login Scrum Master', r.status===200);
r=await login('dev','jose@sprintcuc.cr');    check('login Developer', r.status===200);
r=await api('x','POST','/api/auth/login',{email:'ana@sprintcuc.cr',password:'malaclave'});
check('contrasena incorrecta -> 401', r.status===401);
r=await api('anon','GET','/api/products/1'); check('sin sesion -> 401', r.status===401);

r=await api('po','GET','/api/auth/me');
check('/me trae los productos y el rol', r.status===200 && r.body.productos?.[0]?.rol==='PO');

console.log('\n== Producto y equipo ==');
r=await api('po','GET','/api/products/1');
check('detalle del producto', r.status===200 && r.body.equipo.length===4);
check('capacidad del equipo = 60 h (HU-011)', r.body.capacidad_equipo===60, 'fue '+r.body.capacidad_equipo);
check('Definition of Done cargado', r.body.dod.length===5);

console.log('\n== CRITERIO 1: permisos por responsabilidad Scrum ==');
r=await api('po','PUT','/api/backlog/orden/reorder',{product_id:1,items:[{id:12,orden:12},{id:13,orden:13}]});
check('PO SI puede ordenar el Product Backlog', r.status===200);
r=await api('sm','PUT','/api/backlog/orden/reorder',{product_id:1,items:[{id:12,orden:1}]});
check('SM NO puede ordenar el backlog -> 403', r.status===403, JSON.stringify(r.body));
r=await api('dev','PUT','/api/backlog/orden/reorder',{product_id:1,items:[{id:12,orden:1}]});
check('DEV NO puede ordenar el backlog -> 403', r.status===403);

r=await api('sm','PUT','/api/tasks/8/status',{estado:'progreso'});
check('SM NO puede mover tarjetas -> 403', r.status===403, JSON.stringify(r.body));
check('  el mensaje explica el porque en Scrum', /facilita/i.test(r.body?.detalle||''), r.body?.detalle);

r=await api('po','PUT','/api/tasks/8/status',{estado:'progreso'});
check('PO NO puede mover tarjetas -> 403', r.status===403);
r=await api('dev','PUT','/api/tasks/8/status',{estado:'progreso'});
check('DEV SI puede mover tarjetas', r.status===200, JSON.stringify(r.body));

r=await api('po','PUT','/api/backlog/20/points',{story_points:5});
check('PO NO puede estimar -> 403', r.status===403);
r=await api('dev','PUT','/api/backlog/20/points',{story_points:5});
check('DEV SI puede estimar', r.status===200);
r=await api('dev','PUT','/api/backlog/20/points',{story_points:7});
check('Story Points fuera de Fibonacci -> 400', r.status===400);

r=await api('dev','PUT','/api/tasks/8/assign',{});
check('DEV se auto-asigna la tarea (HU-063)', r.status===200 && r.body.asignado_a===3);

console.log('\n== CRITERIO 6: el DoD bloquea el cierre ==');
r=await api('dev','GET','/api/dod/item/8');
check('checklist: 3 de 5 criterios', r.body.cumplidos===3 && r.body.total===5, JSON.stringify(r.body?.cumplidos));
check('puede_cerrarse = false', r.body.puede_cerrarse===false);

r=await api('dev','PUT','/api/backlog/8/done');
check('cerrar sin cumplir el DoD -> 422', r.status===422, JSON.stringify(r.body));
check('  devuelve los criterios faltantes', Array.isArray(r.body?.faltantes) && r.body.faltantes.length===2, JSON.stringify(r.body?.faltantes));

await api('dev','PUT','/api/dod/check',{item_id:8,criterio_id:4,cumplido:true});
r=await api('dev','PUT','/api/dod/check',{item_id:8,criterio_id:5,cumplido:true});
check('tras marcar los 5 -> puede_cerrarse', r.body.puede_cerrarse===true);
r=await api('dev','PUT','/api/backlog/8/done');
check('ahora SI cierra la historia', r.status===200 && r.body.estado==='done');

console.log('\n== CRITERIO 3: Sprint y capacidad ==');
r=await api('dev','GET','/api/sprints/2');
check('detalle del Sprint activo', r.status===200 && r.body.numero===2);
check('  34 puntos comprometidos', r.body.puntos_comprometidos===34, 'fue '+r.body.puntos_comprometidos);
check('  capacidad 60 h visible (HU-057)', r.body.capacidad_horas===60);
r=await api('dev','GET','/api/sprints/2/capacity');
check('endpoint de capacidad', r.status===200 && r.body.capacidad_total===60);

r=await api('sm','POST','/api/sprints/2/items',{items:[20]});
check('SM NO puede armar el Sprint Backlog -> 403', r.status===403);
r=await api('dev','POST','/api/sprints/2/items',{items:[20]});
check('DEV SI arma el Sprint Backlog', r.status===201, JSON.stringify(r.body));
r=await api('po','POST','/api/backlog',{product_id:1,titulo:'Historia nueva sin estimar',epica:'Prueba'});
const sinEstimar=r.body.id;
check('PO crea historia (queda sin Story Points)', r.status===201 && r.body.story_points===null);
r=await api('dev','POST','/api/sprints/2/items',{items:[sinEstimar]});
check('comprometer historia sin estimar -> 422', r.status===422, JSON.stringify(r.body));
await api('dev','DELETE','/api/sprints/2/items/20');

console.log('\n== CRITERIO 5: Daily e impedimentos ==');
r=await api('dev','POST','/api/dailies',{sprint_id:2,avance:'Avance con el tablero',siguiente:'Sigo con el polling',impedimento_txt:'Falta acceso al repositorio de imagenes',prioridad:'alta'});
check('Daily registrado', r.status===201);
check('  impedimento creado desde el Daily (HU-077)', !!r.body.impedimento_creado);
r=await api('sm','GET','/api/impediments?sprint=2');
check('lista de impedimentos con antiguedad (HU-082)', r.status===200 && typeof r.body.impedimentos[0].horas_abierto==='number');
r=await api('sm','PUT','/api/impediments/1',{estado:'resuelto',responsable_id:2});
check('SM gestiona el impedimento', r.status===200 && r.body.resuelto_en!==null);
r=await api('dev','PUT','/api/impediments/2',{estado:'abierto'});
check('DEV NO gestiona impedimentos -> 403', r.status===403);
r=await api('sm','GET','/api/dailies?sprint=2');
check('resumen de Dailies + quien falta (HU-075/076)', r.status===200 && Array.isArray(r.body.sin_registrar_hoy));

console.log('\n== CRITERIO 7: Incremento, Review y Retrospective ==');
r=await api('po','GET','/api/increment?sprint=1');
check('Incremento del Sprint 1 (HU-093/094)', r.status===200 && r.body.historias.length===4);
check('  21 puntos entregados', r.body.puntos_entregados===21, 'fue '+r.body.puntos_entregados);
r=await api('po','GET','/api/review?sprint=1');
check('Review con aceptacion del PO', r.status===200 && r.body.aceptadas===4);
r=await api('dev','PUT','/api/review/1/item',{item_id:1,aceptada:false});
check('DEV NO acepta historias -> 403', r.status===403);
r=await api('po','PUT','/api/review/1/item',{item_id:1,aceptada:true,comentario:'Validado en la demo'});
check('PO SI acepta historias', r.status===200);
r=await api('po','GET','/api/retro?sprint=1');
check('Retrospectiva con acciones y responsables', r.status===200 && r.body.acciones.length===2 && r.body.acciones[0].responsable);
r=await api('po','POST','/api/retro/1/notes',{tipo:'accion',texto:'Sin responsable'});
check('accion sin responsable -> 422', r.status===422);
r=await api('po','GET','/api/retro/acciones?product=1');
check('seguimiento de acciones previas (HU-110)', r.status===200 && r.body.acciones.length>=2);

console.log('\n== CRITERIO 8: indicadores con datos reales ==');
r=await api('dev','GET','/api/metrics/burndown?sprint=2');
check('Burndown generado', r.status===200 && r.body.puntos.length>0);
check('  linea ideal desciende', r.body.puntos[0].ideal > r.body.puntos.at(-1).ideal);
check('  el futuro no se dibuja', r.body.puntos.at(-1).restante===null);
check('  restante calculado del historial', typeof r.body.restante_hoy==='number', 'restante='+r.body.restante_hoy);
r=await api('dev','GET','/api/metrics/velocity?product=1');
check('Velocity del Sprint 1 cerrado', r.status===200 && r.body.sprints.length===1);
check('  21 completados de 26 comprometidos', r.body.sprints[0].completados===21 && r.body.sprints[0].comprometidos===26, JSON.stringify(r.body.sprints[0]));
r=await api('dev','GET','/api/metrics/cumplimiento?sprint=2');
check('porcentaje de cumplimiento (HU-116)', r.status===200 && typeof r.body.porcentaje_puntos==='number');
r=await api('dev','GET','/api/metrics/cycletime?sprint=2');
check('Cycle Time desde el historial', r.status===200 && r.body.tareas.length>0);
r=await api('po','GET','/api/metrics/dashboard?product=1');
check('Dashboard completo (HU-120)', r.status===200 && r.body.sprint_actual && r.body.velocidad_promedio===21, JSON.stringify(r.body.velocidad_promedio));

console.log('\n== CRITERIO 4: tablero ==');
r=await api('dev','GET','/api/tasks?sprint=2');
check('tablero por columnas', r.status===200 && Object.keys(r.body.columnas).length===5);
check('  marca las tareas bloqueadas', typeof r.body.bloqueadas==='number');

console.log('\n== Cierre del Sprint ==');
r=await api('sm','PUT','/api/sprints/2/close');
check('cerrar sin Review/Retro -> 422', r.status===422, JSON.stringify(r.body?.faltantes));
await api('sm','POST','/api/review',{sprint_id:2,resultado:'Demo del reto'});
await api('sm','POST','/api/retro',{sprint_id:2});
r=await api('dev','PUT','/api/sprints/2/close');
check('DEV NO cierra el Sprint -> 403', r.status===403);
r=await api('sm','PUT','/api/sprints/2/close');
check('SM cierra el Sprint y devuelve lo no terminado', r.status===200 && Array.isArray(r.body.devueltas), JSON.stringify(r.body?.devueltas?.length));

console.log(`\n=========== ${pass} pruebas OK, ${fail} fallidas ===========`);
process.exit(fail?1:0);
