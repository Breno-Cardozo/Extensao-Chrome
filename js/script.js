document.getElementById('botao').addEventListener('click', async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab) {
        let [result] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            args: [tab.url],
            func: async (url) => {
                let site = new URL(url).hostname
                    .replace(/^www\./, '')
                    .replace(/\.com/, '')
                    .replace(/\.br$/, '')
                    .replace(/^pt\./, '')
                    .toUpperCase();

                let produto = "Produto não encontrado";
                let preco = "Preço não encontrado";
                let imageUrl = "Imagem não encontrada";
                let linkProduto = url;

                let data = await chrome.storage.local.get("customSites");
                let customSites = data.customSites || {};

                if (customSites[site]) {
                    let seletorProduto = customSites[site].produto;
                    let seletorPreco = customSites[site].preco;
                    let seletorImagem = customSites[site].imagem;
                    let seletorEstruturaProduto = customSites[site].estruturaProduto;
                    let seletorEstruturaPreco = customSites[site].estruturaPreco;
                    let seletorEstruturaImagem = customSites[site].estruturaImagem;


                    produto = document.getElementById(seletorProduto)?.innerText
                        || document.querySelector(seletorProduto)?.innerText
                        || document.querySelector(seletorEstruturaProduto)?.innerText
                        || produto;

                    preco = document.getElementById(seletorPreco)?.innerText
                        || document.querySelector(seletorPreco)?.innerText
                        || document.querySelector(seletorEstruturaPreco)?.innerText
                        || preco;

                    imageUrl = document.getElementById(seletorImagem)?.src
                        || document.querySelector(seletorImagem)?.src
                        || document.querySelector(seletorEstruturaImagem)?.src
                        || imageUrl;
                }
                else {
                    switch (site) {
                        case "MERCADOLIVRE":
                        case "PRODUTO.MERCADOLIVRE":
                            produto = document.querySelector('h1.ui-pdp-title')?.innerText || produto;
                            preco = document.querySelector('span[aria-roledescription="Preço"]')?.innerText || preco;
                            imageUrl = document.querySelector('img[data-index="0"]')?.src || imageUrl;
                            site = "Mercado Livre";
                            break;
                        case "ALIBABA":
                            produto = document.querySelector('h1')?.innerText || produto;
                            preco = document.querySelector('div.price-list')?.innerText || preco;
                            imageUrl = document.querySelector('img.id-h-full.id-w-full.id-object-contain')?.src || imageUrl;
                            site = "AliBaba";
                            break;
                        case "ALIEXPRESS":
                            produto = document.querySelector('h1[data-pl="product-title"]')?.innerText || produto;
                            preco = document.querySelector('span.price--currentPriceText--V8_y_b5.pdp-comp-price-current.product-price-value')?.innerText || preco;
                            imageUrl = document.querySelector('img[style="transform: translate(0px, 0px);"]')?.src || imageUrl;
                            site = "AliExpress";
                            break;
                        default:
                            return { site, unsupported: true };
                    }
                }
                return { produto, preco, imageUrl, site, linkProduto };
            }
        });

        if (result && result.result) {
            let novoProduto = result.result;

            if (novoProduto.unsupported) {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ["js/content-script.js"]
                });

                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: (site) => {
                        window.postMessage({ tipo: "abrir-modal", site }, "*");
                    },
                    args: [novoProduto.site]
                });

                return;
            }

            escolherCategoria(novoProduto);
        }
    }
});

