chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create("atualizarPrecos", { periodInMinutes: 30 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "atualizarPrecos") {
        atualizarPrecos();
    }
});

function atualizarPrecos() {
    chrome.storage.local.get({ produtos: [] }, async (data) => {
        let produtosAtualizados = [];

        for (let produto of data.produtos) {
            let novoPreco = await obterNovoPreco(produto.linkProduto);


            if (!novoPreco || novoPreco === produto.preco) {
                console.log("Preço não alterado");
                produtosAtualizados.push(produto);
                continue;
            }

            if (novoPreco == "Preço não encontrado") {
                console.log("Preço não encontrado");
                produtosAtualizados.push(produto);
                continue;
            }

            if (!produto.historicoPrecos) {
                produto.historicoPrecos = [];
            }


            produto.historicoPrecos.push({
                preco: produto.preco,
                data: new Date().toLocaleString()
            });


            produto.preco = novoPreco;
            produtosAtualizados.push(produto);
        }

        chrome.storage.local.set({ produtos: produtosAtualizados }, () => {
            console.log("Preços e histórico atualizados:", produtosAtualizados);
        });
    });
}


async function obterNovoPreco(url) {
    return new Promise((resolve) => {
        chrome.tabs.create({ url, active: false }, (tab) => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                args: [url],
                func: (url) => {
                    let site = new URL(url).hostname
                        .replace(/^www\./, '')
                        .replace(/\.com/, '')
                        .replace(/\.br$/, '')
                        .replace(/^pt\./, '')
                        .toUpperCase();

                    let preco = "Preço não encontrado";

                    switch (site) {
                        case "MERCADOLIVRE":
                        case "PRODUTO.MERCADOLIVRE":
                            preco = document.querySelector('span[aria-roledescription="Preço"]')?.innerText || preco;
                            break;
                        case "ALIBABA":
                            preco = document.querySelector('div.price-list')?.innerText || preco;
                            break;
                        case "ALIEXPRESS":
                            preco = document.querySelector('span.price--currentPriceText--V8_y_b5.pdp-comp-price-current.product-price-value')?.innerText || preco;
                            break;
                    }

                    return preco;
                }
            }, (results) => {
                let precoAtualizado = results && results[0] ? results[0].result : null;

                chrome.tabs.remove(tab.id);

                resolve(precoAtualizado);
            });
        });
    });
}


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.tipo === "salvarSeletores") {
        chrome.storage.local.get({ customSites: {} }, (data) => {
            let customSites = data.customSites;
            customSites[message.site] = message.seletores;
            chrome.storage.local.set({ customSites }, () => {
                console.log("Seletores salvos:", customSites);
            });
        });
    }
});

