export interface UpdateYamlExecutorSchema {
  filePath: string;
  keyPath: string;
  gitAdd: boolean;
  valuePrefix?: string;
  value: string;
}
