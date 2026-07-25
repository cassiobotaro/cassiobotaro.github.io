+++
title = "Running a .zip as a Python application"
date = "2026-06-24"
publishDate = "2026-06-24"
description = "Python runs a .zip directly, all it takes is a __main__.py inside it. Here is the step by step and the zipapp module."
slug = "running-a-zip-with-python"
tags = ["python", "tips", "zipapp"]
categories = ["python"]
series = ["quick-tips"]
+++

## The problem

You have a Python application spread across several files and you want to ship everything as a single file. What if you could package it into a `.zip` and run it with `python app.zip`?

## The tip

You can, and it is simpler than it looks. Python knows how to execute a `.zip` directly, as long as there is a `__main__.py` inside it. Let's start from scratch.

Create a `__main__.py` file:

```python
print("Hello, world!")
```

Now zip it up:

```bash
zip app.zip __main__.py
```

And run it:

```bash
python app.zip
```

Output: `Hello, world!`. The `.zip` became executable, without unpacking anything.

### Why it works

When you point Python at a folder or a `.zip`, it looks for a `__main__.py` inside and runs that file as the entry point. It is the same `__main__` you get when you run `python -m package`: the name Python looks for to know where to start. Without that file, it complains that it could not find an entry point.

### With any application

For a real application, with several modules, building the zip by hand is tedious. The built-in `zipapp` module does it for you. You have a `myapp` folder with your code and you only need to say which function is the entry point:

```bash
python -m zipapp myapp -m "cli:main"
```

That generates a `myapp.pyz` (an executable zip) with a ready-made `__main__.py` inside, which only does:

```python
import cli
cli.main()
```

Then it is just `python myapp.pyz` and your whole application runs from a single file.

You can even include your dependencies in the zip, just install them inside the folder before packaging (`pip install -r requirements.txt --target myapp`). This only works for pure Python packages: C extensions do not run from inside the zip and need to be installed separately.

Want to run it without `python` in front, just `./myapp.pyz`? Generate the `.pyz` with `-p "/usr/bin/env python3"` and `chmod +x` it.

That's it, folks!

See you next time!

{}'s
