+++
title = "Dublês de testes"
date = "2020-09-19"
description = "Escrevendo dublês para seus testes."
tags = ["python", "tests", "dubles"]
categories = ["tests"]
slug = "dubles-de-testes"
+++

![dublê](/images/dubles.jpg "dublês")

Normalmente quando falamos de _mocks_, estamos nos referindo a um componente simulado de _software_. Porém existem vários tipos de simulações que podem ser feitas que podem ajudar a escrever os testes.

> ⚠️ Os códigos deste post utilizam `pytest-mock` e `requests` que são libs de terceiros. Certifique-se de tê-las instaladas caso decida rodar os códigos.

Como base para nossos testes, vamos definir a seguinte função que realiza uma requisição web e retorna o conteúdo de sua resposta. Porém caso algum erro ocorra, deve retornar um conteúdo vazio e imprimir um alerta com o erro ocorrido.

```python
import requests
from logging import warning


def fetch_page_content(url, timeout=1):
    try:
        response = requests.get(url, timeout=timeout)
        response.raise_for_status()
    except IOError as exc:
        warning(exc)
        return ""
    else:
        return response.text
```

Vamos conceituar cada um dos tipos de dublês de teste e como poderiam ser utilizados para testar a função apresentada acima.

> :bulb: As definições em inglês foram retiradas de: [https://martinfowler.com/bliki/TestDouble.html](https://martinfowler.com/bliki/TestDouble.html).

## Dummy

> Dummy objects are passed around but never actually used. Usually they are just used to fill parameter lists.

São objetos "dummy", ou seja falsos, fictícios, que serão utilizados apenas para preencher a lista de parâmetros obrigatórios, mas não serão utilizados.

## Fake

> Fake objects actually have working implementations, but usually take some shortcut which makes them not suitable for production (an InMemoryTestDatabase is a good example).

São objetos falsos, com implementações concretas, porém simplificadas. Um bom exemplo são objetos que representam bancos de dados ou arquivos, porém com implementações em memória.

Para utilização da técnica de objetos _fakes_, vamos primeiro fazer uma inversão de dependência no código de modo a receber o objeto responsável por realizar as requisições como parâmetro.

```python
import requests
from logging import warning

def requests_fetcher(url, timeout=1):
    response = requests.get(url, timeout=timeout)
    response.raise_for_status()
    return response


def fetch_page_content(fetcher, url, timeout=1):
    try:
        response = fetcher(url, timeout)
    except IOError as exc:
        warning(exc)
        return ""
    else:
        return response.text
```

Nos testes podemos substituir a função `fetcher`, por uma função _fake_ com uma implementação simplificada.

```python
class TestFetchPageContentFake:
    def test_when_request_is_ok(self):
        # preparamos nosso teste definindo o retorno esperado
        expected_content = "page_content"

        def fake_fetcher(url, timeout=1):
            # definimos uma função falsa que substituirá a requisição real

            # definimos objeto de resposta falso com o coonteúdo definido
            # como conteúdo esperado
            class FakeResponse:
                def __init__(self):
                    self.text = expected_content
            # a função retornará este objeto como resposta quando invocada
            return FakeResponse()

        # por fim fazemos a afirmação do nosso teste
        # verificamos se o resultado da função é igual ao contepudo esperado
        assert (
            fetch_page_content(fake_fetcher, "dummy url") == expected_content
        )

    def test_when_request_fail(self):
        # em nossa preparação estamos definindo que o retorno esperado
        # é uma string vazia
        expected_content = ""

        # nossa função fake agora é simplificada lançando uma exceção
        # pois esse é o comportamento esperado se essa requisição fosse real
        def fake_fetcher(url, timeout=1):
            raise IOError("Failure on request")
        # por fim comparamos se o resultado obtido foi o mesmo do esperado
        assert (
            fetch_page_content(fake_fetcher, "dummy url") == expected_content
        )
```

## Stub

> Stubs provide canned answers to calls made during the test, usually not responding at all to anything outside what's programmed in for the test.

São substitutos que fornecem respostas previamente definidas, simulando assim o comportamento esperado.

Considerando novamente nossa função original:

```python
import requests
from logging import warning


def fetch_page_content(url, timeout=1):
    try:
        response = requests.get(url, timeout=timeout)
        response.raise_for_status()
    except IOError as exc:
        warning(exc)
        return ""
    else:
        return response.text
```

Nosso teste substituirá o método get da biblioteca requests, retornando respostas programadas e em alguns casos lançando uma exceção.

```python
class TestFetchPageContentStub:
    def test_when_request_is_ok(self, mocker):
        # preparamos nosso teste definindo o retorno esperado
        expected_content = "page_content"

        # substituimos o método get da biblioteca requests por um stub
        # o parâmetro autospec garante que caso cometemos
        # algum erro de digitação
        # a especificação da função será respeitado
        mocked_get = mocker.patch.object(requests, "get", autospec=True)
        # definimos que o objeto retornado possuirá código de status 200
        mocked_get.return_value.status_code = 200
        # o objeto retornado possuirá o texto esperado
        mocked_get.return_value.text = expected_content

        # comparamos o retorno esperado e o obtido
        assert fetch_page_content("dummy url") == expected_content

    def test_when_request_fail(self, mocker):
        # em nossa preparação estamos definindo que o retorno esperado
        # é uma string vazia
        expected_content = ""

        # substituimos o método get por um stub
        mocked_get = mocker.patch.object(requests, "get", autospec=True)
        # quando invocado o método raise_for_status do retorno do nosso stub
        # uma exceção será lançada
        mocked_get.return_value.raise_for_status.side_effect = (
            requests.HTTPError()
        )

        # por fim comparamos se o resultado obtido foi o mesmo do esperado
        assert fetch_page_content("dummy url") == expected_content
```

## Mocks

> Mocks are pre-programmed with expectations which form a specification of the calls they are expected to receive. They can throw an exception if they receive a call they don't expect and are checked during verification to ensure they got all the calls they were expecting.

A preocupação de mocks é verificar se o comportamento do dublê foi o esperado, fazendo asserções se o _mock_ foi invocado, se os parâmetros na invocação foram corretos e o número de vezes em que foi invocado. Não há intenção de simular o retorno de valores, mas somente verificar o comportamento.

```python
class TestFetchPageContentMock:
    def test_when_timeout_is_not_passed(self, mocker):
        '''when invoked, default timeout should be considered'''
        # preparamos nosso teste modificando o método get por um mock
        dummy_url = "dummy url"
        mocked_get = mocker.patch.object(requests, "get", autospec=True)

        # invocamos nossa função
        fetch_page_content(dummy_url)

        # a asserção é feita verificando se o método foi chamado
        # com os parâmetros corretos
        # ou seja, verificamos o comportamento do método
        mocked_get.assert_called_once_with(dummy_url, timeout=1)

    def test_when_called_verify_if_status_code_is_ok(self, mocker):
        # preparamos nosso teste modificando o método get por um mock
        dummy_url = "dummy url"
        mocked_get = mocker.patch.object(requests, "get", autospec=True)

        # invocamos nossa função
        fetch_page_content(dummy_url)

        # a asserção é feita verificando se o método raise_for_status
        # do retorno do nosso método
        # foi invocado somente uma vez
        mocked_get.return_value.raise_for_status.assert_called_once()
```

## Spies

> Spies are stubs that also record some information based on how they were called. One form of this might be an email service that records how many messages it was sent.

São stubs mas "espionam" como são invocados e mantém isto como informação a ser utilizada nas asserções.

```python
class TestFetchPageContentSpy:
    def test_when_request_is_ok(self, mocker):
        # preparamos os testes definindo os estados esperados
        expected_content = "page_content"

        # definimos um espião para substituir a função get
        mocked_get = mocker.patch(
            "requests.get", MagicMock(wraps=requests.get)
        )
        # assim como um stub, definimos os valores a serem retornados
        mocked_get.return_value.status_code = 200
        mocked_get.return_value.text = expected_content
        # verificamos se o valor retornado é o mesmo do esperado
        assert fetch_page_content("dummy url") == expected_content

    def test_when_request_fail(self, mocker):
        # Como estamos testando estados, até aqui temos nosso substituto
        # como um stub
        expected_content = ""

        mocked_get = mocker.patch(
            "requests.get", MagicMock(wraps=requests.get)
        )
        mocked_get.return_value.raise_for_status.side_effect = (
            requests.HTTPError()
        )

        assert fetch_page_content("dummy url") == expected_content

    def test_when_timeout_is_not_passed(self, mocker):
        """when invoked, default timeout should be considered"""
        # a diferença está aqui, pois podemos utilizar nosso espião
        # para verificar como ele foi invocado
        # e quais parâmetros foram utilizados
        dummy_url = "https://example.com"

        mocked_get = mocker.patch(
            "requests.get", MagicMock(wraps=requests.get)
        )
        # se não passarmos um retorno,
        # o espião se comportará como a função original
        mocked_get.return_value.status_code = 200

        fetch_page_content(dummy_url)

        # a asserção verifica como a função se comporta
        # ou seja espiões são stubs mas "espionam" o comportamento
        mocked_get.assert_called_once_with(dummy_url, timeout=1)
```

## Conclusão

Temos dois tipos de verificações quando utilizamos dublês. Verificações de comportamento como em mocks e verificações de estado como em stubs. Qual o tipo de dublê que será utilizado, vai depender do que você está testando.

Os códigos aqui apresentados são apenas exemplos de como implementar os padrões de dublês, podendo ser implementados de forma diferente.

Então é isso pessoal!

Até a próxima!

{}'s
