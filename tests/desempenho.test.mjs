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
