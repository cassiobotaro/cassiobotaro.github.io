+++
title = "Meu Primeiro Programa"
date = "2026-03-14"
description = "A história do meu primeiro programa real: uma calculadora para o famoso circuito integrado 555, escrita em Pascal lá pelos anos 2010."
tags = ["pascal", "python", "iniciantes", "eletrônica"]
categories = ["pascal", "python"]
slug = "meu-primeiro-programa"
+++

![CI 555 com calculadora e código Pascal](/images/555.png "O CI NE555 cercado de código Pascal — meu primeiro programa de verdade")

## Uma História de Técnico em Automação

Em 2010 me formei como técnico em Automação Industrial. Se você não sabe bem o que isso significa, pense em fábricas, esteiras, robôs, CLPs, sensores e uma porção de siglas que a maioria das pessoas nunca vai precisar conhecer. Foi um curso incrível, que misturava eletrônica, mecânica e — aqui começa a história — programação.

Foi mais ou menos nessa época que comecei a programar de verdade. E a primeira linguagem que aprendi foi **Pascal**.

Pascal é uma linguagem que hoje em dia você raramente vai encontrar sendo ensinada em cursos novos, mas durante muitos anos foi a linguagem padrão para ensinar lógica de programação. Ela é verbosa, estruturada e bastante legível — perfeita para quem está aprendendo.

Depois dos exercícios das disciplinas, comecei a pensar: _e se eu fizesse algo útil?_ Algo que pudesse realmente usar no dia a dia do curso? Foi aí que nasceu meu primeiro programa de verdade: uma **calculadora para o circuito integrado 555**.

## O Que É o Circuito Integrado 555?

Se você nunca ouviu falar do CI 555, saiba que ele é uma lenda da eletrônica. Lançado em 1972 pela Signetics, esse pequenino chip de 8 pinos é considerado um dos componentes eletrônicos mais vendidos de todos os tempos. Calcula-se que bilhões de unidades já foram fabricadas.

O 555 é um temporizador. Com ele, você consegue gerar pulsos elétricos, controlar tempos, piscar LEDs, acionar alarmes e fazer dezenas de outras coisas práticas com pouquíssimos componentes externos: basicamente resistores e capacitores.

> **Resistor** é um componente que limita a passagem de corrente elétrica. Pense nele como uma pedra no meio de um rio — quanto maior a pedra, menos água passa.
> **Capacitor** é um componente que armazena energia elétrica temporariamente, como um pequeno reservatório que enche e esvazia.

Veja como ele se parece em um diagrama:

```
                    ||= = = = = = =||
                 ---||7      8   4 ||---
                    ||             ||
                 ---||6            ||
                    ||    555    3 ||---
                    ||             ||
                 ---||2          5 ||---
                    ||      1      ||
                    ||= = = = = = =||
```

Cada número representa um dos 8 pinos do chip, cada um com uma função específica:

| Pino | Nome | Função |
|------|------|--------|
| 1 | GND | Terra (referência elétrica, 0V) |
| 2 | Trigger | Disparo (inicia o temporizador) |
| 3 | Output | Saída (onde você conecta o que quer controlar) |
| 4 | Reset | Reinicia o chip |
| 5 | Control Voltage | Tensão de controle |
| 6 | Threshold | Limiar (define quando o capacitor está "cheio") |
| 7 | Discharge | Descarga do capacitor |
| 8 | VCC | Alimentação positiva |

O 555 pode operar de dois modos principais: **astável** e **monoestável**. É exatamente isso que meu programa calculava.

---

## Modo Astável: O Oscilador Eterno

No modo astável, o 555 fica oscilando sozinho, gerando uma onda elétrica que alterna entre ligado e desligado sem parar — como um coração eletrônico que bate por conta própria.

Isso é útil para piscar um LED, gerar um som contínuo, acionar um motor em intervalos, etc.

O circuito fica assim:

```
                       ↑ VCC
             RA        |
           /\/\/\------|__ _ __ _ _
          |            |          |
          |   ||= = = = = = =||   |
          /---||7      8   4 ||---|
      RB  \   ||             ||
          /   ||             ||
          \---||6    555    3||---SAÍDA
          |   ||             ||
          |---||2          5 ||---|
          |   ||      1      ||   |
        __|__ ||= = = = = = =|| __|__
        _____ C1       |        _____
          |            |          | 10
          |____________|__________| nf
                     __|__
                      ___ GND
                       _
```

