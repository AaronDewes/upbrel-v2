export type UmbrelApp = {
  manifestVersion: 1;
  id: string;
  category: string;
  name: string;
  version: string;
  tagline: string;
  description: string;
  website: string;
  dependencies: string[];
  repo: string;
  support: string;
  port: number;
  gallery: string[];
  path: string;
  deterministicPassword: boolean;
  defaultUsername: string;
  torOnly: boolean;
}
