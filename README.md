# A ROSA — arosa.net.br

Home da ROSA: um site estático (HTML, CSS e JS, sem build) que leva aos projetos do grupo.

- **Rosa 3D**: `js/rosa3d.js`, feita com Three.js (carregado do jsDelivr).
- **Fonte Rosa Brava**: desenhada por código em `tools/fonte/gerar.py`. Para gerar de novo, rode `pip install fonttools skia-pathops brotli` e depois `python tools/fonte/gerar.py`.
- **Ícones e imagem de compartilhamento**: com o servidor local ligado, `sh tools/gerar-imagens.sh` gera os PNGs com o Edge.

## Rodar localmente

    python -m http.server 4000

Depois abra http://localhost:4000.

## Publicação

A Hostinger puxa a branch `main` deste repositório e serve os arquivos na raiz de arosa.net.br.
Para adicionar um projeto, crie um card novo na seção `#projetos` do `index.html`.