function escolherCategoria(produto) {
    let tag = document.getElementById('escolha-categoria');
    tag.style.display = "flex";

    let modal = document.createElement("div");
    modal.innerHTML = `
        <div id="categoria-modal">
            <div id="categoria-content">
                <h2>Escolha uma categoria</h2>
                <div>
                    <select id="categoria-select">
                        <option value="Geral">
                            Geral
                        </option>
                    </select>
                    <button id="adicionar-categoria">Adicionar nova categoria</button>
                    <button id="salvar-categoria">Salvar</button>
                    <button id="fechar-modal" >Cancelar</button>
                </div>
            </div>
        </div>
    `;
    tag.appendChild(modal);

    carregarCategorias();

    document.getElementById("adicionar-categoria").addEventListener("click", () => {
        modal.innerHTML = `
            <div id="categoria-modal">
                <div id="categoria-content">
                    <h2>Digite uma nova categoria</h2>
                    <div>
                        <input type="text" id="nova-categoria" placeholder="Nova categoria">
                        <button id="salvar-categoria">Salvar</button>
                        <button id="fechar-modal">Cancelar</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById("salvar-categoria").addEventListener("click", () => {
            let novaCategoria = document.getElementById("nova-categoria").value.trim();

            if (novaCategoria) {
                categoria = novaCategoria;
                salvarCategoria(novaCategoria);
            }

            salvarProduto(produto, categoria);
            modal.remove();
            tag.style.display = "none";
        });


        document.getElementById("fechar-modal").addEventListener("click", () => {
            modal.remove();
            tag.style.display = "none";
        });

    });

    document.getElementById("salvar-categoria").addEventListener("click", () => {
        let categoria = document.getElementById("categoria-select").value;
        salvarProduto(produto, categoria);
        modal.remove();
        tag.style.display = "none";
    });


    document.getElementById("fechar-modal").addEventListener("click", () => {
        modal.remove();
        tag.style.display = "none";
    });
}

function carregarCategorias() {
    chrome.storage.local.get({ categorias: [] }, (data) => {
        let select = document.getElementById("categoria-select");
        data.categorias.forEach(categoria => {
            let option = document.createElement("option");
            option.value = categoria;
            option.textContent = categoria;
            select.appendChild(option);
        });
    });
}

function salvarCategoria(categoria) {
    chrome.storage.local.get({ categorias: [] }, (data) => {
        let categorias = data.categorias;
        if (!categorias.includes(categoria)) {
            categorias.push(categoria);
            chrome.storage.local.set({ categorias });
        }
    });
}

function salvarProduto(produto, categoria) {
    chrome.storage.local.get({ produtosPorCategoria: {} }, (data) => {
        let produtosPorCategoria = data.produtosPorCategoria;
        if (!produtosPorCategoria[categoria]) {
            produtosPorCategoria[categoria] = [];
        }
        produtosPorCategoria[categoria].push(produto);
        chrome.storage.local.set({ produtosPorCategoria }, () => {
            carregarProdutos();
        });
    });
}

function carregarProdutos() {
    chrome.storage.local.get({ produtosPorCategoria: {} }, (data) => {
        let container = document.getElementById('tela-produto');
        container.innerHTML = "";

        let produtosExistem = false;

        for (let categoria in data.produtosPorCategoria) {
            let produtos = data.produtosPorCategoria[categoria];

            produtosExistem = true;
            let divCategoria = document.createElement('div');
            divCategoria.classList.add('categoria-container');

            let categoriaId = categoria.replace(/\s+/g, "-");

            let tituloContainer = document.createElement("div");
            tituloContainer.classList.add("categoria-header");

            let titulo = document.createElement("h3");
            titulo.textContent = categoria;

            let btnEditar = document.createElement("button");
            btnEditar.textContent = "Editar";
            btnEditar.classList.add("edit-category");
            btnEditar.setAttribute("data-categoria", categoria);

            let btnApagar = document.createElement("button");
            btnApagar.textContent = "Apagar";
            btnApagar.classList.add("delete-category");
            btnApagar.setAttribute("data-categoria", categoria);

            tituloContainer.appendChild(titulo);
            tituloContainer.appendChild(btnEditar);
            tituloContainer.appendChild(btnApagar);

            divCategoria.appendChild(tituloContainer);

            if (produtos.length > 0) {
                let tabela = document.createElement("table");
                tabela.innerHTML = `
                    <thead>
                        <tr>
                            <th>Loja</th>
                            <th>Produto</th>
                            <th>Preço</th>
                            <th>Histórico de preço</th>
                            <th>Link</th>
                            <th>Imagem</th>
                            <th>Ação</th>
                        </tr>
                    </thead>
                    <tbody id="lista-produtos-${categoriaId}">
                    </tbody>
                `;
                divCategoria.appendChild(tabela);

                let tbody = tabela.querySelector(`#lista-produtos-${categoriaId}`);

                produtos.forEach((produto, index) => {
                    let item = document.createElement('tr');
                    item.innerHTML = `
                        <td>${produto.site}</td>
                        <td>${produto.produto}</td>
                        <td>${produto.preco}</td>
                        <td>
                            ${produto.historicoPrecos && produto.historicoPrecos.length > 0 ? `
                                ${produto.historicoPrecos.map(h => `<div>${h.preco} - ${h.data}</div>`).join('')}
                            ` : '-'}
                        </td>
                        <td>
                            <a href="${produto.linkProduto}" target="_blank">Link do anúncio</a>
                        </td>
                        <td>
                            <img src="${produto.imageUrl}" style="max-width: 40px;">
                        </td>
                        <td>
                            <button class="remove-btn" data-categoria="${categoria}" data-index="${index}">X</button>
                        </td>
                    `;

                    tbody.appendChild(item);
                });

            } else {
                let semProdutos = document.createElement("p");
                semProdutos.textContent = "Nenhum produto encontrado";
                divCategoria.appendChild(semProdutos);
            }

            container.appendChild(divCategoria);
        }

        container.style.display = produtosExistem ? "flex" : "none";

        document.querySelectorAll('.remove-btn').forEach(button => {
            button.addEventListener('click', () => {
                let categoria = button.getAttribute("data-categoria");
                let index = button.getAttribute("data-index");
                removerProduto(categoria, index);
            });
        });

        document.querySelectorAll('.edit-category').forEach(button => {
            button.addEventListener('click', () => {
                let categoria = button.getAttribute("data-categoria");
                editarCategoria(categoria);
            });
        });

        document.querySelectorAll('.delete-category').forEach(button => {
            button.addEventListener('click', () => {
                let categoria = button.getAttribute("data-categoria");
                excluirCategoria(categoria);
            });
        });
    });
}


