export interface WallSegment {
  id: string;
  type: 'parede' | 'porta' | 'janela' | 'boneca';
  length: number;
}

export interface PointOfInterest {
  id: string;
  type: 'tomada_baixa' | 'tomada_media' | 'tomada_alta' | 'interruptor';
  distanceFromStart: number;
}

export interface Wall {
  id: string;
  name: string;
  totalLength: number;
  segments: WallSegment[];
  points: PointOfInterest[];
}

export interface ElementoInterno {
  id: string;
  camada: 'piso' | 'teto';
  type: 'escada' | 'pilar' | 'luminaria' | 'sanca_gesso' | 'ar_k7';
  width: number;
  length: number;
  x: number; // Distancia da esquerda
  y: number; // Distancia da base
}

export interface Room {
  name: string;
  width: number;
  length: number;
  height: number;
  walls: Record<'top' | 'right' | 'bottom' | 'left', Wall>;
  internalElements: ElementoInterno[];
}

export function generateDXF(room: Room): string {
  let dxf = `0\nSECTION\n2\nENTITIES\n`;

  // Helper to add a line to DXF
  const addLine = (x1: number, y1: number, x2: number, y2: number, layer: string = '0', color: number = 7) => {
    dxf += `0\nLINE\n8\n${layer}\n62\n${color}\n10\n${x1}\n20\n${y1}\n11\n${x2}\n21\n${y2}\n`;
  };

  const addText = (text: string, x: number, y: number, height: number = 0.2, layer: string = 'TEXTOS', color: number = 7) => {
    dxf += `0\nTEXT\n8\n${layer}\n62\n${color}\n10\n${x}\n20\n${y}\n40\n${height}\n1\n${text}\n`;
  }

  // Draw circle for electrical points
  const addCircle = (x: number, y: number, radius: number = 0.1, layer: string = 'ELETRICA', color: number = 2) => {
    dxf += `0\nCIRCLE\n8\n${layer}\n62\n${color}\n10\n${x}\n20\n${y}\n40\n${radius}\n`;
  }

  const drawPOI = (poi: PointOfInterest, x: number, y: number) => {
    addCircle(x, y);
    addText(poi.type.split('_').join(' ').toUpperCase(), x + 0.15, y, 0.1, 'ELETRICA', 2);
  }

  // Draw rectangle
  const addRect = (x: number, y: number, rw: number, rl: number, layer: string, color: number) => {
    addLine(x, y, x + rw, y, layer, color);
    addLine(x + rw, y, x + rw, y + rl, layer, color);
    addLine(x + rw, y + rl, x, y + rl, layer, color);
    addLine(x, y + rl, x, y, layer, color);
  }

  // Draw internal element
  const drawInternalElement = (el: ElementoInterno) => {
    if (el.type === 'escada') {
      const layer = 'ESCADA';
      const color = 8; // Gray
      addRect(el.x, el.y, el.width, el.length, layer, color);
      // Degraus falsos a cada 0.28m (28cm) - vamos fatiar na direção Y se a escada for mais comprida, senao em X
      if (el.length >= el.width) {
        const stepCount = Math.floor(el.length / 0.28);
        for(let i=1; i<stepCount; i++) {
          addLine(el.x, el.y + (i*0.28), el.x + el.width, el.y + (i*0.28), layer, color);
        }
      } else {
        const stepCount = Math.floor(el.width / 0.28);
        for(let i=1; i<stepCount; i++) {
          addLine(el.x + (i*0.28), el.y, el.x + (i*0.28), el.y + el.length, layer, color);
        }
      }
      addText('ESCADA', el.x + (el.width/2), el.y + (el.length/2), 0.1, layer, color);
    } else if (el.type === 'pilar') {
      addRect(el.x, el.y, el.width, el.length, 'PILARES', 5); // Blue
      // Hash cruzado simples
      addLine(el.x, el.y, el.x + el.width, el.y + el.length, 'PILARES', 5);
      addLine(el.x, el.y + el.length, el.x + el.width, el.y, 'PILARES', 5);
    } else if (el.camada === 'teto') {
      const layer = 'ILUMINACAO_FORRO';
      const color = 6; // Magenta
      addRect(el.x, el.y, el.width, el.length, layer, color);
      addText(el.type.split('_').join(' ').toUpperCase(), el.x, el.y + el.length + 0.1, 0.1, layer, color);
      if (el.type === 'luminaria') {
        // cruz no meio para indicar plafon/iluminacao
        addLine(el.x + (el.width/2), el.y, el.x + (el.width/2), el.y + el.length, layer, color);
        addLine(el.x, el.y + (el.length/2), el.x + el.width, el.y + (el.length/2), layer, color);
      }
    }
  }

  // Draw the main room box (Width x Length)
  // Let's assume bottom-left is (0,0)
  // Width = Right to Left (X axis)
  // Length = Bottom to Top (Y axis)

  const w = room.width;
  const l = room.length;

  // We draw lines according to segments.
  // Top Wall (Y = l, X from 0 to w)
  let currentX = 0;
  for (const seg of room.walls.top.segments) {
    const nextX = currentX + seg.length;
    if (seg.type === 'parede' || seg.type === 'boneca') {
      addLine(currentX, l, nextX, l, 'PAREDES', 7); // White
    } else if (seg.type === 'janela') {
      addLine(currentX, l, nextX, l, 'JANELAS', 3); // Green
      addText('JANELA', currentX + (seg.length / 2), l + 0.1);
    } else if (seg.type === 'porta') {
      addLine(currentX, l, nextX, l, 'PORTAS', 1); // Red
      addText('PORTA', currentX + (seg.length / 2), l + 0.1);
    }
    currentX = nextX;
  }
  for (const poi of room.walls.top.segments.length > 0 ? room.walls.top.points : []) {
    drawPOI(poi, poi.distanceFromStart, l);
  }
  // Draw remaining if segments don't fill
  if (currentX < w) addLine(currentX, l, w, l, 'PAREDES_ERRO', 1);

  // Right Wall (X = w, Y from l down to 0)
  let currentY = l;
  for (const seg of room.walls.right.segments) {
    const nextY = currentY - seg.length;
    if (seg.type === 'parede' || seg.type === 'boneca') addLine(w, currentY, w, nextY, 'PAREDES');
    else if (seg.type === 'janela') addLine(w, currentY, w, nextY, 'JANELAS', 3);
    else if (seg.type === 'porta') addLine(w, currentY, w, nextY, 'PORTAS', 1);
    currentY = nextY;
  }
  for (const poi of room.walls.right.segments.length > 0 ? room.walls.right.points : []) {
    drawPOI(poi, w, l - poi.distanceFromStart);
  }
  if (currentY > 0) addLine(w, currentY, w, 0, 'PAREDES_ERRO', 1);

  // Bottom Wall (Y = 0, X from w down to 0)
  currentX = w;
  for (const seg of room.walls.bottom.segments) {
    const nextX = currentX - seg.length;
    if (seg.type === 'parede' || seg.type === 'boneca') addLine(currentX, 0, nextX, 0, 'PAREDES');
    else if (seg.type === 'janela') addLine(currentX, 0, nextX, 0, 'JANELAS', 3);
    else if (seg.type === 'porta') addLine(currentX, 0, nextX, 0, 'PORTAS', 1);
    currentX = nextX;
  }
  for (const poi of room.walls.bottom.segments.length > 0 ? room.walls.bottom.points : []) {
    drawPOI(poi, w - poi.distanceFromStart, 0);
  }
  if (currentX > 0) addLine(currentX, 0, 0, 0, 'PAREDES_ERRO', 1);

  // Left Wall (X = 0, Y from 0 up to l)
  currentY = 0;
  for (const seg of room.walls.left.segments) {
    const nextY = currentY + seg.length;
    if (seg.type === 'parede' || seg.type === 'boneca') addLine(0, currentY, 0, nextY, 'PAREDES');
    else if (seg.type === 'janela') addLine(0, currentY, 0, nextY, 'JANELAS', 3);
    else if (seg.type === 'porta') addLine(0, currentY, 0, nextY, 'PORTAS', 1);
    currentY = nextY;
  }
  for (const poi of room.walls.left.segments.length > 0 ? room.walls.left.points : []) {
    drawPOI(poi, 0, poi.distanceFromStart);
  }
  if (currentY < l) addLine(0, currentY, 0, l, 'PAREDES_ERRO', 1);

  // Draw Internal Elements
  for (const el of room.internalElements) {
    drawInternalElement(el);
  }

  dxf += `0\nENDSEC\n0\nEOF\n`;
  return dxf;
}

export function downloadDXF(room: Room) {
  const dxfContent = generateDXF(room);
  const blob = new Blob([dxfContent], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Levantamento_${room.name || 'Ambiente'}.dxf`;
  a.click();
  window.URL.revokeObjectURL(url);
}
