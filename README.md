# villin.lol

This repo is set up so each project lives inside the `v/` folder:

- `v/yugioh/` -> `villin.lol/v/yugioh`
- `v/bf/` -> `villin.lol/v/bf`
- `v/gs/` -> `villin.lol/v/gs`

## Folder layout

```text
/  
  index.html
  CNAME
  .nojekyll
  v/
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
- `https://villin.lol/v/yugioh/`
- `https://villin.lol/v/bf/`
- `https://villin.lol/v/gs/`
