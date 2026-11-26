---
id: 04-el-farol
title: Misión 4 — El farol de la plaza
start: CASA-181
pickup: PRACA-16
pickup_objective: Busca el Kit de LED en PRACA-16
target: COM-96
objective: Llévale el kit a Chispa en su taller (COM-96)
give_item: kit-led
require_item: kit-led
delivery_prompt: Chispa necesita el kit. Elige el objeto:
wrong_item_message: Eso no prende ni con fe.
---

## CUTSCENE_INICIO
left: byte
right: tito
bg: Depósito de Tito en el Puerto

- Tito: Si vas a ver a Chispa, llévale algo útil. Hay un kit de Ceibal con LED, resistencias y sensores en la PRACA-16.
- Byte: ¿Y por qué está en una plaza?
- Tito: En esta ciudad todo termina en una plaza. Su taller es COM-96.

## CUTSCENE_FIM
left: byte
right: chispa
bg: Taller de Chispa

- Chispa: ¡Un kit nuevo! Los LED de anoche se me quemaron todos: los conecté sin resistencia.
- Byte: Tito me contó. Toma:
- ENTREGAR: kit-led
- Chispa: Y Tito quiere una alarma con el sensor de contacto, pero le conecté VCC y GND al revés. ¡Puf! Humo.
- Byte: El LED rojo lleva una resistencia de 100 Ω: pata larga al pin, corta a GND. Y el sensor: VCC a 3V, GND a GND y OUT a un pin.
- Chispa: ¿Me ayudas a conectarlo bien? Primero en el simulador, como en Tinkercad.
- APE: mision-4
- Chispa: ¡La alarma anda y el estacionamiento avisa cuando llega un auto! Ahora entiendo para qué sirve la tierra.
- Byte: Pero quemar unos LED no apaga una ciudad entera. El apagón fue otra cosa.
- Chispa: Pixel, en el laboratorio de la colina, revisa los datos de NÚCLEO. Llévale el pendrive que está en la PRACA-07.
