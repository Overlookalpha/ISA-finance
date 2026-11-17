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


## Estrelas anuais
As estrelas usam todas as entradas do ano selecionado, independentemente da vista mensal ou anual. O Top 10 mensal conserva os valores e a ordenação do mês; as estrelas e o detalhe do formulário usam valor e frequência anuais. Mantém-se o critério 60% valor / 40% frequência, sem misturar anos. Verificado com um cliente que recebeu pouco num mês e mais noutro.


## Resumo anual ao clicar no cliente
O nome no Top 10 e na pesquisa abre um diálogo com escolha do ano, total recebido até à data atual, número de entradas, média, totais mensais e detalhe de entradas. Consulta os registos novamente ao abrir. Exclui valores futuros, fundos e movimentos sem nome associado. Não altera dados e não desconta as partes/despesas do total recebido do cliente.


## Lista completa e correção de grafias
Clientes mostra todos os nomes do cadastro e dos recebimentos, com filtro de ano, estrelas anuais e total até hoje; quem não recebeu no ano continua listado sem avaliação. Nome abre o resumo.
Editar nome sugere grafias semelhantes por distância de escrita, sem confirmar identidade automaticamente. Rever alteração apresenta o impacto; a união de nomes requer confirmação explícita. As correções são guardadas atomicamente em configuracoes/nomes-clientes e resolvidas na interface, no ranking, nas sugestões de entrada, no resumo e no retorno. Os documentos originais e valores não são reescritos. Desfazer uma correção repõe a associação aos nomes anteriores. Conflitos simultâneos de correção abortam para revisão.
Verificações: 16 testes de cálculos e nomes; prévia local sem gravação na produção confirmou união de duas grafias e reposição, incluindo preservação da soma recebida.
