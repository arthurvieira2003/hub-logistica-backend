const cteService = require('../../services/cte.service');
const axios = require('axios');
const zlib = require('zlib');
const xml2js = require('xml2js');

// Mock dos módulos
jest.mock('axios');
jest.mock('zlib');
jest.mock('xml2js');

require('dotenv').config();

describe('CTE Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WS_URL = 'https://test-ws.example.com';
    process.env.WS_TOKEN = 'test-token';
  });

  describe('getCTEs', () => {
    it('deve retornar lista de CTEs com sucesso', async () => {
      const mockXmlFile = Buffer.from('compressed-xml-data').toString('base64');
      const mockResponseData = [
        {
          Serial: '12345678901234567890123456789012345678901234',
          CardName: 'Cliente Teste',
          DateAdd: '2024-01-15',
          DocTotal: 1000.0,
          XmlFile: mockXmlFile,
        },
      ];

      const mockDecompressedData = Buffer.from('<xml>test</xml>');
      const mockParsedXml = { xml: { root: 'test' } };

      axios.get.mockResolvedValue({ data: mockResponseData });
      zlib.inflateRawSync.mockReturnValue(mockDecompressedData);
      xml2js.parseString.mockImplementation((xml, callback) => {
        callback(null, mockParsedXml);
      });

      const result = await cteService.getCTEs();

      expect(axios.get).toHaveBeenCalled();
      expect(zlib.inflateRawSync).toHaveBeenCalled();
      expect(xml2js.parseString).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('xmlData', mockParsedXml);
    });

    it('deve lidar com erro ao descompactar dados', async () => {
      const mockXmlFile = Buffer.from('invalid-data').toString('base64');
      const mockResponseData = [
        {
          Serial: '12345678901234567890123456789012345678901234',
          CardName: 'Cliente Teste',
          DateAdd: '2024-01-15',
          DocTotal: 1000.0,
          XmlFile: mockXmlFile,
        },
      ];

      axios.get.mockResolvedValue({ data: mockResponseData });
      zlib.inflateRawSync.mockImplementation(() => {
        throw new Error('Erro de descompactação');
      });

      const result = await cteService.getCTEs();

      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('xmlData');
    });

    it('deve lidar com erro ao parsear XML', async () => {
      const mockXmlFile = Buffer.from('compressed-xml-data').toString('base64');
      const mockResponseData = [
        {
          Serial: '12345678901234567890123456789012345678901234',
          CardName: 'Cliente Teste',
          DateAdd: '2024-01-15',
          DocTotal: 1000.0,
          XmlFile: mockXmlFile,
        },
      ];

      const mockDecompressedData = Buffer.from('<invalid-xml>');

      axios.get.mockResolvedValue({ data: mockResponseData });
      zlib.inflateRawSync.mockReturnValue(mockDecompressedData);
      xml2js.parseString.mockImplementation((xml, callback) => {
        callback(new Error('Erro ao parsear XML'), null);
      });

      const result = await cteService.getCTEs();

      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('xmlData');
    });

    it('deve lançar erro quando a requisição falha', async () => {
      const errorMessage = 'Erro ao buscar CTEs';
      axios.get.mockRejectedValue(new Error(errorMessage));

      await expect(cteService.getCTEs()).rejects.toThrow(errorMessage);
    });
  });

  describe('getXMLBySerial', () => {
    it('deve retornar XML descompactado pelo serial', async () => {
      const serial = '12345678901234567890123456789012345678901234';
      const mockXmlFile = Buffer.from('compressed-xml-data').toString('base64');
      const mockResponseData = [{ XmlFile: mockXmlFile }];
      const mockDecompressedData = Buffer.from('<xml>test</xml>');

      axios.get.mockResolvedValue({ data: mockResponseData });
      zlib.inflateRawSync.mockReturnValue(mockDecompressedData);

      const result = await cteService.getXMLBySerial(serial);

      expect(axios.get).toHaveBeenCalled();
      expect(zlib.inflateRawSync).toHaveBeenCalled();
      expect(result).toEqual(mockDecompressedData);
    });

    it('deve lançar erro quando XML não é encontrado', async () => {
      const serial = '99999999999999999999999999999999999999999999';
      axios.get.mockResolvedValue({ data: [] });

      await expect(cteService.getXMLBySerial(serial)).rejects.toThrow(
        'XML não encontrado'
      );
    });

    it('deve lançar erro quando XmlFile está vazio', async () => {
      const serial = '12345678901234567890123456789012345678901234';
      axios.get.mockResolvedValue({ data: [{}] });

      await expect(cteService.getXMLBySerial(serial)).rejects.toThrow(
        'XML não encontrado'
      );
    });

    it('deve lançar erro quando ocorre falha na descompactação', async () => {
      const serial = '12345678901234567890123456789012345678901234';
      const mockXmlFile = Buffer.from('invalid-data').toString('base64');
      axios.get.mockResolvedValue({ data: [{ XmlFile: mockXmlFile }] });
      zlib.inflateRawSync.mockImplementation(() => {
        throw new Error('Erro de descompactação');
      });

      await expect(cteService.getXMLBySerial(serial)).rejects.toThrow();
    });
  });

  describe('getPDFByChave', () => {
    it('deve retornar PDF pelo serial de SC', async () => {
      const serial = '42345678901234567890123456789012345678901234';
      const mockPdfBuffer = Buffer.from('PDF content');

      axios.mockResolvedValue({
        data: mockPdfBuffer,
        headers: { 'content-type': 'application/pdf' },
      });

      const result = await cteService.getPDFByChave(serial);

      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('cte.fazenda.sc.gov.br'),
          responseType: 'arraybuffer',
        })
      );
      expect(result).toEqual(mockPdfBuffer);
    });

    it('deve retornar PDF pelo serial de SP', async () => {
      const serial = '35345678901234567890123456789012345678901234';
      const mockPdfBuffer = Buffer.from('PDF content');

      axios.mockResolvedValue({
        data: mockPdfBuffer,
        headers: { 'content-type': 'application/pdf' },
      });

      const result = await cteService.getPDFByChave(serial);

      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('nfe.fazenda.sp.gov.br'),
        })
      );
      expect(result).toEqual(mockPdfBuffer);
    });

    it('deve retornar PDF pelo serial de PR', async () => {
      const serial = '41345678901234567890123456789012345678901234';
      const mockPdfBuffer = Buffer.from('PDF content');

      axios.mockResolvedValue({
        data: mockPdfBuffer,
        headers: { 'content-type': 'application/pdf' },
      });

      const result = await cteService.getPDFByChave(serial);

      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('fazenda.pr.gov.br'),
        })
      );
      expect(result).toEqual(mockPdfBuffer);
    });

    it('deve usar SC como fallback para estado desconhecido', async () => {
      const serial = '99345678901234567890123456789012345678901234';
      const mockPdfBuffer = Buffer.from('PDF content');

      axios.mockResolvedValue({
        data: mockPdfBuffer,
        headers: { 'content-type': 'application/pdf' },
      });

      await cteService.getPDFByChave(serial);

      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('cte.fazenda.sc.gov.br'),
        })
      );
    });

    it('deve lançar erro quando resposta não é PDF', async () => {
      const serial = '42345678901234567890123456789012345678901234';

      axios.mockResolvedValue({
        data: Buffer.from('HTML content'),
        headers: { 'content-type': 'text/html' },
      });

      await expect(cteService.getPDFByChave(serial)).rejects.toThrow(
        'Resposta não é um PDF válido'
      );
    });

    it('deve lançar erro quando a requisição falha', async () => {
      const serial = '42345678901234567890123456789012345678901234';
      const errorMessage = 'Erro de conexão';

      axios.mockRejectedValue(new Error(errorMessage));

      await expect(cteService.getPDFByChave(serial)).rejects.toThrow(
        errorMessage
      );
    });
  });

  describe('getURLConsultaPorEstado', () => {
    it('deve retornar URL correta para SC', () => {
      const serial = '42345678901234567890123456789012345678901234';
      const url = cteService.getURLConsultaPorEstado(serial);

      expect(url).toBe('https://cte.fazenda.sc.gov.br/dacte.aspx');
    });

    it('deve retornar URL correta para SP', () => {
      const serial = '35345678901234567890123456789012345678901234';
      const url = cteService.getURLConsultaPorEstado(serial);

      expect(url).toBe('https://nfe.fazenda.sp.gov.br/CTeConsulta/dacte.aspx');
    });

    it('deve retornar URL correta para PR', () => {
      const serial = '41345678901234567890123456789012345678901234';
      const url = cteService.getURLConsultaPorEstado(serial);

      expect(url).toBe('http://www.fazenda.pr.gov.br/dacte/consulta');
    });

    it('deve retornar URL de SC como fallback para estado desconhecido', () => {
      const serial = '99345678901234567890123456789012345678901234';
      const url = cteService.getURLConsultaPorEstado(serial);

      expect(url).toBe('https://cte.fazenda.sc.gov.br/dacte.aspx');
    });
  });
});

