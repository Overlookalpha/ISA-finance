# Ranking e desempenho dos clientes

- Ranking Top 10 por valor recebido, com filtros de mês e ano.
- Estrelas relativas ao período: pontuação = 60 × (recebimentos do cliente / maior recebimento) + 40 × (entradas do cliente / maior frequência). Faixas de 20 pontos, de 1 a 5 estrelas.
- Sem recebimentos associados no período: sem avaliação. Não é score de crédito nem classificação de confiança.
- Apenas recebimentos positivos; fundo separado não participa. Valores sem cliente entram no total, mas não no ranking.
- Observações continuam gravadas na entrada. Descrição preservada como campo opcional.
- Leitura do cenário apresenta valor médio, comparação com o período anterior (que pode estar incompleto) e concentração por cliente. Não prevê receitas.

Verificação: node --test tests/desempenho.test.mjs
Prévia visual conferida com dados fictícios, sem gravações no banco.


## Metas, retorno e lucro
- Meta guardada por mês em configuracoes/gestao-AAAA-MM; barra limitada visualmente a 100%, percentagem real pode ultrapassar 100%.
- Clientes sem retorno: mediana dos intervalos de dias entre recebimentos associados, agrupando múltiplos recebimentos do mesmo dia. Sem intervalos anteriores, 30 dias. Referência é o dia atual, independente do filtro do ranking. Não há envio automático de mensagens.
- Lucro: recebimentos do mês menos partes registadas de Isaías/Evelyn e despesas não anuladas. Não desconta fundo nem saques novamente.
- Despesas guardadas na coleção despesas, com data, descrição e montante. Anulação reversível; sem apagar registos. Qualquer alteração invalida a conferência de despesas do mês na mesma operação atómica.
- O resultado aparece como provisório até o utilizador confirmar a conferência de despesas. Não representa lucro contabilístico independente dos registos introduzidos.
- Verificações: nove testes de cálculos; prévia isolada com persistência simulada para guardar meta, conferir despesas, adicionar e anular despesa; layout mobile. Nenhuma transação financeira de teste foi gravada na produção.


## Prazo manual por cliente
Em Clientes → Clientes que não voltaram, escolha um cliente, introduza os dias e guarde. O ajuste é persistido em configuracoes/retorno-clientes, por nome normalizado, sem mudar recebimentos nem o histórico. Vazio ou Usar automático repõe o ciclo habitual calculado ou os 30 dias padrão. A seleção inclui também clientes que ainda não atingiram o prazo. Cálculo e gravação foram verificados em prévia isolada, sem alterar clientes reais.
