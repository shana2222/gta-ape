---
id: 06-el-laboratorio
title: Misión 6 — El laboratorio de IA
start: COM-96
pickup: PRACA-07
pickup_objective: Busca el Pendrive de Datos en PRACA-07
target: CASA-84
objective: Llévale el pendrive a Pixel en el Laboratorio de la Colina (CASA-84)
give_item: pendrive-datos
require_item: pendrive-datos
delivery_prompt: Pixel necesita los datos. Elige el objeto:
wrong_item_message: Eso no tiene ni un dato. Busca el pendrive.
---

## CUTSCENE_INICIO
left: byte
right: chispa
bg: Taller de Chispa

- Chispa: NÚCLEO no solo seguía reglas: también tenía partes que aprendían solas, con inteligencia artificial.
- Byte: ¿Como el reconocimiento de caras del celular?
- Chispa: Algo así. El pendrive con sus datos está en la PRACA-07. Pixel te espera en CASA-84.

## CUTSCENE_FIM
left: byte
right: pixel
bg: Laboratorio de IA de la Colina

- Pixel: Hola, Byte. ¿Trajiste los datos?
- Byte: Acá están:
- ENTREGAR: pendrive-datos
- Pixel: La balanza inteligente de la feria reconocía frutas. Desde el apagón confunde manzanas con bananas.
- Byte: ¿Se olvidó de lo que aprendió?
- Pixel: Peor: alguien le cargó ejemplos mal etiquetados. Un modelo aprende de los datos que le das. Si los datos están mal…
- Byte: …el modelo aprende mal. Basura entra, basura sale.
- APE: mision-6
- Pixel: ¡Entrenado y probado! La feria va a estar feliz.
- Pixel: Encontré otra cosa en el pendrive: un programa en Python de NÚCLEO. Kernel, en la radio, lee Python mejor que nadie.
- Byte: Voy a la radio. Además, la ciudad necesita noticias.
