const localhost = Bun.env.LOCALHOST as string;

export const basePath =
  localhost === "true" ? "http://localhost:3001" : "https://shinyspells.com";
