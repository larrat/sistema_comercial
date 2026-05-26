import { beforeEach, describe, expect, it, vi } from 'vitest';
import { 
  listNotasDestinadas, 
  manifestarNotaDestinada, 
  vincularNotaImportada 
} from './comprasApi';

const token = 'test-token';
const filialId = 'filial-123';

function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
    json: () => Promise.resolve(body)
  } as unknown as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn());
});

describe('compras DFe API', () => {
  describe('listNotasDestinadas', () => {
    it('deve listar as notas destinadas da filial', async () => {
      const mockNotas = [
        { id: '1', nome_emitente: 'FORN A', valor_total: 100 },
        { id: '2', nome_emitente: 'FORN B', valor_total: 200 }
      ];
      vi.mocked(fetch).mockResolvedValue(makeResponse(mockNotas));

      const res = await listNotasDestinadas(token, filialId);
      
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(vi.mocked(fetch).mock.calls[0][0]).toContain('nfe_destinadas?filial_id=eq.filial-123');
      expect(res).toEqual(mockNotas);
    });
  });

  describe('manifestarNotaDestinada', () => {
    it('deve enviar manifesto de ciencia a SEFAZ', async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse({}));

      await manifestarNotaDestinada(token, 'nota-abc', 'ciencia');

      expect(fetch).toHaveBeenCalledTimes(1);
      const call = vi.mocked(fetch).mock.calls[0];
      expect(call[0]).toContain('nfe_destinadas?id=eq.nota-abc');
      expect(call[1]?.method).toBe('PATCH');
      const body = JSON.parse(call[1]?.body as string);
      expect(body.manifesto_status).toBe('ciencia');
      expect(body.xml_armazenado).toContain('nfeProc');
    });

    it('deve enviar manifesto de desconhecimento a SEFAZ', async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse({}));

      await manifestarNotaDestinada(token, 'nota-abc', 'desconhecido');

      expect(fetch).toHaveBeenCalledTimes(1);
      const call = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(call[1]?.body as string);
      expect(body.manifesto_status).toBe('desconhecido');
      expect(body.xml_armazenado).toBeUndefined();
    });
  });

  describe('vincularNotaImportada', () => {
    it('deve associar a nota destinada ao pedido de compra criado', async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse({}));

      await vincularNotaImportada(token, 'nota-123', 'pedido-abc');

      expect(fetch).toHaveBeenCalledTimes(1);
      const call = vi.mocked(fetch).mock.calls[0];
      expect(call[0]).toContain('nfe_destinadas?id=eq.nota-123');
      const body = JSON.parse(call[1]?.body as string);
      expect(body.importado_compra_id).toBe('pedido-abc');
      expect(body.manifesto_status).toBe('confirmado');
    });
  });
});
