(() => {
    let seletores = {};
    let elementoSelecionado = null;

    function ativarPicker(tipo) {
        alert(`Clique no elemento que representa o ${tipo}`);

        function selecionarElemento(event) {
            event.preventDefault();
            event.stopPropagation();

            if (document.getElementById('custom-site-modal')?.contains(event.target)) {
                return;
            }

            if (elementoSelecionado) {
                elementoSelecionado.style.outline = "";
            }

            elementoSelecionado = event.target;

            let { seletor, estrutura } = gerarSeletor(event.target);

            seletores[tipo] = seletor;
            if (tipo === "produto") {
                seletores['estruturaProduto'] = estrutura;
            }
            else if (tipo === "preco") {
                seletores['estruturaPreco'] = estrutura;
            }
            else if (tipo === "imagem") {
                seletores['estruturaImagem'] = estrutura;
            }
            tipo = tipo.charAt(0).toUpperCase() + tipo.slice(1);

            alert(`${tipo} selecionado com sucesso`);

            document.removeEventListener('click', selecionarElemento, true);
        }

        document.addEventListener('click', selecionarElemento, { capture: true, once: true });
    }

    function gerarSeletor(elemento) {
        if (!elemento) return { seletor: null, estrutura: null };

        if (elemento.id) {
            return { seletor: `#${elemento.id}`, estrutura: `#${elemento.id}` };
        }

        let seletor = elemento.tagName.toLowerCase();
        let estrutura = [];

        if (elemento.className) {
            let classes = elemento.className
                .split(" ")
                .filter(c => c.trim() !== "")
                .join(".");

            seletor += `.${classes}`;
        }

        let path = [];
        while (elemento.parentElement) {
            let index = [...elemento.parentElement.children].indexOf(elemento) + 1;
            path.unshift(`${elemento.tagName.toLowerCase()}:nth-child(${index})`);
            estrutura.unshift(`${elemento.tagName.toLowerCase()}:nth-child(${index})`);
            elemento = elemento.parentElement;
        }

        return { seletor, estrutura: estrutura.join(" > ") };
    }


    function injectCSS() {
        let style = document.createElement("style");
        style.innerHTML = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');
            
            * {
                font-family: "Inter", serif;
            }

            #custom-site-modal {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 10000;
                box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.3);
            }

            #custom-site-content {
                background: white;
                padding: 16px;
                border-radius: 5px;
                width: auto;
                height: auto;
                text-align: center;
                display: flex;
                justify-content: center;
                align-items: center;
                flex-direction: column;
            }

            #custom-site-content h2 {
                font-size: 18px;
                margin-bottom: 8px;
            }

            #custom-site-content p {
                font-size: 14px;
                margin-bottom: 8px;

            }

            #custom-site-content button {
                display: block;
                width: 70%;
                margin-top: 4px;
                padding: 4px;
                border: none;
                background: #1e1e1e;
                color: #eee9e9;
                cursor: pointer;
                border-radius: 4px;
                fontSize: 13px
            }

            #custom-site-content button:hover {
                background-color: #eee9e9;
                color: #1e1e1e;
                font-weight: 700;
                border: 1px solid #1e1e1e;
                transition: background-color 0.5s;
            }
        `;
        document.head.appendChild(style);
    }


    function abrirModalParaNovoSite(site) {
        injectCSS();

        nameSite = site.toLowerCase()
        nameSite = nameSite.charAt(0).toUpperCase() + nameSite.slice(1)

        let modal = document.createElement("div");


        modal.innerHTML = `
            <div id="custom-site-modal">
                <div id="custom-site-content">
                    <h2>Site não reconhecido: ${nameSite}</h2>
                    <p>Selecione os elementos na página:</p>
                    <button id="selecionar-produto">Selecionar Nome do Produto</button>
                    <button id="selecionar-preco">Selecionar Preço</button>
                    <button id="selecionar-imagem">Selecionar Imagem</button>
                    <button id="salvar-seletores">Salvar</button>
                    <button id="fechar-modal">Fechar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('selecionar-produto').addEventListener('click', () => ativarPicker("produto"));
        document.getElementById('selecionar-preco').addEventListener('click', () => ativarPicker("preco"));
        document.getElementById('selecionar-imagem').addEventListener('click', () => ativarPicker("imagem"));

        document.getElementById('salvar-seletores').addEventListener('click', () => {
            window.postMessage({ tipo: "salvar", site, seletores }, "*");
            modal.remove();
        });

        document.getElementById('fechar-modal').addEventListener('click', () => {
            modal.remove();
        });
    }

    window.addEventListener("message", (event) => {
        if (event.source !== window) return;

        if (event.data.tipo === "abrir-modal") {
            abrirModalParaNovoSite(event.data.site);
        } else if (event.data.tipo === "salvar") {
            chrome.runtime.sendMessage({
                tipo: "salvarSeletores",
                site: event.data.site,
                seletores: event.data.seletores
            });

        }
    });
})();
