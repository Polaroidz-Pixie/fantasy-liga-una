# Fantasy Liga UNA

Fantasy entre amigos para a Liga UNA Seguros (1.ª divisão de voleibol masculino, Portugal).

Fase atual: **jogo de teste da época 2025/26**. Cada pessoa monta uma equipa de 7 jogadores
(1 distribuidor, 1 oposto, 2 zonas 4, 2 centrais, 1 líbero) com 60 M, vê os pontos de toda a época
e pode pôr a equipa no ranking.

## Estrutura

Site estático, sem build:

- `index.html`, `styles.css`, `app.js`: a página.
- `config.js`: só o URL do projeto Supabase e a chave **publishable**.
- `vendor/supabase.js`: cliente `@supabase/supabase-js` (UMD, v2.119.0), servido localmente.
- `fonts/`: Barlow Condensed e IBM Plex Sans (via @fontsource, licença OFL).
- `vercel.json`: cabeçalhos de segurança; a CSP só permite ligações ao projeto Supabase.
- `icons/` e `manifest.webmanifest`: emblema da marca (bola laranja com estrela azul), favicon e ícones para instalar no telemóvel.

## Base de dados

Tudo vive no schema `fantasy` do projeto Supabase. O cliente usa
`createClient(URL, KEY, { db: { schema: 'fantasy' } })`.

- Leitura pública: `fantasy.epocas`, `fantasy.jogadores`, `fantasy.equipas`.
- Os pontos dos jogadores (`fantasy.pontos_jogador`) não são públicos: só as funções os leem.
- Funções públicas: `fantasy.pontuar_equipa` (pontos de uma equipa válida) e
  `fantasy.guardar_equipa` (única escrita pública, com validação e limites).
- A administração (dados, resultados, pontuações) faz-se por SQL ou pelo conector, nunca pelo site.
  A chave `service_role`/secret nunca entra neste repositório.

## Publicação

Vercel, sem framework (preset "Other"), sem comando de build e sem variáveis de ambiente.
