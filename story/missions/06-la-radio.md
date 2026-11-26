---
id: 06-la-radio
title: Misión 6 — Radio Santa Bruma
start: CASA-84
pickup: PRACA-08
pickup_objective: Busca el Guion de la Radio en PRACA-08
target: COM-182
objective: Llévale el guion a Kernel en Radio Santa Bruma (COM-182)
give_item: guion-radio
require_item: guion-radio
delivery_prompt: Kernel necesita el guion para salir al aire. Elige el objeto:
wrong_item_message: ¡Eso no se puede leer al aire!
---

## CUTSCENE_INICIO
left: byte
right: pixel
bg: Laboratorio de IA de la Colina

- Pixel: La radio vuelve a transmitir hoy, pero el guion se voló hasta la PRACA-08.
- Byte: Lo busco y se lo llevo a Kernel.
- Pixel: Radio Santa Bruma está en COM-182. ¡Que se escuche en toda la ciudad!

## CUTSCENE_FIM
left: byte
right: kernel
bg: Radio Santa Bruma

- Kernel: print("¡Hola, Byte!"). Perdón, hablo así desde que aprendí Python.
- Byte: Te traje el guion:
- ENTREGAR: guion-radio
- Kernel: La radio ahora la maneja un programa en Python. Para salir al aire hay que mostrar mensajes con print().
- Byte: ¿Y Python es difícil?
- Kernel: Es un lenguaje de programación: tiene reglas estrictas, pero se parece al inglés. Lo importante es entender los tipos de datos.
- APE: mision-6
- Kernel: print("¡Estamos al aire!"). Gracias, Byte.
- Kernel: El programa de NÚCLEO del pendrive usa variables e input(). Rayo tenía el mismo problema con su carrito.
- Byte: Voy al garaje. Igual tengo hambre.
