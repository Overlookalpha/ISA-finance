import {doc,runTransaction} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {normalizarCliente} from './desempenho.mjs?v=clientes-lista-1';
import {catalogarClientes,resolverNomeCliente,sugerirNomesCliente,validarCorrecaoNome} from './clientes-modelo.mjs?v=clientes-lista-1';
export function iniciarClientes({db,auth,obterDados,atualizarPainel,abrirResumo,moeda}){
 const el=id=>document.getElementById(id),dialogo=el('editarNomeClienteDialog');let catalogo=[],selecionado=null,revisto=null,ocupado=false;
 const ref=doc(db,'configuracoes','nomes-clientes');
 function status(texto){el('previaCorrecaoCliente').textContent=texto;}
 function renderizar(){
  const {cadastros,movimentos,correcoes}=obterDados(),ano=el('clientesAno').value,termo=normalizarCliente(el('buscaCliente').value);
  catalogo=catalogarClientes(cadastros,movimentos,ano,correcoes);
  const lista=catalogo.filter(c=>normalizarCliente([c.nome,...c.originais,...c.contactos].join(' ')).includes(termo));
  el('resultadoCliente').replaceChildren();el('totalClientesLista').textContent=`${lista.length} de ${catalogo.length} cliente(s) · recebimentos de ${ano} até hoje.`;
  lista.forEach(c=>{
   const card=document.createElement('article');card.className='cliente-lista-card';
   const nome=document.createElement('button');nome.type='button';nome.className='cliente-resumo-link';nome.textContent=c.nome;nome.addEventListener('click',()=>abrirResumo(c.nome,ano));
   const estrelas=document.createElement('span');estrelas.className='ranking-estrelas';estrelas.textContent=c.estrelas?'★'.repeat(c.estrelas)+'☆'.repeat(5-c.estrelas):'Sem avaliação';estrelas.setAttribute('aria-label',c.estrelas?`${c.estrelas} de 5 estrelas em ${ano}`:'Sem recebimentos neste ano');
   const total=document.createElement('strong');total.textContent=moeda(c.total);
   const detalhe=document.createElement('small');detalhe.textContent=`${c.entradas} entrada(s) no ano${c.contactos.length?' · '+c.contactos.join(' · '):''}`;
   const editar=document.createElement('button');editar.type='button';editar.className='editar-cliente-botao';editar.textContent='Editar nome';editar.addEventListener('click',()=>abrirEdicao(c));
   const semelhantes=sugerirNomesCliente(c.nome,catalogo.map(o=>o.nome));
   card.append(nome,estrelas,total,detalhe,editar);
   if(semelhantes.length){const dica=document.createElement('small');dica.className='sugestao-cliente';dica.textContent='Grafia parecida: '+semelhantes.join(', ')+'. Se for a mesma pessoa, confirme em Editar nome.';card.appendChild(dica);}
   el('resultadoCliente').appendChild(card);
  });
  if(!lista.length)el('resultadoCliente').textContent='Nenhum cliente encontrado. Pode procurar também por uma grafia anterior.';
 }
 function invalidar(){revisto=null;el('confirmarNomeCliente').hidden=true;el('confirmarNomeCliente').textContent='Confirmar correção';status('');}
 function abrirEdicao(c){selecionado=c;el('nomeClienteOriginal').textContent='Nome atual: '+c.nome;el('nomeClienteNovo').value=c.nome;invalidar();el('sugestoesNomeCliente').replaceChildren();
  sugerirNomesCliente(c.nome,catalogo.map(c=>c.nome)).forEach(nome=>{const b=document.createElement('button');b.type='button';b.textContent='Usar '+nome;b.addEventListener('click',()=>{el('nomeClienteNovo').value=nome;invalidar();});el('sugestoesNomeCliente').appendChild(b);});
  const {correcoes}=obterDados();el('desfazerNomesCliente').replaceChildren();
  Object.entries(correcoes).filter(([origem,destino])=>destino && normalizarCliente(resolverNomeCliente(origem,correcoes))===c.chave).forEach(([origem])=>{const b=document.createElement('button');b.type='button';b.textContent='Separar / repor nome anterior: '+origem;b.addEventListener('click',()=>{revisto={origem,novo:'',desfazer:true,anterior:correcoes[origem]};el('confirmarNomeCliente').hidden=false;el('confirmarNomeCliente').textContent='Confirmar separação';status('Confirme para remover apenas esta correção. Os lançamentos originais continuarão associados ao nome anterior: '+origem+'.');el('confirmarNomeCliente').hidden=false;});el('desfazerNomesCliente').appendChild(b);});
  if(!el('desfazerNomesCliente').children.length)el('desfazerNomesCliente').textContent='Não há correções anteriores para este cliente.';
  dialogo.showModal();
 }
 el('nomeClienteNovo').addEventListener('input',invalidar);
 el('reverCorrecaoCliente').addEventListener('click',()=>{
  if(!selecionado)return;
  try{
   const {correcoes,movimentos}=obterDados(),novo=validarCorrecaoNome(selecionado.nome,el('nomeClienteNovo').value,correcoes);
   if(novo===selecionado.nome)return status('O nome já está igual. Pode fechar a edição.');
   const destino=resolverNomeCliente(novo,correcoes),existente=catalogo.find(c=>c.chave===normalizarCliente(destino) && c.chave!==selecionado.chave);
   const quantidade=movimentos.filter(m=>normalizarCliente(resolverNomeCliente(m.clienteNome,correcoes))===selecionado.chave).length;
   revisto={origem:selecionado.nome,novo,destino,anterior:correcoes[selecionado.chave] || ''};
   status(`Alterar “${selecionado.nome}” para “${destino}”. ${quantidade} entrada(s) serão apresentadas com este nome. ${existente ? 'Já existe esse cliente: confirmar vai reunir os nomes e os recebimentos dele. Só confirme se forem a mesma pessoa.' : 'Os nomes originais e todos os valores ficam preservados.'}`);
   el('confirmarNomeCliente').hidden=false;el('confirmarNomeCliente').textContent=existente?'Confirmar que é o mesmo cliente':'Confirmar correção';
  }catch(erro){revisto=null;el('confirmarNomeCliente').hidden=true;status(erro.message);}
 });
 el('formEditarNomeCliente').addEventListener('submit',async e=>{
  e.preventDefault();if(ocupado||!revisto)return;if(!auth.currentUser)return status('Inicie sessão para guardar.');const proposta={...revisto};ocupado=true;dialogo.querySelectorAll('button,input').forEach(b=>b.disabled=true);
  try{await runTransaction(db,async tx=>{const snap=await tx.get(ref),atuais=snap.exists()?(snap.data().correcoes||{}):{};if((atuais[normalizarCliente(proposta.origem)] || '')!==proposta.anterior)throw Error('O nome foi alterado noutro dispositivo. Atualize e reveja.');if(!proposta.desfazer){validarCorrecaoNome(proposta.origem,proposta.novo,atuais);if(resolverNomeCliente(proposta.novo,atuais)!==proposta.destino)throw Error('O destino foi alterado. Atualize e reveja.');}tx.set(ref,{correcoes:{[normalizarCliente(proposta.origem)]:proposta.novo}},{merge:true});});status('Correção guardada. A atualizar a lista…');await atualizarPainel();dialogo.close();}
  catch(erro){console.error('Erro ao corrigir nome:',erro);status('Não foi possível confirmar a correção. Atualize o painel e tente novamente.');}
  finally{ocupado=false;dialogo.querySelectorAll('button,input').forEach(b=>b.disabled=false);}
 });
 el('fecharEditarNomeCliente').addEventListener('click',()=>dialogo.close());dialogo.addEventListener('cancel',e=>{if(ocupado)e.preventDefault();});
 el('buscaCliente').addEventListener('input',renderizar);el('btnBuscarCliente').addEventListener('click',renderizar);el('buscaCliente').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();renderizar();}});el('clientesAno').addEventListener('change',renderizar);
 return {atualizar(){const {movimentos}=obterDados(),anterior=el('clientesAno').value,anos=[...new Set([String(new Date().getFullYear()),...movimentos.map(m=>String(m.data.getFullYear()))])].sort().reverse();el('clientesAno').replaceChildren(...anos.map(a=>{const op=document.createElement('option');op.value=a;op.textContent=a;return op;}));el('clientesAno').value=anos.includes(anterior)?anterior:String(new Date().getFullYear());renderizar();}};
}
