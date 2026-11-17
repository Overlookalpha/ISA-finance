const {test}=require('node:test');
const assert=require('node:assert/strict');const fs=require('node:fs'),vm=require('node:vm');
test('abre resumo com os recebimentos existentes sem esperar atualização de rede',async()=>{
 const fonte=fs.readFileSync('js/admin.js','utf8');const inicio=fonte.indexOf('async function abrirResumoCliente('),fim=fonte.indexOf('document.getElementById("fecharResumoCliente")',inicio);
 const campos=new Map();const el=id=>{if(!campos.has(id))campos.set(id,{textContent:'',hidden:false});return campos.get(id);};
 let consultas=0,renderizados=0;
 const contexto={normalizarCliente:n=>n.trim().toLowerCase(),pedidoResumoCliente:0,clienteResumoAtual:'',document:{getElementById:el,createElement:()=>({})},Date,console,
 movimentosDesempenho:[{clienteNome:'Cliente exemplo',valor:100,data:new Date(2026,1,10)}],
 seletorAnoCliente:{disabled:true,replaceChildren(...opcoes){this.opcoes=opcoes;}},dialogoCliente:{open:false,showModal(){this.open=true;}},
 carregarRelatorios:()=>{consultas++;return new Promise(()=>{});},renderizarResumoCliente:()=>{renderizados++;}};
 vm.createContext(contexto);vm.runInContext(fonte.slice(inicio,fim),contexto);
 await contexto.abrirResumoCliente('Cliente exemplo','2026');
 assert.equal(consultas,0);assert.equal(renderizados,1);assert.equal(contexto.seletorAnoCliente.disabled,false);assert.equal(contexto.seletorAnoCliente.value,'2026');assert.equal(contexto.dialogoCliente.open,true);
});
