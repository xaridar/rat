# RAT

RAT is a simple HTML templating language for displaying simple pages with state in Express.

<br>

# Installation

via npm:

```
$ npm install @xaridar/rat
```

<br>

# Syntax

RAT is a simple syntax for writing basic HTML. Here is an example of its features:

```
>This is a header
>>Up to 6 angle brackets can be used for smaller header elements

Plain text converts into a p tag in HTML.
Two consecutive blank lines represent a newline.


An image tag is represented as an image path between [image]
Videos are similar but between [[video]]

{
    Divisions in a page can be denoted using {content}, or |content| for centered divisions.
    By default, all included elements will be placed next to each other,
    but this can be changed
}
Links are placed between <link>. If there is no space between a preceding element and the link, it will be placed on the proceeding element;
Otherwise, the link reference will be displayed on the page.
For example:
<https://npmjs.com/package/@xaridar/rat>
vs
RAT<https://npmjs.com/package/@xaridar/rat>

>>>Lists
Lists can be created 2 ways:

Unordered lists can be denoted as a list of elements, each precedes by a single dash and space:
- element 1
- element 2

- this element starts a new list


Ordered lists are preceded by any number followed by a period, space, and element:
1. Ordered
2. second
1. numbers do not have to be unique or sequential
```

## Variables

Variables passed in on compilation can be accessed between %s like: `%variable%`

If a requested variable is not passed, an error will occur

Array variables can be passed, and each element can be accessed in a loop.

For example:

```
!%names% *name* {
    1. A name is %name%
}
```

would compile to an ordered list of elements, with `%name%` replaced by each individual name in `%names%`.

## Properties

RAT supports a couple properties at the top of the file.
To specify a property, use

```
^ [property name]: [value]
```

Currently, the supported properties are:

-   `theme` for theme color
-   `bg` for background color

These two properties are to specify color only when using default styles. They accept any CSS-accepted color, including hsl, rgb, rgba, hexadecimal, or CSS color words.

-   `css` for custom CSS file

By default, styling is provided by a default CSS file. However, another CSS file can be specified and linked to.  
Custom classes can also be added to divs in RAT by using the syntax

```
{.class-name
    content
}
```

This can then be styled using a CSS reference to `.class-name` in a custom file.

# API

Here are the basic capabilities of the API:

```js
const rat = require('@xaridar/rat');

// error callback
const err = console.error;

// variables
const options = { names: ['Bob', 'Sally'] };

// get raw HTML output from file
const html = rat.renderRat('string of RAT', options, err);
```

When using express.js for file serving, RAT can be used directly as a template engine by placing `.rat` files in the `views` folder.

```js
const rat = require('@xaridar/rat');
const express = require('express');

const app = express();

// enable RAT templating
rat.enableRat(app);
app.set('view engine', rat);

app.get('/', (req, res) => {
	res.render('index', {
		names: req.query.names,
	});
});
```
