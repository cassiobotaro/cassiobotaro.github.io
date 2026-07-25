+++
title = "Invoking modules with python -m"
date = "2026-07-06"
publishDate = "2026-07-06"
description = "The -m flag runs a module as a script, and the standard library is full of ready-made utilities: http.server, json.tool, calendar and many more."
slug = "python-m-module"
tags = ["python", "tips", "cli"]
categories = ["python"]
series = ["quick-tips"]
+++

Python has the `-m` flag, which locates a module and runs it as a script. And the standard library is full of modules that turn into command line utilities ready to use, with nothing to install.

Serve the current folder over HTTP:

```bash
python -m http.server
```

Format (and validate) a JSON:

```bash
echo '{"name": "cassio", "language": "python"}' | python -m json.tool
```

See the calendar for the year in your terminal:

```bash
python -m calendar 2026
```

You have probably already used the flag without noticing, in commands like `python -m venv .venv` or `python -m pip install`. It is the same mechanism: `-m` locates the module on the import path and executes it as the main program, with `__name__` set to `"__main__"` (when the target is a package, what runs is its `__main__.py`).

### Want the full list?

I went after every standard library module that works this way and catalogued it all in the [awesome-python-modules-as-script](https://github.com/cassiobotaro/awesome-python-modules-as-script) repository. There is a fake SMTP server for testing, compression with `gzip`, benchmarking with `timeit` and much more.

That's it, folks!

See you next time!

{}'s
