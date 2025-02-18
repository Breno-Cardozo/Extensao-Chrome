document.getElementById('botao').addEventListener('click', async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab) {
        let [result] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            args: [tab.url],
            func: (url) => {
                const site = new URL(url).hostname
                    .replace(/^www\./, '')
                    .replace(/\.com/, '')
                    .replace(/\.br$/, '')
                    .replace(/^pt\./, '')
                    .toUpperCase();

                let produto = "Produto não encontrado";
                let preco = "Preço não encontrado";
                let imageUrl = "Imagem não encontrada";
                let linkProduto = url;

                switch (site) {
                    case "MERCADOLIVRE":
                        produto = document.querySelector('h1.ui-pdp-title')?.innerText || produto;
                        preco = document.querySelector('span[aria-roledescription="Preço"]')?.innerText || preco;
                        imageUrl = document.querySelector('img[data-index="0"]')?.src || imageUrl;
                        break;
                    case "PRODUTO.MERCADOLIVRE":
                        produto = document.querySelector('h1.ui-pdp-title')?.innerText || produto;
                        preco = document.querySelector('span[aria-roledescription="Preço"]')?.innerText || preco;
                        imageUrl = document.querySelector('img[data-index="0"]')?.src || imageUrl;
                        break;
                    case "ALIBABA":
                        produto = document.querySelector('h1')?.innerText || produto;
                        preco = document.querySelector('div.price-list')?.innerText || preco;
                        imageUrl = document.querySelector('img.id-h-full.id-w-full.id-object-contain')?.src || imageUrl;
                        break;
                    case "ALIEXPRESS":
                        produto = document.querySelector('h1[data-pl="product-title"]')?.innerText || produto;
                        preco = document.querySelector('span.price--currentPriceText--V8_y_b5.pdp-comp-price-current.product-price-value')?.innerText || preco;
                        imageUrl = document.querySelector('img[style="transform: translate(0px, 0px);"]')?.src || imageUrl;
                        break;
                }

                return { produto, preco, imageUrl, site, linkProduto };
            }
        });

        if (result && result.result) {
            let novoProduto = result.result;

            // Pega os produtos já salvos
            chrome.storage.local.get({ produtos: [] }, (data) => {
                let produtos = data.produtos;

                // Adiciona o novo produto à lista
                produtos.push(novoProduto);

                // Salva de volta no storage
                chrome.storage.local.set({ produtos }, () => {
                    console.log("Produto salvo:", novoProduto);
                    carregarProdutos(); // Atualiza a lista exibida
                });
            });
        }
    }
});

// Função para carregar os produtos ao abrir a extensão
function carregarProdutos() {
    chrome.storage.local.get({ produtos: [] }, (data) => {
        let lista = document.getElementById('lista-produtos');
        lista.innerHTML = ""; // Limpa a lista antes de renderizar

        data.produtos.forEach((produto, index) => {
            document.getElementById('tela-produto').style.display = "flex";
            let item = document.createElement('tr');
            item.innerHTML = `
                <td>${produto.site}</td>
                <td>${produto.produto}</td>
                <td>${produto.preco}</td>
                <td>
                    <a href="${produto.linkProduto}" target="_blank">Link do anúncio</a>
                </td>
                <td>
                    <img src="${produto.imageUrl}" style="max-width: 40px;">
                </td>
                <td>
                    <button class="remove-btn" data-index="${index}">Remover</button>
                </td>
            `;
            lista.appendChild(item);
        });

        // Adiciona evento de clique para cada botão "Remover"
        document.querySelectorAll('.remove-btn').forEach(button => {
            button.addEventListener('click', () => {
                let index = button.getAttribute("data-index");
                removerProduto(index);
            });
        });
    });
}

// Função para remover um produto pelo índice
function removerProduto(index) {
    chrome.storage.local.get({ produtos: [] }, (data) => {
        let produtos = data.produtos;
        produtos.splice(index, 1); // Remove o item da lista

        chrome.storage.local.set({ produtos }, () => {
            carregarProdutos(); // Atualiza a interface
        });
    });
}

// Carrega os produtos ao abrir a extensão
document.addEventListener('DOMContentLoaded', carregarProdutos);