function editarCategoria(categoriaAntiga) {
    let novoNome = prompt(`Renomear categoria "${categoriaAntiga}":`, categoriaAntiga);
    if (!novoNome || novoNome.trim() === "" || novoNome === categoriaAntiga) return;

    chrome.storage.local.get({ produtosPorCategoria: {}, categorias: [] }, (data) => {
        let produtosPorCategoria = data.produtosPorCategoria;
        let categorias = data.categorias;

        if (!produtosPorCategoria[categoriaAntiga]) {
            console.error(`Categoria "${categoriaAntiga}" não encontrada.`);
            return;
        }

        if (produtosPorCategoria[novoNome]) {
            alert(`A categoria "${novoNome}" já existe. Escolha outro nome.`);
            return;
        }

        produtosPorCategoria[novoNome] = produtosPorCategoria[categoriaAntiga];
        delete produtosPorCategoria[categoriaAntiga];

        let index = categorias.indexOf(categoriaAntiga);
        if (index !== -1) {
            categorias[index] = novoNome;
        }

        chrome.storage.local.set({ produtosPorCategoria, categorias }, () => {
            console.log(`Categoria "${categoriaAntiga}" renomeada para "${novoNome}"`);
            carregarProdutos();
        });
    });
}

function excluirCategoria(categoria) {
    let confirmacao = confirm(`Tem certeza que deseja excluir a categoria "${categoria}" e todos os seus produtos?`);
    if (!confirmacao) return;

    chrome.storage.local.get({ produtosPorCategoria: {}, categorias: [] }, (data) => {
        let produtosPorCategoria = data.produtosPorCategoria;
        let categorias = data.categorias;

        if (!produtosPorCategoria[categoria]) return;


        delete produtosPorCategoria[categoria];

        let index = categorias.indexOf(categoria);
        if (index !== -1) {
            categorias.splice(index, 1);
        }

        chrome.storage.local.set({ produtosPorCategoria, categorias }, () => {
            console.log(`Categoria "${categoria}" removida completamente.`);
            carregarProdutos();
        });
    });
}

function removerProduto(categoria, index) {
    chrome.storage.local.get({ produtosPorCategoria: {} }, (data) => {
        let produtosPorCategoria = data.produtosPorCategoria;
        produtosPorCategoria[categoria].splice(index, 1);
        chrome.storage.local.set({ produtosPorCategoria }, () => {
            carregarProdutos();
        });
    });
}

document.addEventListener('DOMContentLoaded', carregarProdutos);