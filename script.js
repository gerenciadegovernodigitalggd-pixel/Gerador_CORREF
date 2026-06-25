const MODELOS = {
  manutencao_masculino: "modelos/manutencao_masculino.docx",
  manutencao_feminino: "modelos/manutencao_feminino.docx",
  mudanca_masculino: "modelos/mudanca_masculino.docx",
  mudanca_feminino: "modelos/mudanca_feminino.docx",
  extrato_parecer: "modelos/extrato_parecer.docx",
  extrato_ato: "modelos/extrato_ato.docx",
};

const STORAGE_KEY = "corref_gerador_readaptacao_v4";
const $ = (id) => document.getElementById(id);

const CAMPOS = [
  "nome_servidor", "matricula", "cargo", "secretaria", "protocolo_readaptacao",
  "tipo_readaptacao", "tipo_portaria", "sexo", "numero_portaria", "tempo_por_extenso",
  "cargo_readaptado", "restricoes", "parecer_tecnico", "data_relatorio",
  "cargo_readaptado_parecer", "tempo_parecer", "determinacao"
];

iniciar();

function iniciar() {
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => abrirAba(btn.dataset.tab));
  });

  $("tipo_readaptacao").addEventListener("change", () => {
    alternarPrazo();
    salvarDados();
  });

  $("nome_servidor").addEventListener("input", atualizarPreviews);
  $("matricula").addEventListener("input", atualizarPreviews);

  CAMPOS.forEach(id => {
    const el = $(id);
    if (el) el.addEventListener("input", salvarDados);
    if (el) el.addEventListener("change", salvarDados);
  });

  $("btn_portaria").addEventListener("click", gerarPortaria);
  $("btn_parecer").addEventListener("click", gerarParecer);
  $("btn_ato").addEventListener("click", gerarAto);

  $("btn_limpar").addEventListener("click", () => {
    if (!confirm("Deseja limpar todos os campos?")) return;
    CAMPOS.forEach(id => {
      const el = $(id);
      if (!el) return;
      if (el.tagName === "SELECT") el.selectedIndex = 0;
      else el.value = "";
    });
    localStorage.removeItem(STORAGE_KEY);
    alternarPrazo();
    atualizarPreviews();
    setStatus("Campos limpos.");
  });

  carregarDados();
  alternarPrazo();
  atualizarPreviews();
}

function abrirAba(nome) {
  document.querySelectorAll(".tab").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === nome));
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.remove("active"));
  $(`tab-${nome}`).classList.add("active");
  setStatus("");
}

function alternarPrazo() {
  const definitiva = $("tipo_readaptacao").value === "definitiva";
  ["prazo_box", "prazo_parecer_box"].forEach(id => {
    const el = $(id);
    if (el) el.classList.toggle("hidden", definitiva);
  });
}

function valor(id) {
  return ($(id)?.value || "").trim();
}

function setStatus(msg, erro = false) {
  const el = $("status");
  el.textContent = msg;
  el.className = erro ? "err" : "";
}

