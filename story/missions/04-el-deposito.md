---
id: 04-el-deposito
title: Misión 4 — El depósito del puerto
start: CASA-01
pickup: PRACA-13
pickup_objective: Busca la Caja de Periféricos en PRACA-13
target: CASA-181
objective: Llévale la caja a Tito en su depósito del puerto (CASA-181)
give_item: caja-perifericos
require_item: caja-perifericos
delivery_prompt: Tito quiere su caja. Elige el objeto:
wrong_item_message: No, no, no. Esa no es mi caja.
---

## CUTSCENE_INICIO
left: byte
right: vera
bg: Base de la Cuadrilla de Reinicio

- Vera: Con el apagón, a Tito se le cayó una caja de periféricos en la PRACA-13.
- Byte: ¿Periféricos? ¿Teclados, mouses…?
- Vera: Y parlantes, cables, de todo. Llévasela a su depósito, en CASA-181. Y escucha bien lo que te diga.

## CUTSCENE_FIM
left: byte
right: tito
bg: Depósito de Tito en el Puerto

- Tito: ¡Mi caja! Pensé que se la había llevado el viento. O la Cuadrilla.
- Byte: Acá está, completita:
- ENTREGAR: caja-perifericos
- Tito: Está todo mezclado. Si me ayudas a ordenarlo, te cuento un chisme del apagón.
- Byte: Trato hecho. Entrada, salida, entrada y salida… y también reviso las conexiones.
- Tito: Y la corriente, que acá todo chispea.
- APE: mision-4
- Tito: Ordenadito. Ahora el chisme: la noche del apagón vi a Chispa con un montón de LED en la mano.
- Byte: ¿Chispa? Voy a llevarle un kit nuevo. Quiero ver qué estaba armando.
