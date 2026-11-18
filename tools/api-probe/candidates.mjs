/**
 * Endpoints candidatos por feature del proyecto (modo `discover`).
 * Basados en la API de Game Data de WoW (retail/classic); su existencia en Forever es lo que
 * se quiere averiguar. `ns`: static | dynamic. `follow`: pedir también el detalle del primer
 * elemento del índice. Variables: {recipeId}, {itemId}, {professionId} (se toman del catálogo).
 */
export const NAMESPACES = ["static", "dynamic"];

export const CANDIDATES = [
  // Clases, especializaciones y talentos
  {
    feature: "clases y talentos",
    ns: "static",
    path: "/data/wow/playable-class/index",
    follow: true,
  },
  {
    feature: "clases y talentos",
    ns: "static",
    path: "/data/wow/playable-specialization/index",
    follow: true,
  },
  {
    feature: "clases y talentos",
    ns: "static",
    path: "/data/wow/playable-race/index",
    follow: true,
  },
  { feature: "clases y talentos", ns: "static", path: "/data/wow/power-type/index", follow: true },
  { feature: "clases y talentos", ns: "static", path: "/data/wow/talent-tree/index", follow: true },
  { feature: "clases y talentos", ns: "static", path: "/data/wow/talent/index", follow: true },
  { feature: "clases y talentos", ns: "static", path: "/data/wow/pvp-talent/index", follow: true },
  { feature: "clases y talentos", ns: "static", path: "/data/wow/spell/{recipeId}" },

  // BiS: de dónde sale cada ítem (instancias, jefes, criaturas, misiones, reputación)
  {
    feature: "BiS y fuentes",
    ns: "static",
    path: "/data/wow/journal-expansion/index",
    follow: true,
  },
  {
    feature: "BiS y fuentes",
    ns: "static",
    path: "/data/wow/journal-instance/index",
    follow: true,
  },
  {
    feature: "BiS y fuentes",
    ns: "static",
    path: "/data/wow/journal-encounter/index",
    follow: true,
  },
  { feature: "BiS y fuentes", ns: "static", path: "/data/wow/creature-family/index", follow: true },
  { feature: "BiS y fuentes", ns: "static", path: "/data/wow/creature-type/index", follow: true },
  { feature: "BiS y fuentes", ns: "static", path: "/data/wow/item-set/index", follow: true },
  { feature: "BiS y fuentes", ns: "static", path: "/data/wow/item-class/index", follow: true },
  { feature: "BiS y fuentes", ns: "static", path: "/data/wow/item/{itemId}" },
  { feature: "BiS y fuentes", ns: "static", path: "/data/wow/quest/index", follow: true },
  { feature: "BiS y fuentes", ns: "static", path: "/data/wow/quest-category/index", follow: true },
  { feature: "BiS y fuentes", ns: "static", path: "/data/wow/quest-area/index", follow: true },
  {
    feature: "BiS y fuentes",
    ns: "static",
    path: "/data/wow/reputation-faction/index",
    follow: true,
  },
  {
    feature: "BiS y fuentes",
    ns: "static",
    path: "/data/wow/reputation-tiers/index",
    follow: true,
  },

  // Patterns, entrenadores y vendedores (hueco R-18)
  {
    feature: "patterns y vendedores",
    ns: "static",
    path: "/data/wow/search/creature?name.en_US=Trainer&orderby=id",
  },
  {
    feature: "patterns y vendedores",
    ns: "static",
    path: "/data/wow/search/spell?name.en_US=Bolt&orderby=id",
  },
  {
    feature: "patterns y vendedores",
    ns: "static",
    path: "/data/wow/search/recipe?name.en_US=Bolt&orderby=id",
  },
  {
    feature: "patterns y vendedores",
    ns: "static",
    path: "/data/wow/search/item?name.en_US=Pattern&orderby=id",
  },
  {
    feature: "patterns y vendedores",
    ns: "static",
    path: "/data/wow/search/journal-encounter?orderby=id",
  },

  // Armory: iconos y medios
  { feature: "armory (medios)", ns: "static", path: "/data/wow/media/item/{itemId}" },
  { feature: "armory (medios)", ns: "static", path: "/data/wow/media/profession/{professionId}" },
  { feature: "armory (medios)", ns: "static", path: "/data/wow/media/spell/{recipeId}" },

  // Otros índices útiles
  { feature: "otros", ns: "static", path: "/data/wow/region/index", follow: true },
  { feature: "otros", ns: "static", path: "/data/wow/connected-realm/index", follow: true },
  { feature: "otros", ns: "static", path: "/data/wow/title/index", follow: true },
  { feature: "otros", ns: "static", path: "/data/wow/pvp-season/index", follow: true },
  { feature: "otros", ns: "dynamic", path: "/data/wow/token/index" },
  { feature: "otros", ns: "dynamic", path: "/data/wow/pvp-season/index", follow: true },
  { feature: "otros", ns: "dynamic", path: "/data/wow/connected-realm/index", follow: true },
];