function salvarDados() {
  const dados = {};
  CAMPOS.forEach(id => {
    const el = $(id);
    if (el) dados[id] = el.value;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
  atualizarPreviews();
}

function carregarDados() {
  try {
    const salvo = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    Object.entries(salvo).forEach(([id, value]) => {
      const el = $(id);
      if (el) el.value = value;
    });
  } catch (_) {}
}

function atualizarPreviews() {
  const nome = valor("nome_servidor");
  const matricula = valor("matricula");
  $("prev_iniciais").textContent = gerarIniciais(nome) || "—";
  $("prev_matricula").textContent = mascararMatricula(matricula) || "—";
}

function gerarIniciais(nome) {
  const ignorar = new Set(["de", "da", "das", "do", "dos", "e"]);
  return nome
    .split(/\s+/)
    .filter(p => p && !ignorar.has(p.toLowerCase()))
    .map(p => p[0].toLocaleUpperCase("pt-BR") + ".")
    .join(" ");
}

function mascararMatricula(matricula) {
  const nums = matricula.replace(/\D/g, "");
  if (!nums) return "";
  return `***${nums.slice(-3)}**`;
}

function limparPontoFinal(texto) {
  return texto.trim().replace(/[.。]+$/g, "");
}

function montarRestricoes(texto, sexo) {
  const t = limparPontoFinal(texto || "");
  if (!t) {
    return sexo === "feminino"
      ? "Fica expressamente vedado à servidora exercer atividades incompatíveis com sua atual condição de saúde"
      : "Fica expressamente vedado ao servidor exercer atividades incompatíveis com sua atual condição de saúde";
  }
  if (/^fica\s+expressamente/i.test(t)) return t;
  return sexo === "feminino"
    ? `Fica expressamente vedado à servidora ${t}`
    : `Fica expressamente vedado ao servidor ${t}`;
}

function montarDados() {
  const sexo = $("sexo").value;
  const tipoReadaptacao = $("tipo_readaptacao").value;
  const nome = valor("nome_servidor");
  const matricula = valor("matricula");
  const cargo = valor("cargo");
  const cargoReadaptadoPortaria = valor("cargo_readaptado") || cargo || "Origem";
  const cargoReadaptadoParecer = valor("cargo_readaptado_parecer") || cargoReadaptadoPortaria;
  const prazoPortaria = valor("tempo_por_extenso");
  const prazoParecer = valor("tempo_parecer") || prazoPortaria;

  const trechoPrazo = tipoReadaptacao === "temporaria" && prazoParecer ? `pelo prazo de ${prazoParecer}` : "";
  const trechoReavaliacao = tipoReadaptacao === "temporaria"
    ? ", devendo o(a) servidor(a) ser submetido(a) a nova inspeção médica ao término do período estabelecido"
    : "";

  return {
    // Portarias
    numero_portaria: valor("numero_portaria"),
    protocolo_readaptacao: valor("protocolo_readaptacao"),
    nome_servidor: nome,
    matricula: matricula,
    cargo_origem: cargo,
    cargo_readaptado: cargoReadaptadoPortaria,
    tempo_por_extenso: prazoPortaria,
    restricoes: montarRestricoes(valor("restricoes"), sexo),

    // Extrato de parecer
    PARECER_TECNICO: valor("parecer_tecnico"),
    protocolo: valor("protocolo_readaptacao"),
    INICIAIS_SERVIDOR: gerarIniciais(nome),
    data_relatorio: valor("data_relatorio"),
    cargo: cargo,
    secretaria: valor("secretaria"),
    tipo_readaptacao: tipoReadaptacao === "temporaria" ? "temporária" : "definitiva",
    trecho_prazo: trechoPrazo,
    trecho_reavaliacao: trechoReavaliacao,

    // Extrato do ato
    PROTOCOLO_READAPTACAO: valor("protocolo_readaptacao"),
    MATRICULA: matricula,
    MATRICULA_MASCARADA: mascararMatricula(matricula),
    CARGO_ORIGEM: cargo,
    SECRETARIA_LOTACAO: valor("secretaria"),
    determinacao: valor("determinacao"),

    // Compartilhados / variações
    cargo_readaptado_parecer: cargoReadaptadoParecer,
  };
}

function validarBase(dados) {
  const faltantes = [];
  if (!dados.nome_servidor) faltantes.push("Nome completo");
  if (!dados.matricula) faltantes.push("Matrícula");
  if (!dados.protocolo_readaptacao) faltantes.push("Protocolo");
  if (!dados.cargo_origem) faltantes.push("Cargo");
  if (!dados.secretaria) faltantes.push("Secretaria");
  if (faltantes.length) throw new Error("Preencha nos dados gerais: " + faltantes.join(", "));
}

function validarPortaria(dados) {
  validarBase(dados);
  if (!dados.numero_portaria) throw new Error("Preencha o número da portaria.");
  if ($("tipo_readaptacao").value === "temporaria" && !dados.tempo_por_extenso) {
    throw new Error("Preencha o prazo da portaria.");
  }
}

function validarParecer(dados) {
  validarBase(dados);
  if (!dados.PARECER_TECNICO) throw new Error("Preencha o número do parecer técnico/ano.");
  if (!dados.data_relatorio) throw new Error("Preencha a data do relatório médico.");
  if ($("tipo_readaptacao").value === "temporaria" && !dados.trecho_prazo) {
    throw new Error("Preencha o prazo do parecer.");
  }
}

function validarAto(dados) {
  validarBase(dados);
  if (!dados.determinacao) throw new Error("Preencha a determinação do ato decisório.");
}

function escapeXml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function valorParaXml(texto) {
  const escaped = escapeXml(texto);
  return escaped.replace(/\r\n|\r|\n/g, "</w:t><w:br/><w:t>");
}

function todasAsChaves(dados) {
  const pares = [];
  const dadosComVariações = {
    ...dados,
    // O parecer usa o mesmo campo, mas em alguns modelos aparece com outro nome.
    cargo_readaptado: dados.cargo_readaptado_parecer || dados.cargo_readaptado,
  };

  for (const [k, v] of Object.entries(dadosComVariações)) {
    pares.push([`{{${k}}}`, v]);
  }

  pares.push(["{protocolo}", dados.protocolo]);
  pares.push(["{{PROTOCOLO}}", dados.protocolo]);
  pares.push(["{{matricula_mascarada}}", dados.MATRICULA_MASCARADA]);
  pares.push(["{{MATRICULA_MASCARADA}}", dados.MATRICULA_MASCARADA]);
  return pares;
}

function alinharParagrafoComCampo(xml, campo) {
  const marcador = `{{${campo}}}`;
  return xml.replace(/<w:p[\s\S]*?<\/w:p>/g, (paragrafo) => {
    if (!paragrafo.includes(marcador)) return paragrafo;

    let p = paragrafo
      .replace(/<w:jc\s+[^>]*\/>/g, '<w:jc w:val="left"/>')
      .replace(/<w:spacing\s+[^>]*\/?>/g, '');

    if (!/<w:jc\s+[^>]*\/>/.test(p)) {
      if (/<w:pPr[\s\S]*?>/.test(p)) {
        p = p.replace(/<w:pPr[\s\S]*?>/, (ppr) => `${ppr}<w:jc w:val="left"/>`);
      } else {
        p = p.replace(/<w:p([^>]*)>/, '<w:p$1><w:pPr><w:jc w:val="left"/></w:pPr>');
      }
    }

    return p;
  });
}

function removerDestaques(xml) {
  return xml
    .replace(/<w:highlight[^>]*\/>/g, "")
    .replace(/<w:highlight[^>]*><\/w:highlight>/g, "");
}

function substituirXml(xml, dados) {
  let out = xml;

  out = alinharParagrafoComCampo(out, "restricoes");
  out = alinharParagrafoComCampo(out, "determinacao");

  for (const [chave, valor] of todasAsChaves(dados)) {
    const substituto = valorParaXml(valor);
    out = out.split(chave).join(substituto);
  }

  out = out
    .replace(/17\.000\s+,\s+devendo/g, "17.000, devendo")
    .replace(/17\.000\s+\./g, "17.000.")
    .replace(/\s+,\s+visando/g, ", visando")
    .replace(/>\s+<\/w:t><w:t>/g, "></w:t><w:t>");

  out = removerDestaques(out);
  return out;
}

async function preencherModelo(caminho, dados) {
  // Evita que o navegador use uma versão antiga do modelo .docx em cache.
  // Assim, ao substituir um arquivo dentro da pasta modelos/, a próxima geração já usa o novo arquivo.
  const separador = caminho.includes("?") ? "&" : "?";
  const caminhoSemCache = `${caminho}${separador}v=${Date.now()}`;

  const resp = await fetch(caminhoSemCache, { cache: "no-store" });
  if (!resp.ok) throw new Error(`Não foi possível carregar o modelo: ${caminho}`);

  const buffer = await resp.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const arquivosXml = Object.keys(zip.files).filter(nome => nome.startsWith("word/") && nome.endsWith(".xml"));

  for (const nome of arquivosXml) {
    const arquivo = zip.file(nome);
    if (!arquivo) continue;
    const xml = await arquivo.async("string");
    zip.file(nome, substituirXml(xml, dados));
  }

  return await zip.generateAsync({ type: "uint8array" });
}

function nomeArquivo(base, dados) {
  const nome = (dados.nome_servidor || "servidor")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .toUpperCase();
  return `${base}_${nome}.docx`;
}

function baixarBlob(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function gerarDocumentoUnico(modelo, nome, dados) {
  const docx = await preencherModelo(modelo, dados);
  const blob = new Blob([docx], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });
  baixarBlob(blob, nome);
}

async function gerarPortaria() {
  try {
    setStatus("Gerando portaria...");
    const dados = montarDados();
    validarPortaria(dados);
    const tipo = $("tipo_portaria").value;
    const sexo = $("sexo").value;
    const chave = `${tipo}_${sexo}`;
    await gerarDocumentoUnico(MODELOS[chave], nomeArquivo(`portaria_${tipo}_${sexo}`, dados), dados);
    setStatus("Portaria gerada em DOCX.");
  } catch (err) {
    console.error(err);
    setStatus("Erro ao gerar portaria: " + err.message, true);
  }
}

async function gerarParecer() {
  try {
    setStatus("Gerando extrato de parecer...");
    const dados = montarDados();
    validarParecer(dados);
    await gerarDocumentoUnico(MODELOS.extrato_parecer, nomeArquivo("extrato_parecer_tecnico", dados), dados);
    setStatus("Extrato de parecer gerado em DOCX.");
  } catch (err) {
    console.error(err);
    setStatus("Erro ao gerar extrato de parecer: " + err.message, true);
  }
}

async function gerarAto() {
  try {
    setStatus("Gerando extrato do ato...");
    const dados = montarDados();
    validarAto(dados);
    await gerarDocumentoUnico(MODELOS.extrato_ato, nomeArquivo("extrato_ato_decisorio", dados), dados);
    setStatus("Extrato do ato gerado em DOCX.");
  } catch (err) {
    console.error(err);
    setStatus("Erro ao gerar extrato do ato: " + err.message, true);
  }
}
