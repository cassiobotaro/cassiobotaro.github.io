+++
title = "Instalando Pillow"
date = "2015-08-14"
description = "Como instalar a biblioteca pillow com suporte total a png,jpg,web."
tags = ["python", "python3", "ubuntu"]
categories = ["python"]
slug = "instalando-pillow"
+++

![ubuntu-pillow](/images/ubuntu_pillow.jpg "Travesseiro Ubuntu")

## Problema

Ao tentar instalar a biblioteca pillow, me deparei com o problema de não dar suporte a jpeg.

O erro apresentado era: "decoder jpeg not available".

Como estou desenvolvendo uma aplicação que irá redimensionar imagens jpeg e png isto é um problema.

## Solução

Após algumas buscas no Stack Overflow cheguei ao seguintes passos que funcionaram pra mim.

```bash
# Esta solução funciona em Ubuntu 14.04+

>>> sudo apt-get install libtiff5-dev  libjpeg8-dev  zlib1g-dev libfreetype6-dev liblcms2-dev libwebp-dev tcl8.6-dev tk8.6-dev python-tk

#For Ubuntu x64:

>>> sudo ln -s /usr/lib/x86_64-linux-gnu/libjpeg.so /usr/lib
>>> sudo ln -s /usr/lib/x86_64-linux-gnu/libfreetype.so /usr/lib
>>> sudo ln -s /usr/lib/x86_64-linux-gnu/libz.so /usr/lib

# Or for Ubuntu 32bit:

>>> sudo ln -s /usr/lib/i386-linux-gnu/libjpeg.so /usr/lib/
>>> sudo ln -s /usr/lib/i386-linux-gnu/libfreetype.so.6 /usr/lib/
>>> sudo ln -s /usr/lib/i386-linux-gnu/libz.so /usr/lib/

>>> pip install --no-cache-dir -v Pillow

# O -v é só para após a instalação checarmos se tudo correu bem.
```

## Conclusão

Sim, este foi um post ligeiro, com intuito de ajudar outros que possivelmente encontrem o mesmo erro que eu.

Espero que tenham gostado. Abraços!

Créditos para a solução e links interessantes:

- [http://stackoverflow.com/questions/8915296/python-image-library-fails-with-message-decoder-jpeg-not-available-pil](http://stackoverflow.com/questions/8915296/python-image-library-fails-with-message-decoder-jpeg-not-available-pil)

- [http://pillow.readthedocs.org/installation.html](http://pillow.readthedocs.org/installation.html)

- [http://shortrecipes.blogspot.com.br/2014/06/python-34-and-pillow-24-with-jpeg2000.html](http://shortrecipes.blogspot.com.br/2014/06/python-34-and-pillow-24-with-jpeg2000.html)

Então é isso pessoal!

Até a próxima!

{}'s
