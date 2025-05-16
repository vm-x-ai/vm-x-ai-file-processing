import type {
  OpenAPIClient,
  Parameters,
  UnknownParamsObject,
  OperationResponse,
  AxiosRequestConfig,
} from 'openapi-client-axios';

declare namespace Components {
    namespace Schemas {
        /**
         * EvaluationRead
         */
        export interface EvaluationRead {
            /**
             * Title
             */
            title: string;
            /**
             * Description
             */
            description: string;
            /**
             * System Prompt
             */
            system_prompt: /* System Prompt */ string | null;
            /**
             * Prompt
             */
            prompt: string;
            /**
             * Project Id
             */
            project_id: string; // uuid
            evaluation_type: /* EvaluationType */ EvaluationType;
            /**
             * Evaluation Options
             */
            evaluation_options: /* Evaluation Options */ string[] | null;
            /**
             * Parent Evaluation Id
             */
            parent_evaluation_id: /* Parent Evaluation Id */ string /* uuid */ | null;
            /**
             * Parent Evaluation Option
             */
            parent_evaluation_option: /* Parent Evaluation Option */ string | null;
            /**
             * Id
             */
            id: string; // uuid
            /**
             * Created At
             */
            created_at: string; // date-time
            /**
             * Updated At
             */
            updated_at: string; // date-time
        }
        /**
         * EvaluationType
         */
        export type EvaluationType = "enum_choice" | "text" | "boolean";
        /**
         * FileEvaluationReadWithFile
         */
        export interface FileEvaluationReadWithFile {
            /**
             * File Id
             */
            file_id: string; // uuid
            /**
             * Evaluation Id
             */
            evaluation_id: string; // uuid
            /**
             * Response
             */
            response: string;
            /**
             * Context Metadata
             */
            context_metadata: {
                [name: string]: any;
            };
            status?: /* FileEvaluationStatus */ FileEvaluationStatus;
            /**
             * Error
             */
            error?: /* Error */ string | null;
            /**
             * Created At
             */
            created_at: string; // date-time
            /**
             * Updated At
             */
            updated_at: string; // date-time
            file: /* FileRead */ FileRead;
            evaluation: /* EvaluationRead */ EvaluationRead;
        }
        /**
         * FileEvaluationStatus
         */
        export type FileEvaluationStatus = "pending" | "processing" | "completed" | "failed";
        /**
         * FileRead
         */
        export interface FileRead {
            /**
             * Name
             */
            name: string;
            /**
             * Type
             */
            type: string;
            /**
             * Size
             */
            size: number;
            /**
             * Url
             */
            url: string;
            status?: /* FileStatus */ FileStatus;
            /**
             * Error
             */
            error?: /* Error */ string | null;
            /**
             * Project Id
             */
            project_id: string; // uuid
            /**
             * Thumbnail Url
             */
            thumbnail_url?: /* Thumbnail Url */ string | null;
            /**
             * Id
             */
            id: string; // uuid
            /**
             * Created At
             */
            created_at: string; // date-time
            /**
             * Updated At
             */
            updated_at: string; // date-time
        }
        /**
         * FileStatus
         */
        export type FileStatus = "pending" | "chunking" | "chunked" | "embedding" | "embedded" | "evaluating" | "evaluated" | "completed" | "failed";
        /**
         * HTTPValidationError
         */
        export interface HTTPValidationError {
            /**
             * Detail
             */
            detail?: /* ValidationError */ ValidationError[];
        }
        /**
         * ProjectRead
         */
        export interface ProjectRead {
            /**
             * Name
             */
            name: string;
            /**
             * Description
             */
            description: string;
            /**
             * Id
             */
            id: string; // uuid
            /**
             * Created At
             */
            created_at: string; // date-time
            /**
             * Updated At
             */
            updated_at: string; // date-time
        }
        /**
         * UploadIntentRequest
         */
        export interface UploadIntentRequest {
            /**
             * File Name
             */
            file_name: string;
            /**
             * File Size
             */
            file_size: number;
        }
        /**
         * UploadIntentResponse
         */
        export interface UploadIntentResponse {
            /**
             * Upload Url
             */
            upload_url: string;
            file: /* FileRead */ FileRead;
        }
        /**
         * ValidationError
         */
        export interface ValidationError {
            /**
             * Location
             */
            loc: (string | number)[];
            /**
             * Message
             */
            msg: string;
            /**
             * Error Type
             */
            type: string;
        }
    }
}
declare namespace Paths {
    namespace GetEvaluations {
        namespace Parameters {
            /**
             * Project Id
             */
            export type ProjectId = string; // uuid
        }
        export interface PathParameters {
            project_id: /* Project Id */ Parameters.ProjectId /* uuid */;
        }
        namespace Responses {
            /**
             * Response Getevaluations
             */
            export type $200 = /* EvaluationRead */ Components.Schemas.EvaluationRead[];
            export type $422 = /* HTTPValidationError */ Components.Schemas.HTTPValidationError;
        }
    }
    namespace GetFile {
        namespace Parameters {
            /**
             * File Id
             */
            export type FileId = string; // uuid
            /**
             * Project Id
             */
            export type ProjectId = string; // uuid
        }
        export interface PathParameters {
            project_id: /* Project Id */ Parameters.ProjectId /* uuid */;
            file_id: /* File Id */ Parameters.FileId /* uuid */;
        }
        namespace Responses {
            export type $200 = /* FileRead */ Components.Schemas.FileRead;
            export type $422 = /* HTTPValidationError */ Components.Schemas.HTTPValidationError;
        }
    }
    namespace GetFiles {
        namespace Parameters {
            /**
             * Project Id
             */
            export type ProjectId = string; // uuid
        }
        export interface PathParameters {
            project_id: /* Project Id */ Parameters.ProjectId /* uuid */;
        }
        namespace Responses {
            /**
             * Response Getfiles
             */
            export type $200 = /* FileRead */ Components.Schemas.FileRead[];
            export type $422 = /* HTTPValidationError */ Components.Schemas.HTTPValidationError;
        }
    }
    namespace GetFilesByEvaluation {
        namespace Parameters {
            /**
             * Evaluation Id
             */
            export type EvaluationId = string; // uuid
            /**
             * Option Value
             */
            export type OptionValue = /* Option Value */ string | null;
            /**
             * Project Id
             */
            export type ProjectId = string; // uuid
        }
        export interface PathParameters {
            project_id: /* Project Id */ Parameters.ProjectId /* uuid */;
            evaluation_id: /* Evaluation Id */ Parameters.EvaluationId /* uuid */;
        }
        export interface QueryParameters {
            option_value?: /* Option Value */ Parameters.OptionValue;
        }
        namespace Responses {
            /**
             * Response Getfilesbyevaluation
             */
            export type $200 = /* FileEvaluationReadWithFile */ Components.Schemas.FileEvaluationReadWithFile[];
            export type $422 = /* HTTPValidationError */ Components.Schemas.HTTPValidationError;
        }
    }
    namespace GetProjects {
        namespace Responses {
            /**
             * Response Getprojects
             */
            export type $200 = /* ProjectRead */ Components.Schemas.ProjectRead[];
        }
    }
    namespace UploadIntent {
        namespace Parameters {
            /**
             * Project Id
             */
            export type ProjectId = string; // uuid
        }
        export interface PathParameters {
            project_id: /* Project Id */ Parameters.ProjectId /* uuid */;
        }
        export type RequestBody = /* UploadIntentRequest */ Components.Schemas.UploadIntentRequest;
        namespace Responses {
            export type $200 = /* UploadIntentResponse */ Components.Schemas.UploadIntentResponse;
            export type $422 = /* HTTPValidationError */ Components.Schemas.HTTPValidationError;
        }
    }
}


