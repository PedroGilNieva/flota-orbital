# Flota Orbital

Batalla naval espacial para 2 a 4 personas. Cada piloto prepara cinco naves en su móvil. Una pantalla central opcional permite seguir la partida y ver cuántas naves quedan en cada flota.

## Jugar

1. Escribe tu apodo y crea una sala privada o busca partida pública. Comparte la invitación con tus amigos.
2. Elige una formación aleatoria o mueve tus cinco naves. Cada piloto confirma con **Flota lista**. El anfitrión puede iniciar con dos, tres o cuatro jugadores.
3. Selecciona una coordenada y confirma el disparo. Afecta a todos los rivales. Cualquier impacto nuevo conserva el turno. Un fallo lo pasa al siguiente piloto activo.
4. Cada nave destruida reduce el contador de su dueño. La última flota con naves gana. **Pantalla central** abre una vista de espectador con el radar compartido y el historial de impactos.

## Ejecutar en tu equipo

Con Node.js 24 o posterior, ejecuta `npm start` y abre `http://localhost:8080`. Los móviles en la misma red pueden entrar usando la dirección IP local de la computadora y el puerto 8080 si la red permite la conexión. Para invitar a otros dispositivos, abre la sala usando esa dirección antes de copiar la invitación.

El servidor guarda las partidas en SQLite dentro de `data/`. Puedes configurar `PORT` y `DATA_DIR`. La pestaña del piloto conserva su acceso cuando se recarga. Para jugar desde redes distintas, se necesita la dirección de una instalación en internet.

## Verificación y publicación

`npm test` comprueba las reglas multijugador y el emparejamiento. `npm run build` empaqueta la versión web alojada, que usa la misma lógica y una base D1 con la migración en `drizzle/`. La versión local funciona sin instalar paquetes adicionales.
