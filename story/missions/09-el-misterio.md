---
id: 09-el-misterio
title: Misión 9 — La pista cifrada
start: COM-14
pickup: PRACA-15
pickup_objective: Busca la Pista Cifrada en el Parque Rodó (PRACA-15)
target: CASA-181
objective: Llévale la pista a Tito en el puerto (CASA-181)
give_item: pista-cifrada
require_item: pista-cifrada
delivery_prompt: Tito quiere ver la pista. Elige el objeto:
wrong_item_message: Eso no es una pista. Es un papel de chicle.
---

## CUTSCENE_INICIO
left: byte
right: rayo
bg: Carrito de chivitos de Rayo

- Rayo: Dicen que la pista quedó en el Parque Rodó, en la PRACA-15.
- Byte: ¿Y por qué no la fue a buscar Tito?
- Rayo: Porque Tito no camina más de dos cuadras. Llévasela al puerto.

## CUTSCENE_FIM
left: byte
right: tito
bg: Depósito de Tito en el Puerto

- Tito: ¿La encontraste? Déjame ver.
- Byte: Acá está:
- ENTREGAR: pista-cifrada
- Tito: Está llena de espacios, mayúsculas mezcladas… No se entiende nada.
- Byte: Python tiene funciones incorporadas para eso: strip() saca espacios, upper() pasa a mayúsculas, len() cuenta caracteres.
- Tito: ¿Y para medir la fuente de la plaza? Me pidieron cubrirla y no sé el área.
- Byte: Para eso está el módulo math.
- APE: mision-9
- Tito: "EL CULPABLE ESTÁ EN EL PUERTO". ¡Pero si acá estoy yo!
- Byte: Tranquilo, Tito. En el puerto también está la batería de respaldo de NÚCLEO. Ahí tiene que estar la respuesta.
- Tito: La batería la llevaron a la Plaza de la Bandera (PRACA-12). Llévasela a Vera.
