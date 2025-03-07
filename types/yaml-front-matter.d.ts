declare module "yaml-front-matter" {
  interface YamlFrontMatter {
    __content: string;
    [key: string]: any;
  }

  export function loadFront(content: string): YamlFrontMatter;
}
