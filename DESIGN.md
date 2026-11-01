# Nexto — Design System "Mobilidade Vibrante"

> Sinalização urbana: lime de alto contraste sobre grafite, linhas como placas coloridas.

Substitui o perfil Calendly usado até a v1. Tokens em `client/src/theme.css` (mapeamento Tailwind)
e `client/src/index.css` (valores `--nx-*` para claro e escuro, seguindo `prefers-color-scheme`).

## Princípios

1. **A linha é a protagonista.** O código de cada linha aparece como uma placa colorida (`LinePlate`).
2. **Uma cor de assinatura.** Lime `#c6f432` marca ação principal, estado ativo e a rota no mapa. Nunca como texto sobre fundo claro.
3. **Contraste de sinalização.** Grafite + lime, bordas visíveis, sem sombras pesadas.
4. **Claro e escuro de primeira classe.** Todo componente usa tokens semânticos; nada de hex fixo em JSX.
5. **Sem ruído técnico.** Linguagem de usuário ("Perto de mim", "Recentes"), não de telemetria.

## Cores (tokens semânticos)

| Token Tailwind | Claro | Escuro | Uso |
|---|---|---|---|
| `canvas` | `#f6f7f2` | `#0e1116` | Fundo da página |
| `surface` | `#ffffff` | `#161a21` | Cards, header, sheets |
| `surface-2` / `surface-3` | `#eef0e8` / `#e3e6da` | `#1d222b` / `#262c37` | Preenchimentos, hover, skeleton |
| `line` / `line-strong` | `#dcdfd4` / `#c2c6b8` | `#2a303b` / `#3b4351` | Bordas (hover usa `line-strong`) |
| `ink` / `muted` / `faint` | `#0e1116` / `#5a6170` / `#8c929e` | `#f1f3ec` / `#9ba3b1` / `#6b7382` | Texto primário, secundário, terciário |
| `brand` / `brand-strong` / `brand-soft` | `#c6f432` / `#b2df1c` / `#eef9c8` | `#c6f432` / `#d6fb63` / `#232c0f` | Ação primária, ativo, destaque |
| `on-brand` | `#0e1116` | `#0e1116` | Texto/ícone sobre `brand` |
| `accent` | `#457200` | `#c6f432` | Texto/ícone interativo (versão legível do lime) |
| `signal` / `info` | `#f0582a` / `#2f6fe8` | `#ff7a50` / `#6ea0ff` | Apoio (alertas de chegada, localização do usuário) |
| `success` / `warn` / `danger` (+ `-soft`) | — | — | Estados |
| `scrim` | 55% preto | 65% preto | Fundo de modais |

Placas de linha: cor oficial (`bgColor`/`fgColor`) quando a fonte informa; senão, cor estável da paleta
`lime, laranja, azul, violeta, verde-água, âmbar, rosa, grafite` derivada do código (`utils/lineColor.js`),
com texto claro/escuro por luminância WCAG.

Mapa: cores fixas (`MAP_COLORS` em `MapView.jsx`) — rota lime com contorno grafite, ônibus como placa grafite
com borda lime quando há GPS ao vivo, usuário em azul. Tiles OSM; no escuro os tiles são invertidos via CSS.

## Tipografia

- **Display:** Space Grotesk (variável) — `h1–h3`, placas, números de destaque. `letter-spacing: -0.015em`.
- **Texto/UI:** Inter (variável).
- Fontes empacotadas via `@fontsource-variable/*` (funcionam offline no app).

## Forma

- Cards e linhas: raio **20px**, borda 1px `line`, sem sombra; hover troca a borda para `line-strong`.
- Controles (pills, chips, botões de topo): **raio cheio**, altura 40px.
- Hero e sheets: raio 28px. Placas: 8/12/14px (sm/md/lg).
- Toque mínimo 40×40px.

## Componentes-chave

- `Logo` / `LogoMark` — placa lime com um "N" desenhado como trajeto entre duas paradas.
- `LinePlate` — código da linha na cor da linha.
- `LineCard` — placa + nome (display) + destino + favorito.
- `FilterPills` — ativo em `brand`, inativo em `surface` com borda.
- `BottomNav` (mobile) — Linhas · Perto · Favoritos · Cidade; ativo com pílula lime.
- `EmptyState`, `Skeleton*` — usam apenas tokens.

## Layout

- **Mobile:** header (logo, cidade, busca) + conteúdo + navegação inferior fixa com safe area.
- **Desktop:** atalhos "Perto de mim" e "Favoritos" no header; grade de 2–3 colunas.
- Home: hero escuro com a cidade → Recentes (placas) → filtros → todas as linhas.
