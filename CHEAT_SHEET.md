# Reveal.js Markdown Cheat Sheet

## Slide Separators

```md
# Slide 1

---

# Slide 2 (horizontal)

--

## Slide 2a (vertical / nested)
```

- `---` → new horizontal slide
- `--` → new vertical (nested) slide

## Speaker Notes

```md
# My Slide

Content here

Note:
These are speaker notes. Press **S** to open the speaker view.
```

## Text Formatting

```md
**bold**  *italic*  ~~strikethrough~~  `inline code`

> Blockquote

- Bullet list
- Another item

1. Numbered list
2. Second item
```

## Links & Images

```md
[Link text](https://example.com)

![Alt text](image.png)
```

## Code Blocks

````md
```javascript
function hello() {
  console.log("world");
}
```
````

### Line Highlighting

````md
```javascript [1|3-4]
const a = 1;
const b = 2;
const c = a + b;
console.log(c);
```
````

`[1|3-4]` → first highlight line 1, then lines 3–4 on next click.

## Fragment Animations

```md
- Item 1 <!-- .element: class="fragment" -->
- Item 2 <!-- .element: class="fragment" -->
- Item 3 <!-- .element: class="fragment" -->
```

Fragment styles: `fade-in`, `fade-out`, `highlight-red`, `grow`, `shrink`, `strike`, `fade-up`

```md
- Appears then fades <!-- .element: class="fragment fade-in-then-out" -->
- Highlighted <!-- .element: class="fragment highlight-blue" -->
```

## Slide Attributes

```md
<!-- .slide: data-background="#ff0000" -->
# Red Background Slide

<!-- .slide: data-background-image="bg.jpg" -->
# Image Background

<!-- .slide: data-transition="zoom" -->
# Zoom Transition
```

Transitions: `none`, `fade`, `slide`, `convex`, `concave`, `zoom`

## Element Attributes

```md
Some text <!-- .element: class="fragment" style="color: red;" -->
```

## Math (if plugin loaded)

```md
$E = mc^2$

$$\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$$
```

## Keyboard Shortcuts

| Key       | Action                |
|-----------|-----------------------|
| →/↓/Space | Next slide            |
| ←/↑      | Previous slide        |
| S         | Speaker notes         |
| O / Esc   | Overview mode         |
| F         | Fullscreen            |
| B / .     | Blackout              |
