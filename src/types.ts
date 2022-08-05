export type Config = {
  strict: boolean;
  types: Type[];
};

export type Type = {
  [k: string]: string | Type;
};

export type ConfigModule = {
  default: Config;
};
