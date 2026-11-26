---
id: 08-el-carrito
title: Misión 8 — El carrito de chivitos
start: COM-182
pickup: PRACA-10
pickup_objective: Busca la Libreta de Pedidos en PRACA-10
target: COM-14
objective: Llévale la libreta a Rayo en su carrito (COM-14)
give_item: libreta-pedidos
require_item: libreta-pedidos
delivery_prompt: Rayo necesita su libreta de pedidos. Elige el objeto:
wrong_item_message: Con eso no cobro ni un refresco.
---

## CUTSCENE_INICIO
left: byte
right: kernel
bg: Radio Santa Bruma

- Kernel: Rayo puso un carrito de chivitos en la Rambla, pero perdió la libreta de pedidos en la Plaza Independencia (PRACA-10).
- Byte: ¿Hace las cuentas a mano?
- Kernel: Hasta ahora sí. Llévale la libreta al garaje (COM-14) y ayúdalo con un programa.

## CUTSCENE_FIM
left: byte
right: rayo
bg: Carrito de chivitos de Rayo

- Rayo: ¡Mi libreta! Sin ella no sé cuánto cobrar.
- Byte: Acá está:
- ENTREGAR: libreta-pedidos
- Rayo: Hice un programa que pide el precio, pero cuando sumo me pone cualquier cosa. ¡Me dio 3501 en vez de 351!
- Byte: Porque input() siempre devuelve texto. Hay que convertirlo con int() antes de hacer cuentas.
- Rayo: Texto, número… para mí todo es plata.
- APE: mision-8
- Rayo: ¡Las cuentas dan! Te invito un chivito. Bueno, medio.
- Rayo: Tito anda diciendo que tiene una pista del apagón, pero está toda desordenada.
- Byte: Para ordenar textos tengo las funciones de Python. Voy al puerto.
