import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalogarClientes,resolverNomeCliente,sugerirNomesCliente,validarCorrecaoNome} from '../js/clientes-modelo.mjs';
const agora=new Date(2026,10,17),m=(nome,valor,ano=2026)=>({clienteNome:nome,valor,data:new Date(ano,0,5)});
test('lista todos os clientes, incluindo sem entradas e nomes só usados em lançamentos',()=>{
 const r=catalogarClientes([{nome:'Anita'},{nome:'Sem entradas'}],[m('Anite',40),m('Antigo',20,2025)],2026,{},agora);
 assert.equal(r.length,4);assert.equal(r.find(c=>c.nome==='Sem entradas').estrelas,null);assert.equal(r.find(c=>c.nome==='Antigo').total,0);
});
test('correção reúne valores sem alterar lançamentos e pode ser desfeita',()=>{
 const dados=[m('Anita',60),m('Anite',40)],antes=JSON.stringify(dados);
 const r=catalogarClientes([{nome:'Anita'},{nome:'Anite'}],dados,2026,{'anite':'Anita'},agora);
 assert.equal(r.length,1);assert.equal(r[0].total,100);assert.equal(r[0].entradas,2);assert.equal(JSON.stringify(dados),antes);
 const separado=catalogarClientes([],dados,2026,{'anite':''},agora);assert.equal(separado.length,2);assert.equal(separado.reduce((s,c)=>s+c.total,0),100);
});
test('sugestões de grafia são sugestões, nunca correções automáticas',()=>{
 assert.ok(sugerirNomesCliente('Anite',['Anita','Carlos']).includes('Anita'));
 assert.equal(resolverNomeCliente('Anite',{}),'Anite');
 assert.throws(()=>validarCorrecaoNome('Anita','Anite',{'anite':'Anita'}));
 assert.equal(resolverNomeCliente('Anite',{'anite':'Anita','anita':'Anita Silva'}),'Anita Silva');
});
