---
id: 02-el-semaforo
title: Misión 2 — El semáforo loco
start: COM-96
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
right: chispa
bg: Taller de Chispa

- Chispa: El semáforo de 18 de Julio se volvió loco: prende las tres luces juntas.
- Byte: Seguro que NÚCLEO perdió su algoritmo.
- Chispa: La caja de control quedó tirada en la PRACA-04. Llévasela a Rayo, en el Garaje Fénix (COM-14).
- OPCAO: ¿Rayo sabe de semáforos? -> NEXT
- OPCAO: Voy para allá. -> NEXT
- Chispa: Rayo sabe manejar. De semáforos sabe… que existen. Por eso vas tú.

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
- APE: mision-2
- Rayo: ¡Ahora cambia en orden! Primero verde, después amarillo, después rojo. Secuencia, ¿no?
- Byte: Y cuando alguien aprieta el botón del peatón, hay una condición.
- Rayo: Vera te espera en la base. Dice que encontró una placa rara.