Nesse circuito, **RA** e **RB** são resistores, e **C1** é o capacitor. O funcionamento é simples de entender:

1. O capacitor **C1** começa a carregar pela corrente que passa pelos dois resistores (RA e RB).
2. Quando está suficientemente carregado, o 555 muda a saída de nível alto para nível baixo e começa a descarregar o capacitor, mas agora apenas pelo RB.
3. Quando está suficientemente descarregado, o processo se reinicia.

Esse ciclo infinito gera uma onda quadrada na saída. As fórmulas para calcular as características dessa onda são:

```
Frequência  (Hz) = 1.44 / ((RA + 2×RB) × C)
Tempo alto   (s) = 0.693 × (RA + RB) × C
Tempo baixo  (s) = 0.693 × RB × C
Período      (s) = Tempo alto + Tempo baixo
```

> **Frequência** é quantas vezes por segundo o ciclo se repete. **Período** é o tempo de um ciclo completo. São inversamente proporcionais: quanto maior a frequência, menor o período.

---

## Modo Monoestável: O Pulso Único

No modo monoestável, o 555 fica quieto esperando um **disparo** externo. Quando recebe esse sinal (geralmente um botão pressionado ou outro circuito), ele gera um único pulso de duração determinada e depois volta ao repouso.

É útil para criar temporizações: "acione esta lâmpada por exatamente 10 segundos", "trave essa porta por 5 segundos", etc.

O circuito fica assim:

```
                       ↑ VCC
              R        |
           /\/\/\------|__ _ __ _ _
           |           |           |
           |  ||= = = = = = =||    |
           ---||7      8   4 ||----|
           |  ||             ||
           |  ||             ||
           |--||6    555    3||---SAÍDA
           |  ||             ||
  Disparo--)--||2          5 ||---|
           |  ||      1      ||   |
           |  ||= = = = = = =|| __|__
         __|__         |         _____
       C _____         |          | 10
           |___________|__________| nf
                     __|__
                      ___ GND
                       _
```

Aqui só precisamos de um resistor **R** e um capacitor **C**. A fórmula da temporização é simples:

```
Temporização (s) = 1.1 × R × C
```

Basta escolher os valores de R e C para obter o tempo desejado.

---

## O Programa em Pascal

Com esses conceitos em mente, escrevi meu primeiro programa. A ideia era: o usuário informa os valores dos componentes (resistores e capacitor) e o programa calcula os resultados e mostra o circuito na tela.

Tudo isso em **Pascal**, direto no terminal. Sem interface gráfica, sem mouse. 😄

