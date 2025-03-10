// Configuração do CORS para múltiplas origens
const allowedOrigins = [
  "http://localhost:3060",
  "http://127.0.0.1:3060",
  // Adicione outras origens permitidas conforme necessário
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requisições sem origem (como apps mobile ou curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Bloqueado pelo CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  optionsSuccessStatus: 200,
};

module.exports = corsOptions;
