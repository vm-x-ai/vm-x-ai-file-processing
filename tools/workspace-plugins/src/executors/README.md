# Project Config Example

nest-cli.json

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "builder": "swc"
  }
}
```

project.json

```json
{
  "name": "api",
  "targets": {
    "build": {
      "executor": "@dm/workspace-plugins:nest-build",
      "options": {
        "main": "src/main.ts",
        "outputPath": "{projectRoot}/dist",
        "tsConfig": "{projectRoot}/tsconfig.app.json"
      }
    },
    "serve": {
      "continuous": true,
      "executor": "nx:run-commands",
      "options": {
        "command": "npx nest start",
        "cwd": "{projectRoot}"
      }
    }
  }
}
```
