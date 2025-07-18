export interface NestBuildExecutorSchema {
  external?: string[];
  thirdParty?: boolean;
  generatePackageJson?: boolean;
  format?: Array<'esm' | 'cjs'>;
  main: string;
  outputPath: string;
  tsConfig: string;
}
