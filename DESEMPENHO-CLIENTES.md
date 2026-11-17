# Ranking e desempenho dos clientes

- Ranking Top 10 por valor recebido, com filtros de mês e ano.
- Estrelas relativas ao período: pontuação = 60 × (recebimentos do cliente / maior recebimento) + 40 × (entradas do cliente / maior frequência). Faixas de 20 pontos, de 1 a 5 estrelas.
- Sem recebimentos associados no período: sem avaliação. Não é score de crédito nem classificação de confiança.
- Apenas recebimentos positivos; fundo separado não participa. Valores sem cliente entram no total, mas não no ranking.
- Observações continuam gravadas na entrada. Descrição preservada como campo opcional.
- Leitura do cenário apresenta valor médio, comparação com o período anterior (que pode estar incompleto) e concentração por cliente. Não prevê receitas.

Verificação: node --test tests/desempenho.test.mjs
Prévia visual conferida com dados fictícios, sem gravações no banco.
