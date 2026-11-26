---
id: 02-la-placa
title: Misión 2 — La placa que habla
start: COM-14
pickup: PRACA-06
pickup_objective: Busca la placa micro:bit en PRACA-06
target: CASA-01
objective: Llévale la micro:bit a Vera en la base (CASA-01)
give_item: microbit
require_item: microbit
delivery_prompt: Vera quiere ver la placa. Elige el objeto:
wrong_item_message: Eso no tiene ni un LED.
---

## CUTSCENE_INICIO
left: byte
right: rayo
bg: Garaje Fénix

- Rayo: Mientras arreglabas el semáforo, vi algo brillando en la PRACA-06. Una placa con lucecitas.
- Byte: ¿Lucecitas? ¿Veinticinco?
- Rayo: No las conté. Yo no cuento nada. Llévasela a Vera, que está en la base.

## CUTSCENE_FIM
left: byte
right: vera
bg: Base de la Cuadrilla de Reinicio

- Vera: ¿Qué encontraste?
- Byte: Una micro:bit:
- ENTREGAR: microbit
- Vera: NÚCLEO usaba cientos de estas en la ciudad: en las paradas, en las plazas, en los faroles.
- Byte: Es una placa programable. Tiene entradas, como los botones y los sensores, y salidas, como la matriz de LED.
- Vera: Enséñale a NÚCLEO a usarla de nuevo. Primero mira cómo funciona.
- APE: mision-2
- Vera: La flecha quedó perfecta. Ya sé cómo vamos a señalizar el puerto.
- Byte: Hablando de puerto… ¿quién guarda todos los equipos viejos de la ciudad?
- Vera: Tito. Y Tito siempre sabe algo más. Ve con cuidado.
