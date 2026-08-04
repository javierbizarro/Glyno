# Historial de mejoras

Qué ha cambiado en Glyno, de lo más nuevo a lo más viejo. La versión que llevas se ve en
Ajustes → «Acerca de Glyno».

## 0.3.0 — 4 de agosto de 2026

### Añadido

- **Recordatorio de medicación semanal** (Ozempic, Trulicity y compañía): en el botiquín puedes
  marcar qué día te toca, y ese día aparece en Hoy la tarjeta «Hoy toca…» con un botón para
  apuntarlo en un toque. La pauta se ve también en Ajustes y en el informe médico.
- Glyno (la IA) ahora sabe qué es cada fármaco de tu botiquín — insulina basal, rápida o
  medicación no insulínica — y su pauta semanal si la tiene.

### Corregido

- En iPhone (y con el teclado abierto) el último mensaje del chat quedaba pegado o tapado por la
  caja de escribir.
- El paseo tras la cena también se sugiere pasada la medianoche: la ventana es de digestión, no
  de calendario.
- Con el diario vacío, la IA ya no recibe porcentajes inventados («0 % en rango» sin ninguna
  medición).
- Ajustes internos de reloj: el momento sugerido de la glucemia y la tarjeta de movimiento
  calculan sus ventanas respecto al instante correcto.

## 0.2.0 — 3 y 4 de agosto de 2026

### Añadido

- **Informe médico imprimible** (14/30/90 días): métricas con HbA1c estimada orientativa, tabla
  día×momento coloreada, tensión, peso y patrones. Pensado para llevarlo al endocrino.
- **Historial navegable por semanas**, con media, tiempo en rango y el día a día completo.
- **Recomendaciones de qué comer** según la hora, tu última glucemia y los platos que ya
  apuntaste (tu diario hace de despensa), con salvaguarda si vienes de una hipoglucemia.
- **Análisis de comida más completo**: fibra, calorías orientativas y grado de procesamiento.
  El semáforo valora la glucosa y la calidad, nunca las calorías.
- **Tarjeta de movimiento** en Hoy: sugerencias según glucemia y comidas, sin calorías, sin
  rachas y sin culpa.
- **Modo sin diagnóstico**: rangos de referencia de persona sana, onboarding más corto y sin
  HbA1c estimada.
- **Perfil glucémico clásico de 7 puntos** (ayunas, antes/después de cada comida, al dormir),
  con el momento pre-marcado según la hora.
- **Medicación no insulínica** bien recogida (pastillas e inyectables tipo Ozempic), con
  ejemplos en los formularios del botiquín.
- **Registro en un toque**: chips con tus comidas, dosis y ejercicios habituales.
- **Borrar un registro** (con confirmación), por si el dedo mete 999 donde no era.
- **Tour de bienvenida** de 6 pasos, saltable y repetible desde Ajustes.
- **Compartir Glyno** desde Ajustes, con la hoja nativa del móvil.
- **Rediseño del personaje**: el corazón con corona, bracitos y globos — sobre el dibujo en
  papel de la hija de Javier, que firma el diseño.
- Contador anónimo de aperturas con servicio propio (sin cookies ni identificadores; respeta
  «No rastrear» y GPC). Es la única telemetría admitida y está documentada en el README.
- Batería de tests automáticos que corre antes de cada commit y en cada despliegue.
- Documentación pública: README, guía de colaboración y condiciones de uso.

### Corregido

- El chat se ancla abajo como un chat de verdad, con el aviso legal como nota de cabecera.
- La foto del plato tiene en cuenta tu rango, tu última glucemia y la hipertensión (avisa de la
  sal), con salvaguarda en hipoglucemia.
- Las tendencias se dibujan desde la primera medición, avisando cuando los porcentajes aún
  bailan.
- El teclado del móvil ya no tapa las hojas de registro.
- El onboarding no preselecciona respuestas que no diste.
- «Borrar todo» funcionaba mal en la versión instalada desde GitHub Pages (ruta del reset).
- El sello de compilación de «Acerca de Glyno» sale en hora española.

## 0.1.0 — 2 de agosto de 2026

- Primera versión: onboarding por perfiles, diario de Hoy (glucemia, tensión, comida, insulina
  rápida, ejercicio, peso y contexto), tendencias de 14 días con patrones, Glyno 3D, valoración
  quincenal y chat con IA (Gemini con tu propia clave), copia de seguridad JSON con
  restauración, export CSV e instalación como app (PWA) servida desde GitHub Pages.