Você pode experimentar o código online em: [https://www.onlinegdb.com/online_pascal_compiler](https://www.onlinegdb.com/online_pascal_compiler)

O programa começa com um menu principal que mostra o símbolo do 555 desenhado em ASCII art:

```pascal
program prog555;
uses crt;
var
  opcao: String;

begin
  opcao := '0';
  while opcao <> '3' do
  begin
    clrscr;
    writeln('Progama para calculos do multivibrador 555    Versão 3.0');
    writeln('Bem vindo ao menu de opções escolha sua opção:');
    writeln('                            ||= = = = = = =||       ');
    writeln('                         ---||7      8   4 ||---    ');
    writeln('                            ||             ||       ');
    writeln('                         ---||6            ||       ');
    writeln('                            ||    555    3 ||---    ');
    writeln('                            ||             ||       ');
    writeln('                         ---||2          5 ||---    ');
    writeln('                            ||      1      ||       ');
    writeln('                            ||= = = = = = =||       ');
    writeln('1-Modo Astável, 2-Modo Monoestável, 3-fim do programa');
    readln(opcao);
    CASE opcao OF
      '1': modoastavel;
      '2': modomono;
      '3': break;
    else
      writeln('Numero invalido');
      delay(500);
    END;
  end;
end.
```

O cálculo do modo astável ficou assim — repare nas fórmulas diretamente no `writeln`:

```pascal
procedure modoastavel;
var
  ra, rb, c1, i: real;
  op: string;
begin
  // leitura dos valores de RA, RB e C1...
  if (ra >= 1) and (rb >= 1) and (ra <= 10000) and (rb <= 10000) then
  begin
    writeln('Frequência é:', 1.44 / ((ra + (2 * rb)) * c1):5:2, ' Khz');
    writeln('Tempo em nível alto do pulso', (0.693 * ((ra + rb) * c1)):5:2, 'ms');
    writeln('Tempo em nivel baixo do pulso', (0.693 * rb * c1):5:2, 'ms');
    writeln('Periodo é:', ((0.693 * ((ra + rb) * c1)) + (0.693 * rb * c1)):5:2);
  end;
end;
```

E o modo monoestável:

```pascal
procedure modomono;
var
  r, c, cont: real;
  op: char;
begin
  // leitura dos valores de R e C...
  writeln('Temporização é:', (1.1 * r * c):5:2, 'segundos');
end;
```

Simples, direto ao ponto. As fórmulas aplicadas ali são exatamente as mesmas que vimos nas seções anteriores. Naquela época, ver o computador calcular um resultado que eu teria de fazer na mão (ou na calculadora) foi uma sensação incrível.

O código completo está disponível em: [github.com/cassiobotaro/meu_primeiro_programa/blob/master/meuprog.pas](https://github.com/cassiobotaro/meu_primeiro_programa/blob/master/meuprog.pas)

---

## Anos Depois: Reescrevendo em Python

Algum tempo depois, já mais experiente e programando em Python, decidi reescrever o mesmo programa. Confesso que a intenção foi quase uma transcrição fiel do Pascal — não quis mudar a lógica, apenas adaptar para a sintaxe de Python.

Veja como o menu ficou em Python:

```python
def main():
    opcao = 0
    while opcao != '3':
        opcao = input(
            '''
    Programa para cálculos do multivibrador 555

    Bem vindo ao menu de opções escolha sua opção:

                             |
                             |
                    ||= = = = = = =||
                 ---||7      8   4 ||---
                    ||             ||
                 ---||6            ||
                    ||    555    3 ||---
                    ||             ||
                 ---||2          5 ||---
                    ||      1      ||
                    ||= = = = = = =||
                            |
                            |

    1-Modo Astável, 2-Modo Monoestável, 3-fim do programa
            '''
        )
        if opcao == '1':
            modoastavel()
        elif opcao == '2':
            modomono()
        elif opcao == '3':
            print("Até mais! =)")
        else:
            print("Opção inválida")
            sleep(.5)
```

E o cálculo do modo astável em Python, agora com variáveis com nomes mais descritivos:

```python
def modoastavel():
    capacitor = float(input('Digite o valor do capacitor(uF): '))
    resistor_a = float(input('Digite o valor de RA(k ohms): '))
    resistor_b = float(input('Digite o valor de RB(k ohms): '))

    frequencia = 1.44 / ((resistor_a + 2 * resistor_b) * capacitor)
    frequencia *= 1000  # converte para hertz

    nivel_alto = 0.693 * ((resistor_a + resistor_b) * capacitor)
    nivel_baixo = 0.693 * resistor_b * capacitor

    if (1 <= resistor_a <= 10000) and (1 <= resistor_b <= 10000):
        print(f'Frequência é: {frequencia:.3f} hz')
        print(f'Tempo em nível alto do pulso: {nivel_alto:.3f} ms')
        print(f'Tempo em nível baixo do pulso: {nivel_baixo:.3f} ms')
```

E o modo monoestável:

```python
def modomono():
    resistor = float(input('Digite o valor de R(K ohms): '))
    capacitor = float(input('Digite o valor do capacitor(uF): '))

    temporizacao = 1.1 * resistor * capacitor
    print(f'Temporização é: {temporizacao:.3f} ms.')
```

A lógica é idêntica. A diferença está na sintaxe: Pascal é mais verboso (com `begin`, `end`, `writeln`, `readln`), enquanto Python é mais conciso e legível.

O código completo em Python está em: [github.com/cassiobotaro/meu_primeiro_programa/blob/master/meuprog.py](https://github.com/cassiobotaro/meu_primeiro_programa/blob/master/meuprog.py)

---

## Reflexão Final

Olhando para esse código hoje, é impossível não sorrir. Era um programa simples, cheio de imperfeições — variáveis com nomes de uma letra, validações básicas, sem tratamento de erros. Mas era _meu_ programa, feito para resolver um problema real do meu curso.

Esse é o ponto mais importante: não importa se o código é perfeito. O que importa é que ele resolve algo, que você aprende fazendo, e que cada programa te deixa um pouquinho melhor do que era antes.

Se você está começando agora, não espere dominar a linguagem para começar a criar. Escolha um problema pequeno e real para você, e resolva-o. Mesmo que o código fique feio, o aprendizado vai ser enorme.

Então é isso pessoal!

Até a próxima!

{}'s
