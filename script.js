const MODELOS = {
  portaria_manutencao: {
    masculino: "modelos/manutencao_masculino.docx",
    feminino: "modelos/manutencao_feminino.docx",
    nome: "portaria_manutencao"
  },
  portaria_mudanca: {
    masculino: "modelos/mudanca_masculino.docx",
    feminino: "modelos/mudanca_feminino.docx",
    nome: "portaria_mudanca"
  },
  extrato_parecer: {
    arquivo: "modelos/extrato_parecer.docx",
    nome: "extrato_parecer"
  },
  extrato_ato: {
    arquivo: "modelos/extrato_ato.docx",
    nome: "extrato_ato"
  }
};

const STOPWORDS_INICIAIS = new Set(["de", "da", "das", "do", "dos", "e"]);

function el(id) { return document.getElementById(id); }
function valor(id) { return (el(id)?.value || "").trim(); }
function setStatus(msg, erro = false) {
  const s = el("status");
  s.textContent = msg;
  s.style.borderColor = erro ? "#fda29b" : "#d9e2ef";
  s.style.background = erro ? "#fff1f0" : "#f8fafc";
  s.style.color = erro ? "#b42318" : "#475467";
}

function gerarIniciais(nome) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .filter(p => !STOPWORDS_INICIAIS.has(p.toLowerCase()))
    .map(p => p[0].toUpperCase() + ".")
    .join(" ");
}

function mascararMatricula(matricula) {
  const numeros = (matricula || "").replace(/\D/g, "");
  if (!numeros) return "";
  return `***${numeros.slice(-3)}**`;
}

function limparNomeArquivo(texto) {
  return (texto || "documento")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
}

function semPontoFinal(texto) {
  return (texto || "").trim().replace(/[.;\s]+$/g, "");
}

function restricoesPadrao(sexo) {
  if (sexo === "feminino") {
    return "Fica expressamente vedado à servidora exercer atividades incompatíveis com sua atual condição de saúde, devendo cumprir as restrições estabelecidas pela perícia médica oficial";
  }
  return "Fica expressamente vedado ao servidor exercer atividades incompatíveis com sua atual condição de saúde, devendo cumprir as restrições estabelecidas pela perícia médica oficial";
}

function montarDados() {
  const sexo = valor("sexo") || "masculino";
  const nome = valor("nome_servidor");
  const matricula = valor("matricula");
  const cargo = valor("cargo");
  const cargoReadaptado = valor("cargo_readaptado") || cargo;
  const secretaria = valor("secretaria");
  const tipo = valor("tipo_readaptacao");
  const prazo = valor("tempo_por_extenso");
  const restricoesDigitadas = valor("restricoes");
  const restricoes = semPontoFinal(restricoesDigitadas || restricoesPadrao(sexo));

  const trechoPrazo = tipo === "definitiva" ? "" : (prazo ? `pelo prazo de ${prazo}` : "pelo prazo de {{PRAZO_NAO_INFORMADO}}");
  const trechoReavaliacao = tipo === "definitiva" ? "" : ", devendo o(a) servidor(a) ser submetido(a) a nova inspeção médica ao término do período estabelecido";

  return {
    // Portarias em minúsculo
    numero_portaria: valor("numero_portaria"),
    protocolo_readaptacao: valor("protocolo_readaptacao"),
    nome_servidor: nome,
    matricula: matricula,
    cargo_origem: cargo,
    cargo_readaptado: cargoReadaptado,
    restricoes: restricoes,
    tempo_por_extenso: prazo,

    // Extrato de parecer técnico
    PARECER_TECNICO: valor("parecer_tecnico"),
    protocolo: valor("protocolo_readaptacao"),
    INICIAIS_SERVIDOR: gerarIniciais(nome),
    cargo: cargo,
    secretaria: secretaria,
    data_relatorio: valor("data_relatorio"),
    tipo_readaptacao: tipo === "definitiva" ? "definitiva" : "temporária",
    trecho_prazo: trechoPrazo,
    trecho_reavaliacao: trechoReavaliacao,

    // Extrato do ato decisório em maiúsculo
    PROTOCOLO_READAPTACAO: valor("protocolo_readaptacao"),
    MATRICULA: matricula,
    MATRICULA_MASCARADA: mascararMatricula(matricula),
    CARGO_ORIGEM: cargo,
    CARGO_ATO_DECISORIO: cargo,
    SECRETARIA_LOTACAO: secretaria,
    determinacao: valor("determinacao")
  };
}

