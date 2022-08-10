export type MdGuardConfig = {
  strict: boolean;
  types: MdGuardType;
};

export type MdGuardType = {
  [k: string]: string | MdGuardType;
};
export type Meta = {
  [k: string]: Meta | string | number | boolean | null;
};
