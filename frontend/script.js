// CONFIGURAÇÃO: ajuste os caminhos abaixo para corresponder às rotas do seu main.py.
// Este frontend usa como padrão uma API em http://127.0.0.1:8000.
// Atenção: os caminhos de PUT e DELETE variam de projeto para projeto.

const DEFAULT_API_URL = "http://127.0.0.1:8000";
const ROUTES = {
  listar: "/produtos",
  criar: "/produtos",
  atualizar: (id) => `/produtos/${id}`,
  excluir: (id) => `/produtos/${id}`,
};

const apiUrlInput = document.getElementById("apiUrl");
const apiStatus = document.getElementById("apiStatus");
const productForm = document.getElementById("productForm");
const productIdInput = document.getElementById("productId");
const nomeInput = document.getElementById("nome");
const precoInput = document.getElementById("preco");
const productList = document.getElementById("productList");
const emptyState = document.getElementById("emptyState");
const productCount = document.getElementById("productCount");
const messageBox = document.getElementById("message");
const loading = document.getElementById("loading");
const responseLog = document.getElementById("responseLog");

apiUrlInput.value = DEFAULT_API_URL;

function getBaseUrl() {
  return apiUrlInput.value.trim().replace(/\/+$/, "");
}

function setApiStatus(state, text) {
  apiStatus.className = `status status-${state}`;
  apiStatus.innerHTML = '<span class="status-dot"></span>';
  apiStatus.append(document.createTextNode(` ${text}`));
}

function showMessage(text, type = "success") {
  messageBox.textContent = text;
  messageBox.className = `message ${type}`;
}

function hideMessage() {
  messageBox.className = "message hidden";
  messageBox.textContent = "";
}

function logResponse(method, url, status, data) {
  responseLog.textContent = [
    `${method} ${url}`,
    `Status HTTP: ${status ?? "sem resposta"}`,
    "",
    typeof data === "string" ? data : JSON.stringify(data, null, 2)
  ].join("\n");
}

async function request(path, options = {}) {
  const url = `${getBaseUrl()}${path}`;
  const method = (options.method || "GET").toUpperCase();

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    });

    const raw = await response.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = raw;
    }

    logResponse(method, url, response.status, data);

    if (!response.ok) {
      const detail = data && typeof data === "object"
        ? (data.detail || JSON.stringify(data))
        : (data || response.statusText);
      throw new Error(`HTTP ${response.status}: ${detail}`);
    }

    return data;
  } catch (error) {
    logResponse(method, url, "sem resposta", { erro: error.message });
    if (error instanceof TypeError) {
      throw new Error(
        "Não foi possível acessar a API. Confira se o FastAPI está ligado, se a URL está correta e se o CORS permite a origem do frontend."
      );
    }
    throw error;
  }
}

function normalizeProducts(data) {
  // Aceita uma lista direta ou uma lista dentro de chaves comuns.
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.produtos)) return data.produtos;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.results)) return data.results;
  return null;
}

function formatPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return `R$ ${value ?? "—"}`;
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function renderProducts(data) {
  const products = normalizeProducts(data);
  productList.replaceChildren();

  if (products === null) {
    emptyState.classList.remove("hidden");
    emptyState.querySelector("strong").textContent = "A resposta não é uma lista de produtos";
    emptyState.querySelector("p").textContent = "Confira o formato da resposta no painel “Última resposta da API”.";
    productCount.textContent = "Formato inesperado";
    return;
  }

  productCount.textContent = `${products.length} ${products.length === 1 ? "produto" : "produtos"}`;
  emptyState.classList.toggle("hidden", products.length > 0);
  emptyState.querySelector("strong").textContent = "Nenhum produto encontrado";
  emptyState.querySelector("p").textContent = "Quando a API retornar produtos, eles aparecerão aqui.";

  products.forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";

    const symbol = document.createElement("div");
    symbol.className = "product-symbol";
    symbol.textContent = "P";

    const info = document.createElement("div");
    info.className = "product-info";

    const title = document.createElement("h4");
    title.textContent = product.nome ?? product.name ?? `Produto ${product.id ?? ""}`;

    const manufacturer = document.createElement("p");
    manufacturer.textContent = `ID: ${product.id ?? "não informado"}`;

    const price = document.createElement("p");
    price.className = "product-price";
    price.textContent = formatPrice(product.preco);

    info.append(title, manufacturer, price);

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "button button-secondary";
    editButton.textContent = "Editar";
    editButton.addEventListener("click", () => beginEdit(product));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "button button-ghost";
    deleteButton.textContent = "Excluir";
    deleteButton.addEventListener("click", () => deleteProduct(product.id));

    actions.append(editButton, deleteButton);
    card.append(symbol, info, actions);
    productList.append(card);
  });
}

