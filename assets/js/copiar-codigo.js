// Adiciona um botão de copiar em cada bloco de código do post.
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".content .highlight").forEach(function (bloco) {
    var codigo = bloco.querySelector("code");
    if (!codigo) {
      return;
    }

    var botao = document.createElement("button");
    botao.type = "button";
    botao.className = "botao-copiar";
    botao.textContent = "copiar";
    botao.setAttribute("aria-label", "Copiar código");

    botao.addEventListener("click", function () {
      navigator.clipboard.writeText(codigo.innerText.replace(/\n$/, "")).then(
        function () {
          avisar("copiado!");
        },
        function () {
          avisar("falhou");
        }
      );
    });

    function avisar(texto) {
      botao.textContent = texto;
      setTimeout(function () {
        botao.textContent = "copiar";
      }, 2000);
    }

    bloco.appendChild(botao);
  });
});
