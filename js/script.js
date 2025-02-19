document.getElementById('botao').addEventListener('click', async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab) {
        let [result] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            args: [tab.url],
            func: (url) => {
                site = new URL(url).hostname
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
                        site = "Mercado Livre"
                        break;
                    case "PRODUTO.MERCADOLIVRE":
                        produto = document.querySelector('h1.ui-pdp-title')?.innerText || produto;
                        preco = document.querySelector('span[aria-roledescription="Preço"]')?.innerText || preco;
                        imageUrl = document.querySelector('img[data-index="0"]')?.src || imageUrl;
                        site = "Mercado Livre"
                        break;
                    case "ALIBABA":
                        produto = document.querySelector('h1')?.innerText || produto;
                        preco = document.querySelector('div.price-list')?.innerText || preco;
                        imageUrl = document.querySelector('img.id-h-full.id-w-full.id-object-contain')?.src || imageUrl;
                        site = "AliBaba"
                        break;
                    case "ALIEXPRESS":
                        produto = document.querySelector('h1[data-pl="product-title"]')?.innerText || produto;
                        preco = document.querySelector('span.price--currentPriceText--V8_y_b5.pdp-comp-price-current.product-price-value')?.innerText || preco;
                        imageUrl = document.querySelector('img[style="transform: translate(0px, 0px);"]')?.src || imageUrl;
                        site = "AliExpress"
                        break;
                }

                return { produto, preco, imageUrl, site, linkProduto };
            }
        });

        if (result && result.result) {
            let novoProduto = result.result;

            chrome.storage.local.get({ produtos: [] }, (data) => {
                let produtos = data.produtos;

                produtos.push(novoProduto);

                chrome.storage.local.set({ produtos }, () => {
                    console.log("Produto salvo:", novoProduto);
                    carregarProdutos();
                });
            });
        }
    }
});

function carregarProdutos() {
    chrome.storage.local.get({ produtos: [] }, (data) => {
        let lista = document.getElementById('lista-produtos');
        lista.innerHTML = "";

        if (data.produtos.length < 1) {
            document.getElementById('tela-produto').style.display = "none";
        }

        data.produtos.forEach((produto, index) => {
            document.getElementById('tela-produto').style.display = "flex";
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
                    <button class="remove-btn" data-index="${index}">X</button>
                </td>
            `;

            lista.appendChild(item);
        });

        document.querySelectorAll('.remove-btn').forEach(button => {
            button.addEventListener('click', () => {
                let index = button.getAttribute("data-index");
                removerProduto(index);
            });
        });
    });
}

function removerProduto(index) {
    chrome.storage.local.get({ produtos: [] }, (data) => {
        let produtos = data.produtos;
        produtos.splice(index, 1);

        chrome.storage.local.set({ produtos }, () => {
            carregarProdutos();
        });
    });
}

document.addEventListener('DOMContentLoaded', carregarProdutos);
