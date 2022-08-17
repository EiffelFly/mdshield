
# MD Shield
Guard your markdown/mdx file's frontmatter/meta with vscode extension and in-project pre-build script.

## What is this 

MDShield will highlight the type error of your markdown frontmatter. And you could use MDShield as a pre-build script to ensure every markdown file's frontmatter in your project is correct.

## How to use

1. Add `mdshield.config.mjs|js` at the root of your project.

```js
// mdshield.config.mjs
const config = {
  strict: true,
  meta: "frontmatter",
  types: {
    regular: {
      title: "string | 123 | false | null",
      description: "string",
      },
    },
  },
};

export default config;
```

```js
// mdshield.config.js
module.export = {
  strict: true,
  meta: "frontmatter",
  types: {
    regular: {
      title: "string | 123 | false | null",
      description: "string",
      },
    },
  },
};
```

2. Download the MDShield VSCode extension.

3. Enjoy the type intelligence MDShield provided.

## Configuration

### strict(boolean)

- strict mode:
  - Every markdown/mdx file's frontmatter need to set `type` field.
  - Can not have the undeclared field. 
  - Can not have the undefined field that had been declared in the type config.
- non-strict mode:
  - MDShield won't check markdown/mdx file without `type` field.
  - MDShield won't check the undeclared field.
  - MDShield won't check the undefined field.

### meta(`frontmatter`)

We currently only support frontmatter in markdown and mdx file.

### types(`Object`)

#### About the type name

The types you want your frontmatter to have. The first key is the name of this type. 

```js

// In mdshield.config.js
const config = {
  strict: true,
  meta: "frontmatter",
  types: {
    foo: { // <-- This type's name is foo 
      ...
    },
  },
};
```

```md
// In your markdown file
---
type: foo // <-- You need to specific what is the target type of this markdown file
---
```

#### About the type

The type declaration is similar to Typescript, we support string, number, object, null and union type. But we don't support undefined type.

- `string | number | null` = The field allows string, number or null/undefined.
- `string | 123` = The field allows string and number 123 specifically.
- `number | foo` = The field allows number and string foo specifically. 

## License

MIT

<img src="https://user-images.githubusercontent.com/57251712/185149358-38002cba-2674-4fe9-93e3-0e2b14d618fe.png" alt="The logo of MDShield" width="100" height="100">
