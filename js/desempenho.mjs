// Indicadores comerciais calculados apenas a partir dos recebimentos registados.
export function normalizarCliente(nome) { return String(nome || "").normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-PT"); }
export function resumirPeriodo(movimentos, modo, periodo) {
  const clientes = new Map(); let total = 0, quantidade = 0;
  for (const mov of movimentos) {
    const data = mov.data;
    if (!(data instanceof Date) || !Number.isFinite(data.getTime()) || mov.tipo === "fundo" || !(Number(mov.valor) > 0)) continue;
    const mes = `${data.getFullYear()}-${String(data.getMonth()+1).padStart(2,"0")}`;
    if ((modo === "anual" ? String(data.getFullYear()) : mes) !== periodo) continue;
    total += Number(mov.valor); quantidade++;
    const chave = normalizarCliente(mov.clienteNome);
    if (!chave) continue;
    const cliente = clientes.get(chave) || {nome:mov.clienteNome.trim(), chave, total:0, entradas:0};
    cliente.total += Number(mov.valor); cliente.entradas++; clientes.set(chave, cliente);
  }
  const lista = [...clientes.values()];
  // A vista mensal filtra apenas os totais da lista; as estrelas usam o ano completo.
  const anoAvaliacao = periodo.slice(0,4);
  const baseAnual = modo === "anual" ? lista : resumirPeriodo(movimentos,"anual",anoAvaliacao).clientes;
  const porClienteAnual = new Map(baseAnual.map(c=>[c.chave,c]));
  const maiorValor = Math.max(0, ...baseAnual.map(c=>c.total));
  const maiorFrequencia = Math.max(0, ...baseAnual.map(c=>c.entradas));
  for (const c of lista) {
    const anual = porClienteAnual.get(c.chave);
    c.totalAnual = anual.total; c.entradasAnuais = anual.entradas; c.anoAvaliacao = anoAvaliacao;
    c.pontos = 100 * (0.6 * c.totalAnual/maiorValor + 0.4 * c.entradasAnuais/maiorFrequencia);
    c.estrelas = Math.min(5, Math.max(1, Math.ceil((c.pontos - 1e-9)/20)));
  }
  lista.sort((a,b)=>b.total-a.total || b.entradas-a.entradas || a.nome.localeCompare(b.nome));
  return {clientes:lista, total, quantidade, ticket:quantidade ? total/quantidade : 0};
}
export function periodoAnterior(modo, periodo) {
  if(modo === "anual") return String(Number(periodo)-1);
  const [ano,mes] = periodo.split("-").map(Number), d = new Date(ano, mes-2, 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}

// Indicadores de gestão; despesas nunca alteram os saldos de distribuição.
export function progressoMeta(recebido, meta) {
  if (!(meta > 0) || !Number.isFinite(meta)) return {definida:false, percentual:0, barra:0, falta:0};
  const percentual = recebido / meta * 100;
  return {definida:true, percentual, barra:Math.min(100,Math.max(0,percentual)), falta:Math.max(0,Math.round((meta-recebido)*100)/100)};
}
export function apurarLucro(recebido, despesas, partes = 0) {
  const centavos = v => Math.round(Number(v || 0)*100);
  const lucro = (centavos(recebido)-centavos(despesas)-centavos(partes))/100;
  return {lucro, margem:recebido > 0 ? lucro/recebido*100 : null};
}
export function analisarRetornoClientes(movimentos, referencia = new Date(), prazosManuais = {}) {
  const diaNumero = d => Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000);
  const hoje = diaNumero(referencia), historicos = new Map();
  for (const mov of movimentos) {
    const data=mov.data;
    if (!(data instanceof Date) || !Number.isFinite(data.getTime()) || mov.tipo === "fundo" || !(Number(mov.valor)>0) || diaNumero(data)>hoje) continue;
    const chave=normalizarCliente(mov.clienteNome);if(!chave)continue;
    const c=historicos.get(chave)||{nome:mov.clienteNome.trim(),chave,dias:new Map()};
    c.dias.set(diaNumero(data),data);historicos.set(chave,c);
  }
  const resultados=[];
  for(const c of historicos.values()){
    const dias=[...c.dias.keys()].sort((a,b)=>a-b), intervalos=dias.slice(1).map((d,i)=>d-dias[i]).sort((a,b)=>a-b);
    const meio=Math.floor(intervalos.length/2);
    const habitual=intervalos.length ? Math.ceil(intervalos.length%2 ? intervalos[meio] : (intervalos[meio-1]+intervalos[meio])/2) : 30;
    const ultima=c.dias.get(dias[dias.length-1]), semVoltar=hoje-dias[dias.length-1];
    const configurado = Object.prototype.hasOwnProperty.call(prazosManuais,c.chave) ? Number(prazosManuais[c.chave]) : 0;
    const manual = Number.isInteger(configurado) && configurado >= 1 && configurado <= 3650;
    resultados.push({nome:c.nome,chave:c.chave,ultima,dias:semVoltar,prazo:manual?configurado:habitual,prazoAutomatico:habitual,manual,intervalos:intervalos.length,padrao:intervalos.length===0});
  }
  return resultados.sort((a,b)=>(b.dias-b.prazo)-(a.dias-a.prazo) || a.nome.localeCompare(b.nome));
}

export function clientesSemRetorno(movimentos, referencia = new Date(), prazosManuais = {}) {
  return analisarRetornoClientes(movimentos, referencia, prazosManuais).filter(c=>c.dias>=c.prazo);
}

export function detalharClienteAno(movimentos, nome, ano, agora = new Date()) {
  const chave=normalizarCliente(nome), anoNumero=Number(ano);
  const entradas=movimentos.filter(m=>chave && m.tipo!=='fundo' && Number.isFinite(Number(m.valor)) && Number(m.valor)>0 && m.data instanceof Date && Number.isFinite(m.data.getTime()) && m.data<=agora && m.data.getFullYear()===anoNumero && normalizarCliente(m.clienteNome)===chave).sort((a,b)=>b.data-a.data);
  const meses=new Map();let centavos=0;
  for(const entrada of entradas){const valor=Math.round(Number(entrada.valor)*100),mes=entrada.data.getMonth();centavos+=valor;const m=meses.get(mes)||{mes,centavos:0,quantidade:0};m.centavos+=valor;m.quantidade++;meses.set(mes,m);}
  return {nome,ano:anoNumero,total:centavos/100,quantidade:entradas.length,media:entradas.length?Math.round(centavos/entradas.length)/100:0,entradas,meses:[...meses.values()].sort((a,b)=>a.mes-b.mes).map(m=>({mes:m.mes,total:m.centavos/100,quantidade:m.quantidade}))};
}
