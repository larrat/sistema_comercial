import { beforeEach, describe, expect, it, vi } from 'vitest';
import { contratosApi } from './contratosApi';

const fetchMock = vi.fn<typeof fetch>();

describe('contratosApi reforms extensions', () => {
  const ctx = {
    url: 'https://example.supabase.co',
    key: 'public-key',
    token: 'token-123',
    filialId: 'filial-1'
  };

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  describe('Aditivos (Change Orders)', () => {
    it('should fetch aditivos with expected filters and headers', async () => {
      const mockAditivos = [
        { id: '1', titulo: 'Pintura Extra', valor: 2500, criado_em: '2026-05-26T10:00:00Z' }
      ];
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify(mockAditivos), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      const result = await contratosApi.getContratoAditivos(ctx, 'contrato-uuid');

      expect(result).toEqual(mockAditivos);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://example.supabase.co/rest/v1/contrato_aditivos?contrato_id=eq.contrato-uuid&filial_id=eq.filial-1&order=criado_em.desc',
        expect.objectContaining({
          headers: expect.objectContaining({
            apikey: 'public-key',
            Authorization: 'Bearer token-123'
          })
        })
      );
    });

    it('should create an aditivo and return represented row', async () => {
      const mockAditivo = { id: '1', contrato_id: 'c1', titulo: 'Piso 3D', valor: 3000 };
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify([mockAditivo]), {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      const result = await contratosApi.createContratoAditivo(ctx, {
        contrato_id: 'c1',
        titulo: 'Piso 3D',
        valor: 3000
      });

      expect(result).toEqual(mockAditivo);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://example.supabase.co/rest/v1/contrato_aditivos',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            contrato_id: 'c1',
            titulo: 'Piso 3D',
            valor: 3000,
            filial_id: 'filial-1'
          })
        })
      );
    });
  });

  describe('Cronograma (Gantt)', () => {
    it('should fetch cronograma timeline ordered by start date', async () => {
      const mockTimeline = [
        { id: 'f1', titulo: 'Demolição', percentual_conclusao: 100 }
      ];
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify(mockTimeline), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      const result = await contratosApi.getContratoCronograma(ctx, 'c1');

      expect(result).toEqual(mockTimeline);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://example.supabase.co/rest/v1/contrato_cronograma?contrato_id=eq.c1&filial_id=eq.filial-1&order=data_inicio.asc',
        expect.any(Object)
      );
    });

    it('should create a cronograma phase', async () => {
      const mockPhase = { id: 'f1', titulo: 'Pintura', percentual_conclusao: 0 };
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify([mockPhase]), {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      const result = await contratosApi.createContratoCronograma(ctx, {
        contrato_id: 'c1',
        titulo: 'Pintura',
        percentual_conclusao: 0,
        data_inicio: '2026-05-20',
        data_fim: '2026-05-25',
        precedente_id: null
      });

      expect(result).toEqual(mockPhase);
    });

    it('should update phase progress', async () => {
      fetchMock.mockResolvedValue(
        new Response(null, { status: 200 })
      );

      await contratosApi.updateCronogramaProgresso(ctx, 'f1', 75);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://example.supabase.co/rest/v1/contrato_cronograma?id=eq.f1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ percentual_conclusao: 75 })
        })
      );
    });
  });

  describe('Diário de Obra (RDO)', () => {
    it('should fetch daily technical logs in descending order', async () => {
      const mockDiarios = [
        { id: 'd1', titulo: 'Conclusão reboco', clima: 'ensolarado', mao_de_obra_qtd: 4 }
      ];
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify(mockDiarios), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      const result = await contratosApi.getDiarioObra(ctx, 'c1');

      expect(result).toEqual(mockDiarios);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://example.supabase.co/rest/v1/diario_obra?contrato_id=eq.c1&filial_id=eq.filial-1&order=criado_em.desc',
        expect.any(Object)
      );
    });

    it('should create a daily log (RDO)', async () => {
      const mockLog = { id: 'd1', titulo: 'Novo Diário', relatorio: 'Tudo OK' };
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify([mockLog]), {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      const result = await contratosApi.createDiarioObra(ctx, {
        contrato_id: 'c1',
        titulo: 'Novo Diário',
        relatorio: 'Tudo OK',
        clima: 'nublado',
        mao_de_obra_qtd: 2,
        fotos: []
      });

      expect(result).toEqual(mockLog);
    });
  });

  describe('Filial Users (Subcontractors)', () => {
    it('should fetch users belonging to the active filial', async () => {
      const mockUsers = [
        { user_id: 'u1', user_nome: 'Marcos Empreiteiro', user_email: 'marcos@example.com' }
      ];
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify(mockUsers), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      const result = await contratosApi.getFilialUsers(ctx);

      expect(result).toEqual(mockUsers);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://example.supabase.co/rest/v1/user_filiais?filial_id=eq.filial-1&select=user_id,user_nome,user_email&order=user_nome.asc',
        expect.any(Object)
      );
    });
  });
});
