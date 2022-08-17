export type MdGuardConfig = {
  strict: boolean;
  types: MdGuardType;
  meta: "frontmatter" | "export";
};

export type MdGuardType = {
  [k: string]: string | MdGuardType;
};
export type Meta = {
  [k: string]: Meta | string | number | boolean | null;
};
