export interface WallSegment {
  id: string;
  type: 'parede' | 'porta' | 'janela' | 'boneca';
  length: number;
}

export interface Wall {
  id: string;
  name: string;
  totalLength: number;
  segments: WallSegment[];
}

export interface Room {
  name: string;
  width: number;
  length: number;
  height: number;
  walls: Record<'top' | 'right' | 'bottom' | 'left', Wall>;
}

export function generateDXF(room: Room): string {
  let dxf = `0\nSECTION\n2\nENTITIES\n`;

  // Helper to add a line to DXF
  const addLine = (x1: number, y1: number, x2: number, y2: number, layer: string = '0', color: number = 7) => {
    dxf += `0\nLINE\n8\n${layer}\n62\n${color}\n10\n${x1}\n20\n${y1}\n11\n${x2}\n21\n${y2}\n`;
  };

  const addText = (text: string, x: number, y: number, height: number = 0.2) => {
    dxf += `0\nTEXT\n8\nTEXTOS\n10\n${x}\n20\n${y}\n40\n${height}\n1\n${text}\n`;
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
  if (currentY < l) addLine(0, currentY, 0, l, 'PAREDES_ERRO', 1);

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
