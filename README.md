# villin.lol

This repo is set up so each project lives in its own folder:

- `yugioh/` -> `villin.lol/yugioh`
- `bf/` -> `villin.lol/bf`
- `gs/` -> `villin.lol/gs`

## Folder layout

```text
/
  index.html
  CNAME
  .nojekyll
  yugioh/
  bf/
  gs/
```

## GitHub setup

1. Create a new GitHub repo.
2. Upload everything from this folder to that repo.
3. In GitHub, open `Settings -> Pages`.
4. Set the source to `Deploy from a branch`.
5. Choose branch `main` and folder `/ (root)`.
6. In your domain DNS, point `villin.lol` to GitHub Pages.
7. Keep the `CNAME` file in the repo root so GitHub knows the custom domain is `villin.lol`.

## What this gives you

- `https://villin.lol/`
- `https://villin.lol/yugioh/`
- `https://villin.lol/bf/`
- `https://villin.lol/gs/`