async function carregarArrayBuffer(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Não foi possível carregar o modelo: ${url}`);
  return await resp.arrayBuffer();
}

function normalizarTagsNoZip(zip) {
  // Corrige o único marcador que veio com chave simples no modelo do parecer: {protocolo}
  const arquivosXml = Object.keys(zip.files).filter(n => n.startsWith("word/") && n.endsWith(".xml"));
  for (const nome of arquivosXml) {
    const file = zip.file(nome);
    if (!file) continue;
    let conteudo = file.asText();
    conteudo = conteudo.replaceAll("{protocolo}", "{{protocolo}}");
    zip.file(nome, conteudo);
  }
}

async function gerarDocx(caminhoModelo, nomeBase, dados) {
  const content = await carregarArrayBuffer(caminhoModelo);
  const zip = new PizZip(content);
  normalizarTagsNoZip(zip);

  const doc = new window.docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" }
  });

  doc.render(dados);

  const blob = doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });

  const nomeServidor = limparNomeArquivo(dados.nome_servidor || "servidor");
  saveAs(blob, `${nomeBase}_${nomeServidor}.docx`);
}

function selecionarModelos() {
  const documento = valor("documento");
  const sexo = valor("sexo") || "masculino";

  if (documento === "todos") {
    const tipoPortaria = confirm("Deseja gerar a portaria de MUDANÇA de cargo?\n\nOK = Mudança de cargo\nCancelar = Manutenção de cargo")
      ? "portaria_mudanca"
      : "portaria_manutencao";
    return [
      { caminho: MODELOS[tipoPortaria][sexo], nome: MODELOS[tipoPortaria].nome },
      { caminho: MODELOS.extrato_parecer.arquivo, nome: MODELOS.extrato_parecer.nome },
      { caminho: MODELOS.extrato_ato.arquivo, nome: MODELOS.extrato_ato.nome }
    ];
  }

  if (documento === "portaria_manutencao" || documento === "portaria_mudanca") {
    return [{ caminho: MODELOS[documento][sexo], nome: MODELOS[documento].nome }];
  }

  return [{ caminho: MODELOS[documento].arquivo, nome: MODELOS[documento].nome }];
}

function atualizarCamposAutomaticos() {
  el("iniciais_preview").value = gerarIniciais(valor("nome_servidor"));
  const definitiva = valor("tipo_readaptacao") === "definitiva";
  el("grupoPrazo").classList.toggle("hidden", definitiva);
}

function salvarLocal() {
  const ids = ["documento", "sexo", "nome_servidor", "matricula", "cargo", "cargo_readaptado", "secretaria", "protocolo_readaptacao", "numero_portaria", "parecer_tecnico", "data_relatorio", "tipo_readaptacao", "tempo_por_extenso", "restricoes", "determinacao"];
  const dados = {};
  ids.forEach(id => dados[id] = el(id).value);
  localStorage.setItem("gerador_corref_dados", JSON.stringify(dados));
}

function carregarLocal() {
  try {
    const dados = JSON.parse(localStorage.getItem("gerador_corref_dados") || "{}");
    Object.keys(dados).forEach(id => { if (el(id)) el(id).value = dados[id]; });
  } catch (_) {}
  atualizarCamposAutomaticos();
}

document.addEventListener("DOMContentLoaded", () => {
  carregarLocal();

  document.querySelectorAll("input, textarea, select").forEach(campo => {
    campo.addEventListener("input", () => { atualizarCamposAutomaticos(); salvarLocal(); });
    campo.addEventListener("change", () => { atualizarCamposAutomaticos(); salvarLocal(); });
  });

  el("btnLimpar").addEventListener("click", () => {
    if (!confirm("Deseja limpar todos os campos?")) return;
    localStorage.removeItem("gerador_corref_dados");
    el("formGerador").reset();
    atualizarCamposAutomaticos();
    setStatus("Campos limpos.");
  });

  el("btnGerar").addEventListener("click", async () => {
    try {
      setStatus("Gerando documento...");
      const dados = montarDados();
      const modelos = selecionarModelos();
      for (const modelo of modelos) {
        await gerarDocx(modelo.caminho, modelo.nome, dados);
      }
      setStatus("Documento(s) gerado(s) com sucesso.");
    } catch (err) {
      console.error(err);
      setStatus("Erro ao gerar: " + err.message, true);
    }
  });
});