async function carregarProdutos() {
  hideMessage();
  loading.classList.remove("hidden");
  try {
    const data = await request(ROUTES.listar);
    renderProducts(data);
    setApiStatus("ok", "API respondeu");
  } catch (error) {
    setApiStatus("error", "Falha na API");
    showMessage(`Não foi possível listar produtos. ${error.message}`, "error");
  } finally {
    loading.classList.add("hidden");
  }
}

async function testConnection() {
  hideMessage();
  try {
    // Tenta a rota raiz. Se sua API não tiver GET /, use o botão de listar produtos.
    const data = await request("/");
    setApiStatus("ok", "API respondeu");
    showMessage("A API respondeu à rota /. Agora você pode testar a listagem de produtos.", "success");
  } catch (error) {
    setApiStatus("error", "Não conectou");
    showMessage(`Teste da rota / falhou: ${error.message} Tente “Atualizar lista” para testar diretamente /produtos.`, "error");
  }
}

function beginEdit(product) {
  if (product.id === undefined || product.id === null) {
    showMessage("Este produto não tem ID na resposta; não é possível preencher a edição.", "error");
    return;
  }
  productIdInput.value = product.id;
  nomeInput.value = product.nome ?? product.name ?? "";
  precoInput.value = product.preco ?? "";
  document.getElementById("formTitle").textContent = `Editar produto #${product.id}`;
  document.getElementById("formMode").textContent = "PUT";
  document.getElementById("submitBtn").textContent = "Salvar alterações";
  document.getElementById("cancelEditBtn").classList.remove("hidden");
  nomeInput.focus();
}

function resetForm() {
  productForm.reset();
  productIdInput.value = "";
  document.getElementById("formTitle").textContent = "Cadastrar produto";
  document.getElementById("formMode").textContent = "POST";
  document.getElementById("submitBtn").textContent = "Cadastrar produto";
  document.getElementById("cancelEditBtn").classList.add("hidden");
}

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage();

  const id = productIdInput.value;
  const payload = {
    nome: nomeInput.value.trim(),
    preco: Number(precoInput.value),
  };

  // Se o seu modelo Pydantic não aceitar fabricante, remova-o do objeto payload.
  const path = id ? ROUTES.atualizar(id) : ROUTES.criar;
  const method = id ? "PUT" : "POST";

  try {
    await request(path, { method, body: JSON.stringify(payload) });
    showMessage(id ? "Requisição de atualização concluída." : "Produto cadastrado com sucesso.", "success");
    resetForm();
    await carregarProdutos();
  } catch (error) {
    showMessage(`Não foi possível salvar. ${error.message} Confira os caminhos e os campos esperados no main.py.`, "error");
  }
});

async function deleteProduct(id) {
  if (id === undefined || id === null) {
    showMessage("O produto não possui ID; não é possível excluí-lo.", "error");
    return;
  }
  if (!window.confirm(`Tem certeza de que deseja excluir o produto #${id}?`)) return;

  hideMessage();
  try {
    await request(ROUTES.excluir(id), { method: "DELETE" });
    showMessage(`Requisição de exclusão do produto #${id} concluída.`, "success");
    await carregarProdutos();
  } catch (error) {
    showMessage(`Não foi possível excluir. ${error.message} Confira se existe uma rota DELETE para /produtos/{id}.`, "error");
  }
}

document.getElementById("refreshBtn").addEventListener("click", carregarProdutos);
document.getElementById("testBtn").addEventListener("click", testConnection);
document.getElementById("saveUrlBtn").addEventListener("click", () => {
  showMessage(`URL base definida como ${getBaseUrl()}.`, "success");
});
document.getElementById("cancelEditBtn").addEventListener("click", resetForm);
document.getElementById("clearLogBtn").addEventListener("click", () => {
  responseLog.textContent = "Log limpo.";
});

// Não faz requisições automaticamente ao abrir a página.
