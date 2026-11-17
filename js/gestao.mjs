import { collection, doc, getDoc, getDocs, query, where, setDoc, writeBatch, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { progressoMeta, apurarLucro, analisarRetornoClientes, normalizarCliente } from './desempenho.mjs?v=estrelas-anuais-1';

export function iniciarGestao({db, auth, mesReferencia, atualizarPainel, moeda}) {
    const el = id => document.getElementById(id);
    let versao = 0, mesCarregado = '', recebido = 0, partes = 0, despesas = [], configuracao = {}, ocupado = false;
    const refMes = mes => doc(db,'configuracoes','gestao-'+mes);
    const refRetorno = doc(db,'configuracoes','retorno-clientes');
    let historicoRetorno = [], prazosManuais = {}, retornoCarregado = false;
    const status = mensagem => { document.querySelectorAll('.status-gestao').forEach(no=>no.textContent=mensagem); };
    const hojeTexto = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
    const dataValida = texto => {if(!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;const [a,m,d]=texto.split('-').map(Number),v=new Date(a,m-1,d);return v.getFullYear()===a && v.getMonth()===m-1 && v.getDate()===d;};
    el('despesaData').value = hojeTexto();

    function renderizar() {
        const soma = despesas.filter(d=>!d.anulada).reduce((s,d)=>s+Math.round(Number(d.valor)*100),0)/100;
        const resultado=apurarLucro(recebido,soma,partes).lucro, meta=progressoMeta(recebido,Number(configuracao.meta || 0));
        el('metaPeriodo').textContent='Mês selecionado: '+mesCarregado.slice(5)+'/'+mesCarregado.slice(0,4);
        el('metaValor').value=configuracao.meta || '';
        el('metaBarra').value=meta.barra;
        el('metaResumo').textContent=meta.definida ? `${meta.percentual.toFixed(1)}% da meta · ${moeda(recebido)} de ${moeda(Number(configuracao.meta))}. ${meta.falta>0 ? 'Faltam '+moeda(meta.falta)+'.' : 'Meta atingida!'}` : 'Defina uma meta para acompanhar o progresso deste mês.';
        el('lucroRecebido').textContent=moeda(recebido);
        el('lucroDespesas').textContent=moeda(soma);
        el('linhaPartesLucro').hidden=false;
        el('lucroPartes').textContent=moeda(partes);
        el('lucroTotal').textContent=moeda(resultado);
        el('lucroTotal').classList.toggle('resultado-negativo',resultado<0);
        el('rotuloLucro').textContent=configuracao.despesasConferidas ? 'Lucro apurado após pagamentos e despesas' : 'Resultado provisório após pagamentos e despesas';
        el('despesasConferidas').checked=!!configuracao.despesasConferidas;
        el('lucroDetalhe').textContent=(configuracao.despesasConferidas ? 'Despesas conferidas por si. ' : 'As despesas deste mês ainda não foram conferidas. ') + (recebido>0 ? `Margem sobre recebimentos: ${(resultado/recebido*100).toFixed(1)}%.` : 'Sem recebimentos no período para calcular a margem.');
        el('listaDespesas').replaceChildren();
        if(!despesas.length){const li=document.createElement('li');li.textContent='Nenhuma despesa registada neste mês. Confirme se não existem custos em falta.';el('listaDespesas').appendChild(li);}
        despesas.forEach(d=>{
            const li=document.createElement('li'),texto=document.createElement('span'),titulo=document.createElement('strong'),detalhe=document.createElement('small'),botao=document.createElement('button');
            titulo.textContent=d.descricao;detalhe.textContent=`${d.data.split('-').reverse().join('/')} · ${moeda(Number(d.valor))}${d.anulada ? ' · anulada (fora do cálculo)' : ''}`;
            texto.append(titulo,detalhe);botao.type='button';botao.textContent=d.anulada?'Repor':'Anular';botao.disabled=ocupado;
            botao.addEventListener('click',()=>executar(async()=>{const batch=writeBatch(db);batch.update(doc(db,'despesas',d.id),{anulada:!d.anulada,atualizadoEm:serverTimestamp()});batch.set(refMes(d.data.slice(0,7)),{despesasConferidas:false},{merge:true});await batch.commit();status(d.anulada?'Despesa reposta.':'Despesa anulada; pode repô-la.');await atualizarPainel();}));
            li.append(texto,botao);el('listaDespesas').appendChild(li);
        });
    }
    async function executar(acao) {
        if(ocupado)return;
        if(!auth.currentUser){status('Inicie sessão para guardar.');return;}
        ocupado=true;
        const botoes=[...document.querySelectorAll('#formMeta button,#guardarConferencia,#formDespesa button,#listaDespesas button,#formPrazoRetorno button')];botoes.forEach(b=>b.disabled=true);
        try{await acao();}catch(erro){console.error('Erro ao guardar indicadores:',erro);status('Não foi possível guardar. Os campos foram mantidos; tente novamente.');}
        finally{ocupado=false;botoes.forEach(b=>b.disabled=false);document.querySelectorAll('#listaDespesas button').forEach(b=>b.disabled=false);ativarControlesRetorno();}
    }
    el('formMeta').addEventListener('submit',e=>{e.preventDefault();if(mesCarregado!==mesReferencia.value)return status('Aguarde o carregamento do mês antes de guardar a meta.');const valor=Number(el('metaValor').value),mes=mesReferencia.value;if(!Number.isFinite(valor)||valor<0)return status('Informe uma meta válida ou 0 para retirar.');executar(async()=>{await setDoc(refMes(mes),{meta:Math.round(valor*100)/100},{merge:true});status('Meta guardada para '+mes+'.');await atualizarPainel();});});
    el('guardarConferencia').addEventListener('click',()=>{if(mesCarregado!==mesReferencia.value)return status('Aguarde o carregamento das despesas deste mês.');const mes=mesReferencia.value,conferida=el('despesasConferidas').checked;executar(async()=>{await setDoc(refMes(mes),{despesasConferidas:conferida,conferidoEm:serverTimestamp()},{merge:true});status('Conferência guardada para '+mes+'.');await atualizarPainel();});});
    el('formDespesa').addEventListener('submit',e=>{
        e.preventDefault();const valor=Number(el('despesaValor').value),descricao=el('despesaDescricao').value.trim(),data=el('despesaData').value;
        if(!Number.isFinite(valor)||valor<=0||!descricao||!dataValida(data))return status('Preencha descrição, valor positivo e uma data válida.');
        executar(async()=>{const batch=writeBatch(db);batch.set(doc(collection(db,'despesas')),{descricao,valor:Math.round(valor*100)/100,data,anulada:false,criadoEm:serverTimestamp(),criadoPor:auth.currentUser.uid});batch.set(refMes(data.slice(0,7)),{despesasConferidas:false},{merge:true});await batch.commit();el('despesaDescricao').value='';el('despesaValor').value='';status('Despesa guardada para '+data.split('-').reverse().join('/')+'. Confira novamente os custos do mês.');await atualizarPainel();});
    });
    function ativarControlesRetorno(){
        const escolhido=historicoRetorno.some(c=>c.chave===el('retornoClienteAjuste').value);
        el('retornoClienteAjuste').disabled=!retornoCarregado || ocupado;
        ['retornoPrazoManual','guardarPrazoRetorno','reporPrazoRetorno'].forEach(id=>el(id).disabled=!retornoCarregado || !escolhido || ocupado);
    }
    function mostrarPrazoSelecionado(){
        const cliente=historicoRetorno.find(c=>c.chave===el('retornoClienteAjuste').value);
        el('retornoPrazoManual').value=cliente?.manual ? cliente.prazo : '';
        el('retornoPrazoDetalhe').textContent=cliente ? `Automático para ${cliente.nome}: ${cliente.prazoAutomatico} dias (${cliente.padrao ? 'padrão, sem intervalos anteriores' : 'histórico de '+cliente.intervalos+' intervalo(s)'}). ${cliente.manual ? 'Prazo manual ativo: '+cliente.prazo+' dias.' : 'Automático ativo.'} O histórico continua preservado.` : 'Escolha um cliente. Um prazo manual aplica-se apenas a ele; vazio mantém o automático.';
        ativarControlesRetorno();
    }
    function guardarPrazoRetorno(automatico){
        const cliente=historicoRetorno.find(c=>c.chave===el('retornoClienteAjuste').value);
        if(!retornoCarregado || !cliente)return status('Escolha um cliente após carregar o histórico.');
        const texto=el('retornoPrazoManual').value.trim(),prazo=automatico || texto==='' ? 0 : Number(texto);
        if(!Number.isInteger(prazo) || prazo<0 || prazo>3650 || (texto!=='' && !automatico && prazo<1))return status('Informe um prazo inteiro entre 1 e 3650 dias, ou deixe vazio para usar o automático.');
        executar(async()=>{
            await setDoc(refRetorno,{prazosManuais:{[normalizarCliente(cliente.nome)]:prazo}},{merge:true});
            status(prazo ? `Prazo de ${prazo} dias guardado para ${cliente.nome}.` : `Retorno automático reposto para ${cliente.nome}.`);
            await atualizarPainel();
        });
    }
    el('retornoClienteAjuste').addEventListener('change',mostrarPrazoSelecionado);
    el('formPrazoRetorno').addEventListener('submit',e=>{e.preventDefault();guardarPrazoRetorno(false);});
    el('reporPrazoRetorno').addEventListener('click',()=>guardarPrazoRetorno(true));
    return {
        async carregar(mes,movimentos) {
            const pedido=++versao;
            const [a,m]=mes.split('-').map(Number),seguinte=new Date(a,m,1),fim=`${seguinte.getFullYear()}-${String(seguinte.getMonth()+1).padStart(2,'0')}-01`;
            el('metaResumo').textContent='A carregar meta…';
            el('metaBarra').value=0;el('lucroTotal').textContent='A carregar…';
            try {
                const [config,snap]=await Promise.all([getDoc(refMes(mes)),getDocs(query(collection(db,'despesas'),where('data','>=',mes+'-01'),where('data','<',fim)))]);
                if(pedido!==versao || mesReferencia.value!==mes)return;
                configuracao=config.exists()?config.data():{};despesas=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>b.data.localeCompare(a.data));
                recebido=0;partes=0;
                movimentos.forEach(m=>{const d=m.data;if(d && `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`===mes && m.tipo!=='fundo' && Number(m.valor)>0){recebido+=Math.round(Number(m.valor)*100);partes+=Math.round(Number(m.isaias||0)*100)+Math.round(Number(m.evelyn||0)*100);}});
                recebido/=100;partes/=100;
                if(mesCarregado!==mes)el('despesaData').value=hojeTexto().startsWith(mes)?hojeTexto():mes+'-01';
                mesCarregado=mes;renderizar();
            } catch(erro) {
                if(pedido!==versao || mesReferencia.value!==mes)return;mesCarregado='';console.error('Erro ao carregar metas e despesas:',erro);
                el('metaResumo').textContent='Não foi possível carregar a meta. Atualize o painel.';
                ['lucroRecebido','lucroDespesas','lucroPartes','lucroTotal'].forEach(id=>el(id).textContent='Indisponível');
                el('lucroDetalhe').textContent='Despesas não consultadas; nenhum lucro foi confirmado.';
                el('listaDespesas').textContent='Não foi possível carregar as despesas.';
            }
            try {
                const ajuste=await getDoc(refRetorno);
                if(pedido!==versao || mesReferencia.value!==mes)return;
                prazosManuais=ajuste.exists() ? (ajuste.data().prazosManuais || {}) : {};
                historicoRetorno=analisarRetornoClientes(movimentos,new Date(),prazosManuais);
                retornoCarregado=true;
                const anterior=el('retornoClienteAjuste').value;
                el('retornoClienteAjuste').replaceChildren();
                const inicial=document.createElement('option');inicial.value='';inicial.textContent='Escolha um cliente';el('retornoClienteAjuste').appendChild(inicial);
                historicoRetorno.slice().sort((a,b)=>a.nome.localeCompare(b.nome)).forEach(c=>{const op=document.createElement('option');op.value=c.chave;op.textContent=c.nome;el('retornoClienteAjuste').appendChild(op);});
                el('retornoClienteAjuste').value=historicoRetorno.some(c=>c.chave===anterior)?anterior:'';
                mostrarPrazoSelecionado();
                const ausentes=historicoRetorno.filter(c=>c.dias>=c.prazo),lista=el('clientesSemRetorno');lista.replaceChildren();
                el('retornoResumo').textContent=`${ausentes.length} cliente(s) no prazo de acompanhamento · referência: ${new Date().toLocaleDateString('pt-PT')}.`;
                ausentes.forEach(c=>{const li=document.createElement('li'),texto=document.createElement('span'),titulo=document.createElement('strong'),detalhe=document.createElement('small');titulo.textContent=c.nome;detalhe.textContent=`Último recebimento: ${c.ultima.toLocaleDateString('pt-PT')} · ${c.dias} dias sem voltar. ${c.manual ? 'Prazo manual: '+c.prazo+' dias. Automático: '+c.prazoAutomatico+' dias.' : c.padrao ? 'Prazo padrão: 30 dias (sem intervalos anteriores).' : 'Retorno habitual: '+c.prazo+' dias, com base em '+c.intervalos+' intervalo(s).'}`;texto.append(titulo,detalhe);li.appendChild(texto);lista.appendChild(li);});
                if(!ausentes.length){const li=document.createElement('li');li.textContent='Nenhum cliente com histórico atingiu o prazo de acompanhamento.';lista.appendChild(li);}
            } catch(erro) {
                if(pedido!==versao || mesReferencia.value!==mes)return;
                retornoCarregado=false;ativarControlesRetorno();
                console.error('Erro ao carregar prazos de retorno:',erro);
                el('retornoResumo').textContent='Não foi possível consultar os prazos guardados. Atualize o painel.';
                el('clientesSemRetorno').replaceChildren();
            }
        }
    };
}
