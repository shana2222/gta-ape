---
id: 10-el-reinicio
title: Misión 10 — El gran reinicio
start: CASA-181
pickup: PRACA-12
pickup_objective: Busca la Batería de NÚCLEO en PRACA-12
target: CASA-01
objective: Llévale la batería a Vera en la base (CASA-01)
give_item: bateria-nucleo
require_item: bateria-nucleo
delivery_prompt: Vera espera la batería. Elige el objeto:
wrong_item_message: Esa no es la batería de NÚCLEO.
---

## CUTSCENE_INICIO
left: byte
right: tito
bg: Depósito de Tito en el Puerto

- Tito: La batería de NÚCLEO está en la Plaza de la Bandera, en la PRACA-12.
- Byte: Si tiene el programa grabado, vamos a saber qué pasó.
- Tito: Llévasela a Vera, a la base. Y cuéntame el final, que me encantan los chismes.

## CUTSCENE_FIM
left: byte
right: vera
bg: Base de la Cuadrilla de Reinicio

- Vera: ¿La tienes?
- Byte: Acá está:
- ENTREGAR: bateria-nucleo
- Byte: Mira el programa grabado: if bateria > 20: apagar_todo(). ¡La condición está al revés!
- Vera: ¿Al revés?
- Byte: Tenía que apagar la ciudad cuando la batería estaba BAJA, menor a 20. Pero escribieron mayor. Con la batería llena, ¡apagó todo!
- Vera: ¿Y quién lo escribió?
- Chispa: …Yo. Lo programé apurada. Ejecuté el plan y me salteé la fase 4: revisar.
- Vera: Chispa. Gracias a ese error, Byte repasó todo el curso y la ciudad aprendió de nuevo.
- Byte: Arreglemos el if y, de paso, programemos la historia del apagón para los chicos de la escuela.
- APE: mision-10
- Vera: Santa Bruma vuelve a tener luz. Y tú, Byte, completaste tu APE.
- Byte: Lo mejor es que ahora lo sé explicar. Y siempre voy a revisar mi solución.
- Vera: Desde hoy eres parte oficial de la Cuadrilla de Reinicio. ¡Bienvenida!
