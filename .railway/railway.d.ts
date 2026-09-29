declare module "railway/iac" {
  export interface ServiceConfig {
    start?: string;
    region?: string;
    builder?: string;
    [key: string]: any;
  }

  export interface ProjectConfig {
    resources?: any[];
    [key: string]: any;
  }

  export function service(name: string, config: ServiceConfig): any;
  export function project(name: string, config: ProjectConfig): any;
  export function defineRailway(fn: () => any): any;
}
