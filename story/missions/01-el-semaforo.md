---
id: 01-el-semaforo
title: Misión 1 — El semáforo loco
start: CASA-01
pickup: PRACA-04
pickup_objective: Busca el Control del Semáforo en PRACA-04
target: COM-14
objective: Llévale el control a Rayo en el Garaje Fénix (COM-14)
give_item: control-semaforo
require_item: control-semaforo
delivery_prompt: Rayo quiere revisar el control del semáforo. Elige el objeto:
wrong_item_message: Con eso no arreglo ni un semáforo de juguete.
---

## CUTSCENE_INICIO
left: byte
right: vera
bg: Base de la Cuadrilla de Reinicio

- Vera: Así que tú eres Byte. Me dijeron que estás haciendo tu APE.
- Byte: Sí. Tengo algunos temas de Computación pendientes. Quiero dejarlos aprendidos de verdad.
- Vera: Perfecto, porque Santa Bruma también tiene temas pendientes. Anoche hubo un apagón y NÚCLEO, el sistema central, se reinició sin memoria.
- Byte: ¿Y qué hay que hacer?
- Vera: Volver a enseñarle todo, paso a paso: semáforos, placas, sensores, la radio, la IA… Y de paso, tú repasas.
- OPCAO: ¿Por dónde empezamos? -> NEXT
- OPCAO: ¿Quién causó el apagón? -> NEXT
- Vera: Por lo más urgente: el semáforo de 18 de Julio se volvió loco y prende las tres luces juntas.
- Vera: La caja de control quedó tirada en la PRACA-04. Llévasela a Rayo, en el Garaje Fénix (COM-14).

## CUTSCENE_FIM
left: byte
right: rayo
bg: Garaje Fénix

- Rayo: ¡Byte! Casi choco tres veces viniendo. El semáforo está verde, rojo y amarillo al mismo tiempo.
- Byte: Traje la caja de control:
- ENTREGAR: control-semaforo
- Rayo: ¿Y esto cómo funciona por dentro?
- Byte: Como toda computadora: recibe una entrada, la procesa y da una salida.
- Rayo: Entrada, proceso, salida. Como yo con el mate: agua, espero, tomo.
- APE: mision-1
- Rayo: ¡Ahora cambia en orden! Primero verde, después amarillo, después rojo. Secuencia, ¿no?
- Byte: Y cuando alguien aprieta el botón del peatón, hay una condición.
- Rayo: Vera te espera en la base. Dice que encontró una placa rara.
