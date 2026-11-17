import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resumirPeriodo,periodoAnterior} from '../js/desempenho.mjs';
const m=(nome,valor,ano,mes,tipo='entrada')=>({clienteNome:nome,valor,data:new Date(ano,mes-1,15),tipo});
test('mensal e anual preservam a separação de anos e ignoram fundo',()=>{
const dados=[m('Ana',100,2026,11),m('Ana',50,2026,10),m('Ana',900,2025,11),m('Bia',80,2026,11),m('Ana',1000,2026,11,'fundo')];
assert.equal(resumirPeriodo(dados,'mensal','2026-11').total,180);
assert.equal(resumirPeriodo(dados,'anual','2026').total,230);
});
test('estrelas por valor e frequência, cliente sem histórico não recebe nota',()=>{
let r=resumirPeriodo([m('Ana',100,2026,11),m(' ana ',100,2026,11),m('Bia',20,2026,11)],'mensal','2026-11');
assert.equal(r.clientes.length,2);assert.equal(r.clientes[0].estrelas,5);assert.equal(r.clientes[1].estrelas,2);
assert.equal(r.clientes[0].entradas,2);assert.equal(resumirPeriodo([],'anual','2026').clientes.length,0);
});
test('totais incluem recebimentos sem cliente, sem inventar associação',()=>{
const r=resumirPeriodo([m('',100,2026,11),m('Ana',50,2026,11)],'mensal','2026-11');assert.equal(r.total,150);assert.equal(r.ticket,75);assert.equal(r.clientes.length,1);
});
test('virada de ano e comparação anual',()=>{assert.equal(periodoAnterior('mensal','2026-01'),'2025-12');assert.equal(periodoAnterior('anual','2026'),'2025');});

import {progressoMeta,apurarLucro,clientesSemRetorno} from '../js/desempenho.mjs';
test('meta não definida, meta alcançada e progresso acima de 100%',()=>{
assert.equal(progressoMeta(100,0).definida,false);
assert.deepEqual(progressoMeta(120,100),{definida:true,percentual:120,barra:100,falta:0});
assert.equal(progressoMeta(45.5,100).falta,54.5);
});
test('lucro desconta partes e despesas uma vez, permite prejuízo',()=>{
assert.equal(apurarLucro(1000,200,240).lucro,560);
assert.equal(apurarLucro(100,120,24).lucro,-44);
assert.equal(apurarLucro(0.3,0.1,0.1).lucro,0.1);
});
test('sem intervalos anteriores usa 30 dias, sem inventar ausentes',()=>{
const hoje=new Date(2026,10,17),entrada=(nome,data)=>({clienteNome:nome,valor:10,data});
const r=clientesSemRetorno([entrada('Ana',new Date(2026,9,18)),entrada('Bia',new Date(2026,9,19)),entrada('Futuro',new Date(2026,11,1))],hoje);
assert.equal(r.length,1);assert.equal(r[0].nome,'Ana');assert.equal(r[0].prazo,30);assert.equal(r[0].padrao,true);
});
test('aprende mediana de retorno, ignora vários pagamentos no mesmo dia',()=>{
const entrada=data=>({clienteNome:'Ana',valor:10,data});
const r=clientesSemRetorno([entrada(new Date(2026,9,1)),entrada(new Date(2026,9,11)),entrada(new Date(2026,9,11,12)),entrada(new Date(2026,9,21))],new Date(2026,10,1));
assert.equal(r[0].prazo,10);assert.equal(r[0].intervalos,2);assert.equal(r[0].dias,11);
});
test('cliente com ciclo longo não é avisado automaticamente aos 30 dias',()=>{
const r=clientesSemRetorno([{clienteNome:'Ana',valor:10,data:new Date(2026,5,1)},{clienteNome:'Ana',valor:10,data:new Date(2026,7,1)}],new Date(2026,8,1));assert.equal(r.length,0);
});

import {analisarRetornoClientes} from '../js/desempenho.mjs';
test('prazo manual só altera o cliente escolhido, preserva automático e padrão 30',()=>{
const dados=[m('Ana',10,2026,8),m('Ana',10,2026,9),m('Bia',10,2026,9)],hoje=new Date(2026,10,17);
const r=analisarRetornoClientes(dados,hoje,{'ana':100});
assert.equal(r.find(c=>c.nome==='Ana').prazo,100);assert.equal(r.find(c=>c.nome==='Ana').prazoAutomatico,31);
assert.equal(r.find(c=>c.nome==='Bia').prazo,30);
assert.ok(!clientesSemRetorno(dados,hoje,{'ana':100}).some(c=>c.nome==='Ana'));
assert.ok(clientesSemRetorno(dados,hoje,{'ana':0}).some(c=>c.nome==='Ana'));
});
test('prazo inválido ignora substituição e cliente sem atraso pode ser configurado',()=>{
const dados=[m('Ana',10,2026,11)],hoje=new Date(2026,10,17);
assert.equal(analisarRetornoClientes(dados,hoje,{'ana':-1})[0].prazo,30);
assert.equal(analisarRetornoClientes(dados,hoje,{'ana':2})[0].prazo,2);
assert.equal(clientesSemRetorno(dados,hoje,{'ana':2}).length,1);
});

test('estrelas mensais usam todo o ano e mantêm totais mensais',()=>{
const dados=[m('Ana',10,2026,11),m('Ana',990,2026,1),m('Bia',100,2026,11),m('Bia',99999,2025,11)];
const novembro=resumirPeriodo(dados,'mensal','2026-11'),anual=resumirPeriodo(dados,'anual','2026'),janeiro=resumirPeriodo(dados,'mensal','2026-01');
const ana=novembro.clientes.find(c=>c.nome==='Ana');
assert.equal(ana.total,10);assert.equal(ana.totalAnual,1000);assert.equal(ana.entradasAnuais,2);assert.equal(ana.estrelas,5);
for(const c of novembro.clientes) assert.equal(c.estrelas,anual.clientes.find(a=>a.chave===c.chave).estrelas);
assert.equal(janeiro.clientes[0].estrelas,ana.estrelas);assert.equal(novembro.total,110);
assert.ok(novembro.clientes.find(c=>c.nome==='Bia').estrelas<5);
});
