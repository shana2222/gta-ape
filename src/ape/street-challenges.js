// Mini retos que aparecen al azar en la calle (bonus: no cambian la nota).
// type 'choice': elegir una opción · type 'fill': escribir lo que falta.

export const STREET_CHALLENGES = [
  {
    id: 'semaforo', icon: '👵', who: 'Doña Rosa', cry: '¡Ayuda! ¿Me cruzas la calle?',
    story: 'Doña Rosa quiere cruzar 18 de Julio. Su bastón inteligente decide con este código cuándo es seguro cruzar.',
    code: 'if semaforo == "verde" ___ autos_cerca == 0:\n    print("Cruzar")',
    question: '¿Qué palabra va en el espacio para que cruce solo si se cumplen LAS DOS condiciones?',
    type: 'choice', options: ['and', 'or', 'not', 'else'], answer: 0,
    explain: 'and exige que las dos condiciones sean verdaderas. Con or alcanzaría con una sola… ¡y Doña Rosa cruzaría con autos viniendo!',
    thanks: '¡Gracias, mi niña! Ahora sí cruzo tranquila. Toma, un caramelo de miel.',
  },
  {
    id: 'print-mayus', icon: '🧑‍💻', who: 'Mateo, programador junior', cry: '¡Python me dice NameError!',
    story: 'Mateo escribió su primer programa y Python le muestra: NameError: name \'Print\' is not defined',
    code: 'Print("Hola Santa Bruma")',
    question: '¿Cómo se arregla?',
    type: 'choice', options: ['Escribir print con minúscula', 'Sacar las comillas', 'Agregar ; al final', 'Cambiar los paréntesis por llaves'], answer: 0,
    explain: 'Python distingue mayúsculas y minúsculas: la función se llama print, toda en minúscula.',
    thanks: '¡Funcionó! Una letra… ¡una sola letra!',
  },
  {
    id: 'input-int', icon: '🧮', who: 'Sofi', cry: '¡Mi calculadora no suma!',
    story: 'Sofi pide dos números con input() y los suma, pero si escribe 2 y 3 le muestra 23.',
    code: 'a = input("Número: ")\nb = input("Otro: ")\nprint(a + b)',
    question: '¿Qué función le falta usar para que sume de verdad?',
    type: 'fill', accept: ['int', 'int()', 'float', 'float()'],
    explain: 'input() devuelve texto, y "2" + "3" pega los textos: "23". Con int(input(...)) se convierten a números.',
    thanks: '¡Ahora da 5! Gracias, me salvaste el práctico.',
  },
  {
    id: 'dos-puntos', icon: '🧒', who: 'Joaquín', cry: '¡SyntaxError en mi if!',
    story: 'Joaquín escribió un if y Python le dice: SyntaxError: expected \':\'',
    code: 'edad = 15\nif edad >= 15\n    print("Puede entrar")',
    question: '¿Qué carácter le falta al final de la línea del if? Escríbelo:',
    type: 'fill', accept: [':'],
    explain: 'Después de la condición de un if (y de elif, else, while, for) siempre van dos puntos.',
    thanks: '¡Entró! Dos puntitos, nada más.',
  },
  {
    id: 'led-alreves', icon: '🔦', who: 'Valentina', cry: '¡Mi LED no prende!',
    story: 'Valentina armó su circuito en la protoboard: pila, resistencia y LED. Todo conectado, pero el LED no prende.',
    code: '',
    question: '¿Qué es lo más probable?',
    type: 'choice', options: ['El LED está conectado al revés (la pata larga va al +)', 'Le falta otra resistencia', 'La protoboard está apagada', 'Los LED rojos no funcionan con pilas'], answer: 0,
    explain: 'El LED tiene polaridad: el ánodo (pata larga) va hacia el +. Al revés no se rompe, pero no prende.',
    thanks: '¡Se hizo la luz! Lo di vuelta y prendió.',
  },
  {
    id: 'microbit-boton', icon: '🎮', who: 'Nico', cry: '¿Qué hace mi micro:bit?',
    story: 'Nico encontró este programa en una micro:bit del liceo.',
    code: 'def al_presionar_a():\n    basic.show_string("HOLA")\ninput.on_button_pressed(Button.A, al_presionar_a)',
    question: '¿Cuándo aparece HOLA en la matriz?',
    type: 'choice', options: ['Cada vez que se aprieta el botón A', 'Apenas se prende la placa', 'Cuando se sacude', 'Nunca'], answer: 0,
    explain: 'on_button_pressed(Button.A, …) es un evento: el código se ejecuta cada vez que se aprieta A.',
    thanks: '¡HOLA! Ahora le voy a poner mi nombre.',
  },
  {
    id: 'polya', icon: '🧑‍🏫', who: 'Profe Marta', cry: '¿Te animas a una pregunta?',
    story: 'La profe Marta prepara una clase sobre resolución de problemas.',
    code: '',
    question: '¿Cuál es la ÚLTIMA fase de Polya?',
    type: 'choice', options: ['Examinar la solución', 'Comprender el problema', 'Concebir un plan', 'Ejecutar el plan'], answer: 0,
    explain: 'Polya: comprender, planear, ejecutar y, al final, examinar (revisar) la solución.',
    thanks: '¡Muy bien! Te ganaste un 12 imaginario.',
  },
  {
    id: 'len', icon: '🐍', who: 'Lucía', cry: '¿Cuántas letras tiene?',
    story: 'Lucía quiere saber cuántos caracteres tiene una palabra con Python.',
    code: 'palabra = "ceibal"\nprint(len(palabra))',
    question: '¿Qué número muestra? Escríbelo:',
    type: 'fill', accept: ['6'],
    explain: 'len() cuenta los caracteres: c-e-i-b-a-l son 6.',
    thanks: '¡6! Justo lo que necesitaba para mi contraseña.',
  },
  {
    id: 'ml-datos', icon: '📸', who: 'Bruno', cry: '¡Mi IA se confunde!',
    story: 'Bruno entrenó un modelo para reconocer su perro, pero solo le sacó 3 fotos, todas de frente.',
    code: '',
    question: '¿Qué debería hacer para mejorar el modelo?',
    type: 'choice', options: ['Agregar muchas fotos variadas (de costado, con otra luz, otros fondos)', 'Usar las mismas 3 fotos más veces', 'Cambiar el nombre de la clase', 'Nada, la IA siempre acierta'], answer: 0,
    explain: 'Un modelo aprende de sus datos: con pocos ejemplos y siempre iguales, no reconoce situaciones nuevas.',
    thanks: '¡Ahora reconoce a Firulais hasta de espaldas!',
  },
  {
    id: 'periferico', icon: '🖨️', who: 'Don Julio', cry: '¿Esto es de entrada o de salida?',
    story: 'Don Julio compró una impresora para el kiosco y no sabe cómo clasificarla para el inventario.',
    code: '',
    question: 'Una impresora común es un periférico de…',
    type: 'choice', options: ['Salida', 'Entrada', 'Entrada y salida', 'Almacenamiento'], answer: 0,
    explain: 'La impresora saca información de la computadora al papel: es de salida (las multifunción, que escanean, son de entrada/salida).',
    thanks: '¡Anotado! Salida. Gracias, gurí.',
  },
];

export function getStreetChallenge(id) {
  return STREET_CHALLENGES.find((c) => c.id === id) || null;
}

export function normalizeAnswer(s) {
  return String(s ?? '').trim().toLowerCase().replace(/\s+/g, '');
}
