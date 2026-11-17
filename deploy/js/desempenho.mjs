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
  const maiorValor = Math.max(0, ...lista.map(c=>c.total));
  const maiorFrequencia = Math.max(0, ...lista.map(c=>c.entradas));
  for (const c of lista) {
    c.pontos = 100 * (0.6 * c.total/maiorValor + 0.4 * c.entradas/maiorFrequencia);
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
