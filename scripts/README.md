# Script de Importação de Dados

## Importar dados do CSV para precos_faixas

Este script importa os dados do arquivo `Transp.csv` para a tabela `precos_faixas` do banco de dados.

### Como usar:

```bash
node scripts/importTranspCSV.js
```

### O que o script faz:

1. **Cria/Busca Estados**: Cria estados baseado na coluna UF do CSV
2. **Cria/Busca Cidades**: Cria cidades de origem e destino baseado nas colunas do CSV
3. **Cria/Busca Transportadoras**: Cria transportadoras baseado na coluna Transportadora
4. **Cria/Busca Rotas**: Cria rotas (origem -> destino) para cada combinação
5. **Cria Faixas de Peso**: Cria as faixas de peso (Até 10kg, Até 20kg, etc.) se não existirem
6. **Cria Preços**: Cria registros de preços para cada combinação de rota, transportadora e faixa de peso

### Estrutura do CSV esperada:

- `Transportadora`: Nome da transportadora
- `CIDADE ORIGEM`: Cidade de origem
- `CIDADE DESTINO`: Cidade de destino
- `UF`: Estado (sigla)
- `Até 10kg`, `Até 20kg`, etc.: Preços para cada faixa de peso
- `TX Embarque`, `Frete Peso`, `TX ADM`, `GRIS`, `TDE`, `TAXA QUIMICO`: Taxas adicionais

### Observações:

- O script evita duplicatas verificando se os registros já existem
- Valores monetários são convertidos automaticamente (R$ 35,00 -> 35.00)
- Porcentagens são convertidas para decimais (0,50% -> 0.005)
- A data de vigência inicial é definida como a data atual

