const princesaService = require('../../services/princesa.service');
const nfService = require('../../services/nf.service');
const Tracking = require('../../models/tracking.model');
const axios = require('axios');

// Mock dos módulos
jest.mock('../../services/nf.service');
jest.mock('../../models/tracking.model');
jest.mock('axios');

require('dotenv').config();

describe('Princesa Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PRINCESA_URL = 'https://test-princesa.example.com';
    process.env.PRINCESA_TOKEN = 'test-token';
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('getDadosPrincesa', () => {
    it('deve retornar dados quando não há notas', async () => {
      nfService.getNotas.mockResolvedValue([]);

      const result = await princesaService.getDadosPrincesa({});

      expect(result).toEqual([]);
    });

    it('deve retornar erro quando nfService retorna null', async () => {
      nfService.getNotas.mockResolvedValue(null);

      const result = await princesaService.getDadosPrincesa({});

      expect(result).toEqual({
        status: 'error',
        errorMessage: expect.stringContaining('Falha ao consultar serviço da Princesa'),
      });
    });

    it('deve buscar dados da API quando não há tracking no cache', async () => {
      jest.useRealTimers();
      const mockNotas = [
        {
          DocNum: '12345',
          DocEntry: 1,
          CardName: 'Cliente Teste',
          DocDate: '2024-01-15',
          Serial: '12345678901234567890123456789012345678901234',
          SeriesStr: 'A',
          CarrierName: 'Princesa',
          BPLName: 'Filial 1',
          TaxIdNum: '12345678000190',
          CidadeOrigem: 'São Paulo',
          EstadoOrigem: 'SP',
          CidadeDestino: 'Rio de Janeiro',
          EstadoDestino: 'RJ',
        },
      ];

      const mockRastreamento = { codigo: 'ABC123', status: 'Em trânsito' };

      nfService.getNotas.mockResolvedValue(mockNotas);
      Tracking.findOne.mockResolvedValue(null);
      axios.get.mockResolvedValue({ data: mockRastreamento });
      Tracking.create.mockResolvedValue({
        id: 1,
        serial: 12345678901234567890123456789012345678901234,
        trackingData: mockRastreamento,
      });

      const result = await princesaService.getDadosPrincesa({});

      expect(Tracking.findOne).toHaveBeenCalled();
      expect(axios.get).toHaveBeenCalled();
      // Quando há apenas uma nota, retorna objeto único
      expect(Array.isArray(result)).toBe(false);
      expect(result).toHaveProperty('rastreamento', mockRastreamento);
      expect(result).toHaveProperty('cacheStatus', 'updated');
    });

    it('deve usar dados do cache quando disponível e atualizado', async () => {
      const mockNotas = [
        {
          DocNum: '12345',
          DocEntry: 1,
          CardName: 'Cliente Teste',
          DocDate: '2024-01-15',
          Serial: '12345678901234567890123456789012345678901234',
          SeriesStr: 'A',
          CarrierName: 'Princesa',
          BPLName: 'Filial 1',
          TaxIdNum: '12345678000190',
          CidadeOrigem: 'São Paulo',
          EstadoOrigem: 'SP',
          CidadeDestino: 'Rio de Janeiro',
          EstadoDestino: 'RJ',
        },
      ];

      const mockRastreamento = { codigo: 'ABC123', status: 'Em trânsito' };
      const mockTracking = {
        id: 1,
        trackingData: mockRastreamento,
        lastUpdated: new Date(),
        save: jest.fn(),
      };

      nfService.getNotas.mockResolvedValue(mockNotas);
      Tracking.findOne.mockResolvedValue(mockTracking);

      const result = await princesaService.getDadosPrincesa({
        horasParaAtualizar: 24,
      });

      expect(Tracking.findOne).toHaveBeenCalled();
      expect(axios.get).not.toHaveBeenCalled();
      // Quando há apenas uma nota, retorna objeto único
      expect(Array.isArray(result)).toBe(false);
      expect(result).toHaveProperty('rastreamento', mockRastreamento);
      expect(result).toHaveProperty('cacheStatus', 'cached');
    });

    it('deve forçar atualização quando forcarAtualizacao é true', async () => {
      jest.useRealTimers();
      const mockNotas = [
        {
          DocNum: '12345',
          DocEntry: 1,
          CardName: 'Cliente Teste',
          DocDate: '2024-01-15',
          Serial: '12345678901234567890123456789012345678901234',
          SeriesStr: 'A',
          CarrierName: 'Princesa',
          BPLName: 'Filial 1',
          TaxIdNum: '12345678000190',
          CidadeOrigem: 'São Paulo',
          EstadoOrigem: 'SP',
          CidadeDestino: 'Rio de Janeiro',
          EstadoDestino: 'RJ',
        },
      ];

      const mockRastreamento = { codigo: 'ABC123' };
      const mockTracking = {
        id: 1,
        trackingData: { old: 'data' },
        lastUpdated: new Date(),
        save: jest.fn(),
      };

      nfService.getNotas.mockResolvedValue(mockNotas);
      Tracking.findOne.mockResolvedValue(mockTracking);
      axios.get.mockResolvedValue({ data: mockRastreamento });

      const result = await princesaService.getDadosPrincesa({
        forcarAtualizacao: true,
      });

      expect(axios.get).toHaveBeenCalled();
      expect(mockTracking.save).toHaveBeenCalled();
      // Quando há apenas uma nota, retorna objeto único
      expect(Array.isArray(result)).toBe(false);
      expect(result).toHaveProperty('cacheStatus', 'updated');
    });

    it('deve retornar objeto único quando há apenas uma nota', async () => {
      jest.useRealTimers();
      const mockNotas = [
        {
          DocNum: '12345',
          DocEntry: 1,
          CardName: 'Cliente Teste',
          DocDate: '2024-01-15',
          Serial: '12345678901234567890123456789012345678901234',
          SeriesStr: 'A',
          CarrierName: 'Princesa',
          BPLName: 'Filial 1',
          TaxIdNum: '12345678000190',
          CidadeOrigem: 'São Paulo',
          EstadoOrigem: 'SP',
          CidadeDestino: 'Rio de Janeiro',
          EstadoDestino: 'RJ',
        },
      ];

      const mockRastreamento = { codigo: 'ABC123' };

      nfService.getNotas.mockResolvedValue(mockNotas);
      Tracking.findOne.mockResolvedValue(null);
      axios.get.mockResolvedValue({ data: mockRastreamento });
      Tracking.create.mockResolvedValue({
        id: 1,
        trackingData: mockRastreamento,
      });

      const result = await princesaService.getDadosPrincesa({});

      expect(Array.isArray(result)).toBe(false);
      expect(result).toHaveProperty('rastreamento', mockRastreamento);
    });

    it('deve retornar erro quando ocorre falha geral', async () => {
      nfService.getNotas.mockRejectedValue(new Error('Erro geral'));

      const result = await princesaService.getDadosPrincesa({});

      expect(result).toEqual({
        status: 'error',
        errorMessage: expect.stringContaining('Falha ao consultar serviço da Princesa'),
      });
    });

    it('deve retornar erro quando falha ao obter rastreamento', async () => {
      jest.useRealTimers();
      const mockNotas = [
        {
          DocNum: '12345',
          DocEntry: 1,
          CardName: 'Cliente Teste',
          DocDate: '2024-01-15',
          Serial: '12345678901234567890123456789012345678901234',
          SeriesStr: 'A',
          CarrierName: 'Princesa',
          BPLName: 'Filial 1',
          TaxIdNum: '12345678000190',
          CidadeOrigem: 'São Paulo',
          EstadoOrigem: 'SP',
          CidadeDestino: 'Rio de Janeiro',
          EstadoDestino: 'RJ',
        },
      ];

      nfService.getNotas.mockResolvedValue(mockNotas);
      Tracking.findOne.mockResolvedValue(null);
      axios.get.mockRejectedValue(new Error('Erro de conexão'));

      const result = await princesaService.getDadosPrincesa({});

      // Quando há apenas uma nota com erro, retorna objeto único
      expect(result).toHaveProperty('status', 'error');
      expect(result).toHaveProperty('rastreamento', null);
      expect(result).toHaveProperty('errorMessage');
    });
  });
});

