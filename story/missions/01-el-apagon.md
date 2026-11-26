---
id: 01-el-apagon
title: Misión 1 — El apagón
start: CASA-01
pickup: PRACA-01
pickup_objective: Busca el Cuaderno de Polya en PRACA-01
target: COM-96
objective: Llévale el cuaderno a Chispa en su taller (COM-96)
give_item: cuaderno-polya
require_item: cuaderno-polya
delivery_prompt: Chispa necesita el cuaderno para empezar. Elige el objeto:
wrong_item_message: Eso no es el cuaderno. El cuaderno tiene cuatro pestañas de colores.
---

## CUTSCENE_INICIO
left: byte
right: vera
bg: Base de la Cuadrilla de Reinicio

- Vera: Así que tú eres Byte. Me dijeron que estás haciendo tu APE.
- Byte: Sí. Tengo algunos temas de Computación pendientes. Quiero dejarlos aprendidos de verdad.
- Vera: Perfecto, porque Santa Bruma también tiene temas pendientes. Anoche hubo un apagón y NÚCLEO, el sistema central, se reinició sin memoria.
- Byte: ¿Y qué hay que hacer?
- Vera: Volver a enseñarle todo, paso a paso. Semáforos, placas, circuitos, la radio, la IA… Y de paso, tú repasas.
- OPCAO: ¿Por dónde empezamos? -> NEXT
- OPCAO: ¿Quién causó el apagón? -> NEXT
- Vera: Antes de arreglar nada, hay que aprender a pensar el problema. Dejé el Cuaderno de Polya en la PRACA-01, acá cerca.
- Vera: Llévaselo a Chispa, a su taller en COM-96. Ella te va a explicar el método.

## CUTSCENE_FIM
left: byte
right: chispa
bg: Taller de Chispa

- Chispa: ¡Ay! Perdón, estaba soldando. Con el apagón me quedé sin luz y sin ideas.
- Byte: Te traje esto:
- ENTREGAR: cuaderno-polya
- Chispa: ¡El cuaderno de Polya! Cuatro fases para resolver cualquier problema: comprender, planear, ejecutar y revisar.
- Byte: ¿Y lo del pensamiento computacional?
- Chispa: Es la forma de pensar como programadora: dividir el problema, buscar patrones, quedarse con lo importante y escribir los pasos.
- Chispa: Te abrí la explicación en la pantalla. Léela con calma y después resuelve los desafíos.
- APE: mision-1
- Chispa: ¡Muy bien! Yo siempre salto directo a ejecutar… y me olvido de la fase 4: revisar.
- Byte: Eso puede traer problemas grandes.
- Chispa: Ni me digas. Ve con Rayo al Garaje Fénix: el semáforo de 18 de Julio sigue loco.
