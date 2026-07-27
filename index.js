const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do MongoDB e da Chave de Autenticação via variáveis de ambiente
const url = process.env.MONGO_URL;
const API_KEY_SECRETA = process.env.API_KEY;

const client = new MongoClient(url);
const nomeBanco = 'sindicalizacoes';
const nomeColecao = 'convencoes';

app.use(express.json());

// ==========================================
// MIDDLEWARE DE AUTENTICAÇÃO (API KEY)
// ==========================================
const verificarAutenticacao = (req, res, next) => {
    // Busca a chave no cabeçalho 'x-api-key' ou 'Authorization'
    const chaveRecebida = req.headers['x-api-key'] || req.headers['authorization'];

    if (!chaveRecebida || chaveRecebida !== API_KEY_SECRETA) {
        return res.status(401).json({ 
            erro: "Acesso negado. API Key inválida ou não fornecida no cabeçalho." 
        });
    }
    
    next(); // Chave correta, prossegue para a rota
};

// Rota GET protegida pelo middleware 'verificarAutenticacao'
app.get('/buscar', verificarAutenticacao, async (req, res) => {
    const { cnpj, datainicio, datafim } = req.query;

    if (!cnpj || !datainicio || !datafim) {
        return res.status(400).json({ 
            erro: "Parâmetros 'cnpj', 'datainicio' e 'datafim' são obrigatórios na URL." 
        });
    }

    try {
        await client.connect();
        const db = client.db(nomeBanco);
        const colecao = db.collection(nomeColecao);

        // Cria dinamicamente o array de $or para até 10 CNPJs
        const cnpjFields = Array.from({ length: 10 }, (_, i) => ({
        [`cnpj_${i + 1}`]: cnpj
        }));

        // Montagem da query com as datas convertidas
        const query = {
        $or: cnpjFields,
        "filtroPesquisado.dataInicio": { $gte: datainicio, $lte: datafim },
        };

        console.log(`[Express] Buscando registros para o CNPJ ${cnpj}`);
        
        const resultados = await colecao.find(query).toArray();

        return res.status(200).json({
            total: resultados.length,
            dados: resultados
        });

    } catch (erro) {
        console.error("[Express] Erro ao buscar no MongoDB:", erro);
        return res.status(500).json({ erro: "Erro interno ao consultar o banco de dados." });
    } finally {
        await client.close();
    }
});

app.listen(PORT, () => {
    console.log(`Servidor Express rodando com sucesso na porta ${PORT}`);
});
