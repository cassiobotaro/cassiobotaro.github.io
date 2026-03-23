# cassiobotaro.github.io

✍️ My personal blog

## Rodando localmente

### Pré-requisitos

- Git
- [Hugo extended](https://gohugo.io/installation/)

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

Instale a versão **extended** do Hugo com o gerenciador de pacotes do seu sistema ou manualmente pela página oficial:

```bash
hugo version
```

O comando acima deve exibir uma versão contendo `extended`.

#### Ubuntu/Debian

Com `sudo` disponível:

```bash
sudo apt update
sudo apt install hugo
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
