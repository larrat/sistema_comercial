import React from 'react';
import { ResponsiveContainer, Treemap, Tooltip as RechartsTooltip } from 'recharts';
import { fmtBRL } from '../../../shared/lib/formatters';

type RfmGroup = {
  name: string;
  size: number;
  value: number;
  color: string;
};

type RfmSegmentationProps = {
  data: RfmGroup[];
};

export function RfmSegmentation({ data }: RfmSegmentationProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={data}
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="#0f172a"
          content={<CustomTreemapContent />}
        >
          <RechartsTooltip 
            content={({ active, payload }) => {
              if (active && payload?.length) {
                const item = payload[0].payload as RfmGroup;
                return (
                  <div className="bg-slate-950/95 backdrop-blur-2xl border border-white/10 p-3 rounded-2xl shadow-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1" style={{ color: item.color }}>{item.name}</p>
                    <div className="flex flex-col gap-1 mt-2">
                      <div className="flex justify-between gap-6">
                        <span className="text-[10px] text-slate-500 uppercase">Clientes</span>
                        <span className="text-[11px] font-bold text-white">{item.size}</span>
                      </div>
                      <div className="flex justify-between gap-6">
                        <span className="text-[10px] text-slate-500 uppercase">Receita</span>
                        <span className="text-[11px] font-bold text-white">{fmtBRL(item.value)}</span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }} 
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}

function CustomTreemapContent(props: any) {
  const { depth, x, y, width, height, index, name, color, value } = props;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: color || '#1e293b',
          stroke: '#0f172a',
          strokeWidth: 2,
          strokeOpacity: 0.5,
        }}
      />
      {width > 50 && height > 30 && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          fill="#fff"
          fontSize={10}
          fontWeight={800}
          className="uppercase tracking-widest drop-shadow-md"
        >
          {name}
        </text>
      )}
    </g>
  );
}