export interface OperationMethods {
  /**
   * getProjects - Get Projects
   * 
   * Get all projects
   */
  'getProjects'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetProjects.Responses.$200>
  /**
   * uploadIntent - Upload Intent
   * 
   * Upload an intent for a project
   */
  'uploadIntent'(
    parameters?: Parameters<Paths.UploadIntent.PathParameters> | null,
    data?: Paths.UploadIntent.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.UploadIntent.Responses.$200>
  /**
   * getFile - Get File
   * 
   * Get a file by project and file id
   */
  'getFile'(
    parameters?: Parameters<Paths.GetFile.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetFile.Responses.$200>
  /**
   * getEvaluations - Get Evaluations
   * 
   * Get all evaluations for a project
   */
  'getEvaluations'(
    parameters?: Parameters<Paths.GetEvaluations.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetEvaluations.Responses.$200>
  /**
   * getFiles - Get Files
   * 
   * Get all files for a project
   */
  'getFiles'(
    parameters?: Parameters<Paths.GetFiles.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetFiles.Responses.$200>
  /**
   * getFilesByEvaluation - Get Files By Evaluation
   * 
   * Get all files for an evaluation
   */
  'getFilesByEvaluation'(
    parameters?: Parameters<Paths.GetFilesByEvaluation.QueryParameters & Paths.GetFilesByEvaluation.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetFilesByEvaluation.Responses.$200>
}

export interface PathsDictionary {
  ['/projects']: {
    /**
     * getProjects - Get Projects
     * 
     * Get all projects
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetProjects.Responses.$200>
  }
  ['/projects/{project_id}/upload-intent']: {
    /**
     * uploadIntent - Upload Intent
     * 
     * Upload an intent for a project
     */
    'post'(
      parameters?: Parameters<Paths.UploadIntent.PathParameters> | null,
      data?: Paths.UploadIntent.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.UploadIntent.Responses.$200>
  }
  ['/projects/{project_id}/file/{file_id}']: {
    /**
     * getFile - Get File
     * 
     * Get a file by project and file id
     */
    'get'(
      parameters?: Parameters<Paths.GetFile.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetFile.Responses.$200>
  }
  ['/projects/{project_id}/evaluations']: {
    /**
     * getEvaluations - Get Evaluations
     * 
     * Get all evaluations for a project
     */
    'get'(
      parameters?: Parameters<Paths.GetEvaluations.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetEvaluations.Responses.$200>
  }
  ['/projects/{project_id}/files']: {
    /**
     * getFiles - Get Files
     * 
     * Get all files for a project
     */
    'get'(
      parameters?: Parameters<Paths.GetFiles.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetFiles.Responses.$200>
  }
  ['/projects/{project_id}/evaluation/{evaluation_id}/files']: {
    /**
     * getFilesByEvaluation - Get Files By Evaluation
     * 
     * Get all files for an evaluation
     */
    'get'(
      parameters?: Parameters<Paths.GetFilesByEvaluation.QueryParameters & Paths.GetFilesByEvaluation.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetFilesByEvaluation.Responses.$200>
  }
}

export type Client = OpenAPIClient<OperationMethods, PathsDictionary>


export type EvaluationRead = Components.Schemas.EvaluationRead;
export type EvaluationType = Components.Schemas.EvaluationType;
export type FileEvaluationReadWithFile = Components.Schemas.FileEvaluationReadWithFile;
export type FileEvaluationStatus = Components.Schemas.FileEvaluationStatus;
export type FileRead = Components.Schemas.FileRead;
export type FileStatus = Components.Schemas.FileStatus;
export type HTTPValidationError = Components.Schemas.HTTPValidationError;
export type ProjectRead = Components.Schemas.ProjectRead;
export type UploadIntentRequest = Components.Schemas.UploadIntentRequest;
export type UploadIntentResponse = Components.Schemas.UploadIntentResponse;
export type ValidationError = Components.Schemas.ValidationError;
