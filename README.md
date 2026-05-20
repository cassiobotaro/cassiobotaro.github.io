# cassiobotaro.github.io

✍️ My personal blog

## Rodando localmente

### Pré-requisitos

- Git
- [Hugo](https://gohugo.io/installation/) (>= 0.146)
- [Dart Sass](https://sass-lang.com/dart-sass/) para compilar o SCSS do tema

Este projeto usa o tema `hugo-coder` como submódulo Git, então o tema precisa estar inicializado antes de subir o servidor.

### Clonando o repositório

Se for clonar do zero, prefira:

```bash
git clone --recurse-submodules git@github.com:cassiobotaro/cassiobotaro.github.io.git
cd cassiobotaro.github.io
```

Se você já clonou o repositório sem os submódulos:

```bash
git submodule update --init --recursive
```

### Instalando o Hugo

Instale o Hugo (>= 0.146) e o Dart Sass com o gerenciador de pacotes do seu sistema ou manualmente pelas páginas oficiais:

```bash
hugo version
sass --version
```

#### Ubuntu/Debian

Com `sudo` disponível:

```bash
sudo apt update
sudo apt install hugo
sudo snap install dart-sass
hugo version
```

Se quiser persistir o binário no `PATH`, adicione esta linha ao seu `~/.bashrc` ou `~/.zshrc`:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

### Subindo o servidor local

Com o Hugo instalado e os submódulos inicializados:

```bash
hugo server -D
```

Depois, abra:

```text
http://localhost:1313
```

### Gerando a versão estática

Para validar o build localmente:

```bash
hugo --gc --minify
```
