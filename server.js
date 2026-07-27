const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
// O Railway injeta automaticamente a variável PORT. Se não houver, usa a 3000 localmente.
const PORT = process.env.PORT || 3000;

// Configuração do MongoDB (Substitua pela sua URL caso não use variáveis de ambiente)
const url = process.env.MONGO_URL;
const client = new MongoClient(url);
const nomeBanco = 'sindicalizacoes';
const nomeColecao = 'convencoes';

app.use(express.json());

// Rota GET esperando os parâmetros: cnpj, datainicio e datafim
app.get('/buscar', async (req, res) => {
    const { cnpj, datainicio, datafim } = req.query;

    // Validação básica dos parâmetros obrigatórios
    if (!cnpj || !datainicio || !datafim) {
        return res.status(400).json({ 
            erro: "Parâmetros 'cnpj', 'datainicio' e 'datafim' são obrigatórios na URL." 
        });
    }

    try {
        await client.connect();
        const db = client.db(nomeBanco);
        const colecao = db.collection(nomeColecao);

        // Montagem da query de busca no MongoDB
        const query = {
            // 1. Cria dinamicamente o array de $or para até 15 CNPJs
            const cnpjFields = Array.from({ length: 15 }, (_, i) => ({
              [`cnpj_${i + 1}`]: cnpj
            }));
            
            // 2. Montagem da query com o "between" nas datas
            const query = {
              $or: cnpjFields,
              "filtroPesquisado.dataInicio": { $gte: datainicio },
              "filtroPesquisado.dataFim": { $lte: datafim }
            };
        };

        console.log(`[Express] Buscando registros para o CNPJ ${cnpj} no período ${datainicio} - ${datafim}`);
        
        // Executa a busca e transforma os resultados em Array
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

// Inicializa o servidor
app.listen(PORT, () => {
    console.log(`Servidor Express rodando com sucesso na porta ${PORT}`);
});
