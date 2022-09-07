export type MdShieldConfig = {
  strict: boolean;
  types: MdShieldType;
  meta: "frontmatter" | "export";
};

export type MdShieldType = {
  [k: string]: string | MdShieldType;
};
export type Meta = {
  [k: string]: Meta | string | number | boolean | null;
};
