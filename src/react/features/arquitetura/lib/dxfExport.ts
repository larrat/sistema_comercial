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

export function generateDXF(rooms: Room[]): string {
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
  const drawInternalElement = (el: ElementoInterno, offsetX: number, offsetY: number) => {
    if (el.type === 'escada') {
      const layer = 'ESCADA';
      const color = 8; // Gray
      addRect(offsetX + el.x, offsetY + el.y, el.width, el.length, layer, color);
      // Degraus falsos a cada 0.28m (28cm) - vamos fatiar na direção Y se a escada for mais comprida, senao em X
      if (el.length >= el.width) {
        const stepCount = Math.floor(el.length / 0.28);
        for(let i=1; i<stepCount; i++) {
          addLine(offsetX + el.x, offsetY + el.y + (i*0.28), offsetX + el.x + el.width, offsetY + el.y + (i*0.28), layer, color);
        }
      } else {
        const stepCount = Math.floor(el.width / 0.28);
        for(let i=1; i<stepCount; i++) {
          addLine(offsetX + el.x + (i*0.28), offsetY + el.y, offsetX + el.x + (i*0.28), offsetY + el.y + el.length, layer, color);
        }
      }
      addText('ESCADA', offsetX + el.x + (el.width/2), offsetY + el.y + (el.length/2), 0.1, layer, color);
    } else if (el.type === 'pilar') {
      addRect(offsetX + el.x, offsetY + el.y, el.width, el.length, 'PILARES', 5); // Blue
      // Hash cruzado simples
      addLine(offsetX + el.x, offsetY + el.y, offsetX + el.x + el.width, offsetY + el.y + el.length, 'PILARES', 5);
      addLine(offsetX + el.x, offsetY + el.y + el.length, offsetX + el.x + el.width, offsetY + el.y, 'PILARES', 5);
    } else if (el.camada === 'teto') {
      const layer = 'ILUMINACAO_FORRO';
      const color = 6; // Magenta
      addRect(offsetX + el.x, offsetY + el.y, el.width, el.length, layer, color);
      addText(el.type.split('_').join(' ').toUpperCase(), offsetX + el.x, offsetY + el.y + el.length + 0.1, 0.1, layer, color);
      if (el.type === 'luminaria') {
        // cruz no meio para indicar plafon/iluminacao
        addLine(offsetX + el.x + (el.width/2), offsetY + el.y, offsetX + el.x + (el.width/2), offsetY + el.y + el.length, layer, color);
        addLine(offsetX + el.x, offsetY + el.y + (el.length/2), offsetX + el.x + el.width, offsetY + el.y + (el.length/2), layer, color);
      }
    }
  }

  let globalOffsetX = 0;
  for (const room of rooms) {
    const w = room.width;
    const l = room.length;
    const offsetX = globalOffsetX;
    const offsetY = 0;

    // Room Label
    addText(room.name.toUpperCase(), offsetX, offsetY - 0.5, 0.3, 'TEXTOS', 7);

    // Top Wall (Y = l, X from 0 to w)
    let currentX = 0;
    for (const seg of room.walls.top.segments) {
      const nextX = currentX + seg.length;
      if (seg.type === 'parede' || seg.type === 'boneca') {
        addLine(offsetX + currentX, offsetY + l, offsetX + nextX, offsetY + l, 'PAREDES', 7);
      } else if (seg.type === 'janela') {
        addLine(offsetX + currentX, offsetY + l, offsetX + nextX, offsetY + l, 'JANELAS', 3);
        addText('JANELA', offsetX + currentX + (seg.length / 2), offsetY + l + 0.1);
      } else if (seg.type === 'porta') {
        addLine(offsetX + currentX, offsetY + l, offsetX + nextX, offsetY + l, 'PORTAS', 1);
        addText('PORTA', offsetX + currentX + (seg.length / 2), offsetY + l + 0.1);
      }
      currentX = nextX;
    }
    for (const poi of room.walls.top.segments.length > 0 ? room.walls.top.points : []) {
      drawPOI(poi, offsetX + poi.distanceFromStart, offsetY + l);
    }
    if (currentX < w) addLine(offsetX + currentX, offsetY + l, offsetX + w, offsetY + l, 'PAREDES_ERRO', 1);

    // Right Wall (X = w, Y from l down to 0)
    let currentY = l;
    for (const seg of room.walls.right.segments) {
      const nextY = currentY - seg.length;
      if (seg.type === 'parede' || seg.type === 'boneca') addLine(offsetX + w, offsetY + currentY, offsetX + w, offsetY + nextY, 'PAREDES');
      else if (seg.type === 'janela') addLine(offsetX + w, offsetY + currentY, offsetX + w, offsetY + nextY, 'JANELAS', 3);
      else if (seg.type === 'porta') addLine(offsetX + w, offsetY + currentY, offsetX + w, offsetY + nextY, 'PORTAS', 1);
      currentY = nextY;
    }
    for (const poi of room.walls.right.segments.length > 0 ? room.walls.right.points : []) {
      drawPOI(poi, offsetX + w, offsetY + l - poi.distanceFromStart);
    }
    if (currentY > 0) addLine(offsetX + w, offsetY + currentY, offsetX + w, offsetY + 0, 'PAREDES_ERRO', 1);

    // Bottom Wall (Y = 0, X from w down to 0)
    currentX = w;
    for (const seg of room.walls.bottom.segments) {
      const nextX = currentX - seg.length;
      if (seg.type === 'parede' || seg.type === 'boneca') addLine(offsetX + currentX, offsetY + 0, offsetX + nextX, offsetY + 0, 'PAREDES');
      else if (seg.type === 'janela') addLine(offsetX + currentX, offsetY + 0, offsetX + nextX, offsetY + 0, 'JANELAS', 3);
      else if (seg.type === 'porta') addLine(offsetX + currentX, offsetY + 0, offsetX + nextX, offsetY + 0, 'PORTAS', 1);
      currentX = nextX;
    }
    for (const poi of room.walls.bottom.segments.length > 0 ? room.walls.bottom.points : []) {
      drawPOI(poi, offsetX + w - poi.distanceFromStart, offsetY + 0);
    }
    if (currentX > 0) addLine(offsetX + currentX, offsetY + 0, offsetX + 0, offsetY + 0, 'PAREDES_ERRO', 1);

    // Left Wall (X = 0, Y from 0 up to l)
    currentY = 0;
    for (const seg of room.walls.left.segments) {
      const nextY = currentY + seg.length;
      if (seg.type === 'parede' || seg.type === 'boneca') addLine(offsetX + 0, offsetY + currentY, offsetX + 0, offsetY + nextY, 'PAREDES');
      else if (seg.type === 'janela') addLine(offsetX + 0, offsetY + currentY, offsetX + 0, offsetY + nextY, 'JANELAS', 3);
      else if (seg.type === 'porta') addLine(offsetX + 0, offsetY + currentY, offsetX + 0, offsetY + nextY, 'PORTAS', 1);
      currentY = nextY;
    }
    for (const poi of room.walls.left.segments.length > 0 ? room.walls.left.points : []) {
      drawPOI(poi, offsetX + 0, offsetY + poi.distanceFromStart);
    }
    if (currentY < l) addLine(offsetX + 0, offsetY + currentY, offsetX + 0, offsetY + l, 'PAREDES_ERRO', 1);

    // Draw Internal Elements
    for (const el of room.internalElements) {
      drawInternalElement(el, offsetX, offsetY);
    }
    
    // Jump 5 meters to the right for the next room
    globalOffsetX += w + 5;
  }

  dxf += `0\nENDSEC\n0\nEOF\n`;
  return dxf;
}

export function downloadDXF(rooms: Room[], projectName: string = 'Projeto') {
  const dxfContent = generateDXF(rooms);
  const blob = new Blob([dxfContent], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Levantamento_${projectName}.dxf`;
  a.click();
  window.URL.revokeObjectURL(url);
}
