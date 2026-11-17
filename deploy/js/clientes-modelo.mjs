import {normalizarCliente,resumirPeriodo} from './desempenho.mjs?v=clientes-lista-1';
export function resolverNomeCliente(nome,correcoes={}){
 const original=String(nome||'').trim();let atual=original;const vistos=new Set();
 for(let i=0;i<50;i++){
  const chave=normalizarCliente(atual);if(!chave || !Object.prototype.hasOwnProperty.call(correcoes,chave))return atual;
  const proximo=String(correcoes[chave]||'').trim();if(!proximo)return atual;
  if(normalizarCliente(proximo)===chave)return proximo;
  if(vistos.has(chave))return original;vistos.add(chave);atual=proximo;
 }
 return original;
}
export function catalogarClientes(cadastros,movimentos,ano,correcoes={},agora=new Date()){
 const clientes=new Map();
 function adicionar(nome,cadastro){const original=String(nome||'').trim();if(!original)return;const resolvido=resolverNomeCliente(original,correcoes),chave=normalizarCliente(resolvido);const c=clientes.get(chave)||{nome:resolvido,chave,originais:new Set(),contactos:new Set(),total:0,entradas:0,estrelas:null};c.originais.add(original);if(cadastro){if(cadastro.telefone)c.contactos.add(String(cadastro.telefone));if(cadastro.email)c.contactos.add(String(cadastro.email));}clientes.set(chave,c);}
 cadastros.forEach(c=>adicionar(c.nome,c));movimentos.forEach(m=>adicionar(m.clienteNome));
 const validos=movimentos.filter(m=>m.data instanceof Date && m.data<=agora).map(m=>({...m,clienteNome:resolverNomeCliente(m.clienteNome,correcoes)}));
 resumirPeriodo(validos,'anual',String(ano)).clientes.forEach(c=>{if(clientes.has(c.chave))Object.assign(clientes.get(c.chave),{total:c.total,entradas:c.entradas,estrelas:c.estrelas});});
 return [...clientes.values()].map(c=>({...c,originais:[...c.originais],contactos:[...c.contactos]})).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-PT'));
}
const comparavel=s=>normalizarCliente(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function distancia(a,b){let linha=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const nova=[i];for(let j=1;j<=b.length;j++)nova[j]=Math.min(nova[j-1]+1,linha[j]+1,linha[j-1]+(a[i-1]===b[j-1]?0:1));linha=nova;}return linha[b.length];}
export function sugerirNomesCliente(nome,nomes){const a=comparavel(nome);if(a.length<3)return [];return [...new Set(nomes)].filter(n=>normalizarCliente(n)!==normalizarCliente(nome)).map(nome=>({nome,distancia:distancia(a,comparavel(nome))})).filter(n=>n.distancia<=1 || (a.length>=8 && n.distancia<=2)).sort((a,b)=>a.distancia-b.distancia || a.nome.localeCompare(b.nome)).slice(0,3).map(n=>n.nome);}
export function validarCorrecaoNome(original,novo,correcoes={}){
 const a=normalizarCliente(original),b=normalizarCliente(novo);if(!a || !b || novo.trim().length>120)throw Error('Informe um nome entre 1 e 120 caracteres.');
 if(a!==b && normalizarCliente(resolverNomeCliente(novo,correcoes))===a)throw Error('Este nome aponta para o nome atual. Escolha outro nome para evitar uma correção circular.');
 return novo.trim().replace(/\s+/g,' ');
}
