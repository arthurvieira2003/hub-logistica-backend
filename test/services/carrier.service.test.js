const carrierService = require('../../services/carrier.service');
const axios = require('axios');

// Mock dos módulos
jest.mock('axios');

require('dotenv').config();

describe('Carrier Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WS_URL = 'https://test-ws.example.com';
    process.env.WS_TOKEN = 'test-token';
  });

  describe('getCarrier', () => {
    it('deve retornar lista de transportadoras com sucesso', async () => {
      const mockCarriers = [
        {
          CardCode: 'CAR001',
          CardName: 'Transportadora Teste',
          CNPJ: '12345678000190',
        },
        {
          CardCode: 'CAR002',
          CardName: 'Outra Transportadora',
          CNPJ: '98765432000110',
        },
      ];

      axios.get.mockResolvedValue({ data: mockCarriers });

      const result = await carrierService.getCarrier();

      expect(axios.get).toHaveBeenCalled();
      expect(result).toEqual(mockCarriers);
    });

    it('deve retornar null quando ocorre erro', async () => {
      axios.get.mockRejectedValue(new Error('Erro de conexão'));

      const result = await carrierService.getCarrier();

      expect(result).toBeNull();
    });

    it('deve fazer a requisição com URL e token corretos', async () => {
      const mockCarriers = [{ CardCode: 'CAR001', CardName: 'Teste' }];
      axios.get.mockResolvedValue({ data: mockCarriers });

      await carrierService.getCarrier();

      const callUrl = axios.get.mock.calls[0][0];
      expect(callUrl).toContain(process.env.WS_URL);
      expect(callUrl).toContain('consultaSQL');
      expect(callUrl).toContain(process.env.WS_TOKEN);
    });
  });
});

