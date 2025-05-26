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
         * EvaluationTree
         */
        export interface EvaluationTree {
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
            /**
             * Children
             */
            children?: /* EvaluationTree */ EvaluationTree[];
        }
        /**
         * EvaluationType
         */
        export type EvaluationType = "enum_choice" | "text" | "boolean";
        /**
         * FileContentRead
         */
        export interface FileContentRead {
            /**
             * File Id
             */
            file_id: string; // uuid
            /**
             * Content Number
             */
            content_number: number;
            /**
             * Content Metadata
             */
            content_metadata: {
                [name: string]: any;
            };
            /**
             * Content
             */
            content: string;
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
         * FileContentReadWithChunkScore
         */
        export interface FileContentReadWithChunkScore {
            /**
             * File Id
             */
            file_id: string; // uuid
            /**
             * Content Number
             */
            content_number: number;
            /**
             * Content Metadata
             */
            content_metadata: {
                [name: string]: any;
            };
            /**
             * Content
             */
            content: string;
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
            /**
             * Match Chunks
             */
            match_chunks?: /* Match Chunks */ /* FileEmbeddingRead */ FileEmbeddingRead[] | null;
            /**
             * Before Neighbors
             */
            before_neighbors?: /* Before Neighbors */ /* FileContentRead */ FileContentRead[] | null;
            /**
             * After Neighbors
             */
            after_neighbors?: /* After Neighbors */ /* FileContentRead */ FileContentRead[] | null;
        }
        /**
         * FileEmbeddingRead
         */
        export interface FileEmbeddingRead {
            /**
             * File Id
             */
            file_id: string; // uuid
            /**
             * Chunk Number
             */
            chunk_number: number;
            /**
             * Chunk Metadata
             */
            chunk_metadata: {
                [name: string]: any;
            };
            /**
             * Project Id
             */
            project_id: string; // uuid
            /**
             * Content Id
             */
            content_id: string; // uuid
            /**
             * Content
             */
            content: string;
            /**
             * Embedding
             */
            embedding: any;
            /**
             * Id
             */
            id: string; // uuid
            /**
             * Score
             */
            score?: /* Score */ number | null;
            /**
             * Before Neighbors
             */
            before_neighbors?: /* Before Neighbors */ /* FileEmbeddingRead */ FileEmbeddingRead[] | null;
            /**
             * After Neighbors
             */
            after_neighbors?: /* After Neighbors */ /* FileEmbeddingRead */ FileEmbeddingRead[] | null;
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
         * FileEvaluationReadWithEvaluation
         */
        export interface FileEvaluationReadWithEvaluation {
            /**
             * File Id
             */
            file_id: string; // uuid
            /**
             * Evaluation Id
             */
            evaluation_id: string; // uuid
            /**
             * Content Id
             */
            content_id: string; // uuid
            /**
             * Response
             */
            response: string;
            status?: /* FileEvaluationStatus */ FileEvaluationStatus;
            /**
             * Error
             */
            error?: /* Error */ string | null;
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
            evaluation: /* EvaluationRead */ EvaluationRead;
            content: /* FileContentRead */ FileContentRead;
        }
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
             * Content Id
             */
            content_id: string; // uuid
            /**
             * Response
             */
            response: string;
            status?: /* FileEvaluationStatus */ FileEvaluationStatus;
            /**
             * Error
             */
            error?: /* Error */ string | null;
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
            file: /* FileRead */ FileRead;
            evaluation: /* EvaluationRead */ EvaluationRead;
            content: /* FileContentRead */ FileContentRead;
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
         * FileReadWithEvaluations
         */
        export interface FileReadWithEvaluations {
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
            /**
             * Evaluations
             */
            evaluations: /* FileEvaluationReadWithEvaluation */ FileEvaluationReadWithEvaluation[];
        }
        /**
         * FileSearchEvaluation
         */
        export interface FileSearchEvaluation {
            /**
             * Evaluation Id
             */
            evaluation_id: string; // uuid
            /**
             * Response Value
             */
            response_value?: /* Response Value */ string | null;
        }
        /**
         * FileSearchEvaluationGroup
         */
        export interface FileSearchEvaluationGroup {
            /**
             * Operation
             */
            operation: "and" | "or";
            /**
             * Evaluations
             */
            evaluations: (/* FileSearchEvaluationOperation */ FileSearchEvaluationOperation | /* FileSearchEvaluationGroup */ FileSearchEvaluationGroup)[];
        }
        /**
         * FileSearchEvaluationOperation
         */
        export interface FileSearchEvaluationOperation {
            /**
             * Operation
             */
            operation: "eq" | "neq";
            value: /* FileSearchEvaluation */ FileSearchEvaluation;
        }
        /**
         * FileSearchRequest
         */
        export interface FileSearchRequest {
            /**
             * Search Query
             */
            search_query?: /* Search Query */ string | null;
            evaluations?: /* FileSearchEvaluationGroup */ FileSearchEvaluationGroup | null;
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
         * HttpEvaluationCreate
         */
        export interface HttpEvaluationCreate {
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
        }
        /**
         * HttpEvaluationUpdate
         */
        export interface HttpEvaluationUpdate {
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
        }
        /**
         * ProjectCreateRequest
         */
        export interface ProjectCreateRequest {
            /**
             * Name
             */
            name: string;
            /**
             * Description
             */
            description: string;
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
         * ProjectUpdateRequest
         */
        export interface ProjectUpdateRequest {
            /**
             * Name
             */
            name: string;
            /**
             * Description
             */
            description: string;
        }
        /**
         * SimilaritySearchOrderBy
         * Fields to order the results by.
         */
        export type SimilaritySearchOrderBy = "score" | "chunk";
        /**
         * SimilaritySearchRequest
         * Request for a similarity search.
         *
         * - query: The query to search for.
         * - limit: The maximum number of results to return.
         * - score_threshold: The minimum score to return a result.
         * - when_match_return: Identifies which type to return when a match is found.
         *     (default: chunk)
         * - before_neighbor_count: The number of neighbors to return before the match.
         *     (default: 0)
         * - after_neighbor_count: The number of neighbors to return after the match.
         *     (default: 0)
         * - order_by: The field to order the results by. (default: chunk)
         *
         * When the before and after neighbor counts are provided with a value greater than 0,
         * when a match is found, it will also return the chunk/content before
         * and after the match.
         */
        export interface SimilaritySearchRequest {
            /**
             * Query
             */
            query: string;
            /**
             * Limit
             */
            limit?: /* Limit */ number | null;
            /**
             * Score Threshold
             */
            score_threshold?: /* Score Threshold */ number | null;
            when_match_return?: /**
             * SimilaritySearchWhenMatchReturn
             * Identifies which type to return when a match is found.
             *
             * - CHUNK: The default behavior, return the chunk that was matched.
             * - CONTENT: Return the content related to the matched chunk.
             *
             * Example:
             * When a PDF is uploaded, the langchain loader returns a list of documents,
             * one for each page.
             *
             * The document is stored in the database as a FileContent record.
             * When a user searches for a given query, and the chunk is matched,
             * it will return the entire page.
             */
            SimilaritySearchWhenMatchReturn;
            /**
             * Before Neighbor Count
             */
            before_neighbor_count?: number;
            /**
             * After Neighbor Count
             */
            after_neighbor_count?: number;
            order_by?: /**
             * SimilaritySearchOrderBy
             * Fields to order the results by.
             */
            SimilaritySearchOrderBy;
            /**
             * File Ids
             */
            file_ids?: /* File Ids */ string /* uuid */[] | null;
        }
        /**
         * SimilaritySearchWhenMatchReturn
         * Identifies which type to return when a match is found.
         *
         * - CHUNK: The default behavior, return the chunk that was matched.
         * - CONTENT: Return the content related to the matched chunk.
         *
         * Example:
         * When a PDF is uploaded, the langchain loader returns a list of documents,
         * one for each page.
         *
         * The document is stored in the database as a FileContent record.
         * When a user searches for a given query, and the chunk is matched,
         * it will return the entire page.
         */
        export type SimilaritySearchWhenMatchReturn = "chunk" | "content";
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
            /**
             * Headers
             */
            headers: {
                [name: string]: string;
            };
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
    namespace CreateEvaluation {
        namespace Parameters {
            /**
             * Project Id
             */
            export type ProjectId = string; // uuid
        }
        export interface PathParameters {
            project_id: /* Project Id */ Parameters.ProjectId /* uuid */;
        }
        export type RequestBody = /* HttpEvaluationCreate */ Components.Schemas.HttpEvaluationCreate;
        namespace Responses {
            export type $200 = /* EvaluationRead */ Components.Schemas.EvaluationRead;
            export type $422 = /* HTTPValidationError */ Components.Schemas.HTTPValidationError;
        }
    }
    namespace CreateProject {
        export type RequestBody = /* ProjectCreateRequest */ Components.Schemas.ProjectCreateRequest;
        namespace Responses {
            export type $200 = /* ProjectRead */ Components.Schemas.ProjectRead;
            export type $422 = /* HTTPValidationError */ Components.Schemas.HTTPValidationError;
        }
    }
    namespace DeleteEvaluation {
        namespace Parameters {
            /**
             * Evaluation Id
             */
            export type EvaluationId = string; // uuid
            /**
             * Project Id
             */
            export type ProjectId = string; // uuid
        }
        export interface PathParameters {
            project_id: /* Project Id */ Parameters.ProjectId /* uuid */;
            evaluation_id: /* Evaluation Id */ Parameters.EvaluationId /* uuid */;
        }
        namespace Responses {
            export type $200 = any;
            export type $422 = /* HTTPValidationError */ Components.Schemas.HTTPValidationError;
        }
    }
    namespace DeleteFile {
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
            export type $200 = any;
            export type $422 = /* HTTPValidationError */ Components.Schemas.HTTPValidationError;
        }
    }
    namespace DeleteProject {
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
            export type $200 = any;
            export type $422 = /* HTTPValidationError */ Components.Schemas.HTTPValidationError;
        }
    }
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
    namespace GetEvaluationsTree {
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
             * Response Getevaluationstree
             */
            export type $200 = /* EvaluationTree */ Components.Schemas.EvaluationTree[];
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
    namespace GetFileEvaluations {
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
            /**
             * Response Getfileevaluations
             */
            export type $200 = /* FileEvaluationReadWithFile */ Components.Schemas.FileEvaluationReadWithFile[];
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
    namespace GetProject {
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
            export type $200 = /* ProjectRead */ Components.Schemas.ProjectRead;
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
    namespace SearchFiles {
        namespace Parameters {
            /**
             * Project Id
             */
            export type ProjectId = string; // uuid
        }
        export interface PathParameters {
            project_id: /* Project Id */ Parameters.ProjectId /* uuid */;
        }
        export type RequestBody = /* FileSearchRequest */ Components.Schemas.FileSearchRequest;
        namespace Responses {
            /**
             * Response Searchfiles
             */
            export type $200 = /* FileReadWithEvaluations */ Components.Schemas.FileReadWithEvaluations[];
            export type $422 = /* HTTPValidationError */ Components.Schemas.HTTPValidationError;
        }
    }
    namespace SimilaritySearch {
        namespace Parameters {
            /**
             * Project Id
             */
            export type ProjectId = string; // uuid
        }
        export interface PathParameters {
            project_id: /* Project Id */ Parameters.ProjectId /* uuid */;
        }
        export type RequestBody = /**
         * SimilaritySearchRequest
         * Request for a similarity search.
         *
         * - query: The query to search for.
         * - limit: The maximum number of results to return.
         * - score_threshold: The minimum score to return a result.
         * - when_match_return: Identifies which type to return when a match is found.
         *     (default: chunk)
         * - before_neighbor_count: The number of neighbors to return before the match.
         *     (default: 0)
         * - after_neighbor_count: The number of neighbors to return after the match.
         *     (default: 0)
         * - order_by: The field to order the results by. (default: chunk)
         *
         * When the before and after neighbor counts are provided with a value greater than 0,
         * when a match is found, it will also return the chunk/content before
         * and after the match.
         */
        Components.Schemas.SimilaritySearchRequest;
        namespace Responses {
            /**
             * Response Similaritysearch
             */
            export type $200 = /* Response Similaritysearch */ /* FileEmbeddingRead */ Components.Schemas.FileEmbeddingRead[] | /* FileContentReadWithChunkScore */ Components.Schemas.FileContentReadWithChunkScore[];
            export type $422 = /* HTTPValidationError */ Components.Schemas.HTTPValidationError;
        }
    }
    namespace UpdateEvaluation {
        namespace Parameters {
            /**
             * Evaluation Id
             */
            export type EvaluationId = string; // uuid
            /**
             * Project Id
             */
            export type ProjectId = string; // uuid
        }
        export interface PathParameters {
            project_id: /* Project Id */ Parameters.ProjectId /* uuid */;
            evaluation_id: /* Evaluation Id */ Parameters.EvaluationId /* uuid */;
        }
        export type RequestBody = /* HttpEvaluationUpdate */ Components.Schemas.HttpEvaluationUpdate;
        namespace Responses {
            export type $200 = /* EvaluationRead */ Components.Schemas.EvaluationRead;
            export type $422 = /* HTTPValidationError */ Components.Schemas.HTTPValidationError;
        }
    }
    namespace UpdateProject {
        namespace Parameters {
            /**
             * Project Id
             */
            export type ProjectId = string; // uuid
        }
        export interface PathParameters {
            project_id: /* Project Id */ Parameters.ProjectId /* uuid */;
        }
        export type RequestBody = /* ProjectUpdateRequest */ Components.Schemas.ProjectUpdateRequest;
        namespace Responses {
            export type $200 = /* ProjectRead */ Components.Schemas.ProjectRead;
            export type $422 = /* HTTPValidationError */ Components.Schemas.HTTPValidationError;
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
   * createProject - Create Project
   * 
   * Create a project
   */
  'createProject'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: Paths.CreateProject.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.CreateProject.Responses.$200>
  /**
   * getProject - Get Project
   * 
   * Get a project by id
   */
  'getProject'(
    parameters?: Parameters<Paths.GetProject.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetProject.Responses.$200>
  /**
   * updateProject - Update Project
   * 
   * Update a project by id
   */
  'updateProject'(
    parameters?: Parameters<Paths.UpdateProject.PathParameters> | null,
    data?: Paths.UpdateProject.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.UpdateProject.Responses.$200>
  /**
   * deleteProject - Delete Project
   * 
   * Delete a project by id
   */
  'deleteProject'(
    parameters?: Parameters<Paths.DeleteProject.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.DeleteProject.Responses.$200>
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
   * searchFiles - Search Files
   * 
   * Search files for a project
   */
  'searchFiles'(
    parameters?: Parameters<Paths.SearchFiles.PathParameters> | null,
    data?: Paths.SearchFiles.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.SearchFiles.Responses.$200>
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
   * deleteFile - Delete File
   * 
   * Delete a file by project and file id
   */
  'deleteFile'(
    parameters?: Parameters<Paths.DeleteFile.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.DeleteFile.Responses.$200>
  /**
   * getFileEvaluations - Get File Evaluations
   * 
   * Get all evaluations for a file
   */
  'getFileEvaluations'(
    parameters?: Parameters<Paths.GetFileEvaluations.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetFileEvaluations.Responses.$200>
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
   * createEvaluation - Create Evaluation
   * 
   * Create an evaluation for a project
   */
  'createEvaluation'(
    parameters?: Parameters<Paths.CreateEvaluation.PathParameters> | null,
    data?: Paths.CreateEvaluation.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.CreateEvaluation.Responses.$200>
  /**
   * getEvaluationsTree - Get Evaluations Tree
   * 
   * Get all evaluations for a project
   */
  'getEvaluationsTree'(
    parameters?: Parameters<Paths.GetEvaluationsTree.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetEvaluationsTree.Responses.$200>
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
  /**
   * updateEvaluation - Update Evaluation
   * 
   * Update an evaluation for a project
   */
  'updateEvaluation'(
    parameters?: Parameters<Paths.UpdateEvaluation.PathParameters> | null,
    data?: Paths.UpdateEvaluation.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.UpdateEvaluation.Responses.$200>
  /**
   * deleteEvaluation - Delete Evaluation
   * 
   * Delete an evaluation by project and evaluation id
   */
  'deleteEvaluation'(
    parameters?: Parameters<Paths.DeleteEvaluation.PathParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.DeleteEvaluation.Responses.$200>
  /**
   * similaritySearch - Similarity Search
   * 
   * Perform a similarity search
   */
  'similaritySearch'(
    parameters?: Parameters<Paths.SimilaritySearch.PathParameters> | null,
    data?: Paths.SimilaritySearch.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.SimilaritySearch.Responses.$200>
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
    /**
     * createProject - Create Project
     * 
     * Create a project
     */
    'post'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: Paths.CreateProject.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.CreateProject.Responses.$200>
  }
  ['/projects/{project_id}']: {
    /**
     * getProject - Get Project
     * 
     * Get a project by id
     */
    'get'(
      parameters?: Parameters<Paths.GetProject.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetProject.Responses.$200>
    /**
     * updateProject - Update Project
     * 
     * Update a project by id
     */
    'put'(
      parameters?: Parameters<Paths.UpdateProject.PathParameters> | null,
      data?: Paths.UpdateProject.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.UpdateProject.Responses.$200>
    /**
     * deleteProject - Delete Project
     * 
     * Delete a project by id
     */
    'delete'(
      parameters?: Parameters<Paths.DeleteProject.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.DeleteProject.Responses.$200>
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
  ['/projects/{project_id}/files/search']: {
    /**
     * searchFiles - Search Files
     * 
     * Search files for a project
     */
    'post'(
      parameters?: Parameters<Paths.SearchFiles.PathParameters> | null,
      data?: Paths.SearchFiles.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.SearchFiles.Responses.$200>
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
    /**
     * deleteFile - Delete File
     * 
     * Delete a file by project and file id
     */
    'delete'(
      parameters?: Parameters<Paths.DeleteFile.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.DeleteFile.Responses.$200>
  }
  ['/projects/{project_id}/file/{file_id}/evaluations']: {
    /**
     * getFileEvaluations - Get File Evaluations
     * 
     * Get all evaluations for a file
     */
    'get'(
      parameters?: Parameters<Paths.GetFileEvaluations.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetFileEvaluations.Responses.$200>
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
    /**
     * createEvaluation - Create Evaluation
     * 
     * Create an evaluation for a project
     */
    'post'(
      parameters?: Parameters<Paths.CreateEvaluation.PathParameters> | null,
      data?: Paths.CreateEvaluation.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.CreateEvaluation.Responses.$200>
  }
  ['/projects/{project_id}/evaluations/tree']: {
    /**
     * getEvaluationsTree - Get Evaluations Tree
     * 
     * Get all evaluations for a project
     */
    'get'(
      parameters?: Parameters<Paths.GetEvaluationsTree.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetEvaluationsTree.Responses.$200>
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
  ['/projects/{project_id}/evaluations/{evaluation_id}']: {
    /**
     * updateEvaluation - Update Evaluation
     * 
     * Update an evaluation for a project
     */
    'put'(
      parameters?: Parameters<Paths.UpdateEvaluation.PathParameters> | null,
      data?: Paths.UpdateEvaluation.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.UpdateEvaluation.Responses.$200>
    /**
     * deleteEvaluation - Delete Evaluation
     * 
     * Delete an evaluation by project and evaluation id
     */
    'delete'(
      parameters?: Parameters<Paths.DeleteEvaluation.PathParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.DeleteEvaluation.Responses.$200>
  }
  ['/projects/{project_id}/similarity-search']: {
    /**
     * similaritySearch - Similarity Search
     * 
     * Perform a similarity search
     */
    'post'(
      parameters?: Parameters<Paths.SimilaritySearch.PathParameters> | null,
      data?: Paths.SimilaritySearch.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.SimilaritySearch.Responses.$200>
  }
}

export type Client = OpenAPIClient<OperationMethods, PathsDictionary>


export type EvaluationRead = Components.Schemas.EvaluationRead;
export type EvaluationTree = Components.Schemas.EvaluationTree;
export type EvaluationType = Components.Schemas.EvaluationType;
export type FileContentRead = Components.Schemas.FileContentRead;
export type FileContentReadWithChunkScore = Components.Schemas.FileContentReadWithChunkScore;
export type FileEmbeddingRead = Components.Schemas.FileEmbeddingRead;
export type FileEvaluationReadWithEvaluation = Components.Schemas.FileEvaluationReadWithEvaluation;
export type FileEvaluationReadWithFile = Components.Schemas.FileEvaluationReadWithFile;
export type FileEvaluationStatus = Components.Schemas.FileEvaluationStatus;
export type FileRead = Components.Schemas.FileRead;
export type FileReadWithEvaluations = Components.Schemas.FileReadWithEvaluations;
export type FileSearchEvaluation = Components.Schemas.FileSearchEvaluation;
export type FileSearchEvaluationGroup = Components.Schemas.FileSearchEvaluationGroup;
export type FileSearchEvaluationOperation = Components.Schemas.FileSearchEvaluationOperation;
export type FileSearchRequest = Components.Schemas.FileSearchRequest;
export type FileStatus = Components.Schemas.FileStatus;
export type HTTPValidationError = Components.Schemas.HTTPValidationError;
export type HttpEvaluationCreate = Components.Schemas.HttpEvaluationCreate;
export type HttpEvaluationUpdate = Components.Schemas.HttpEvaluationUpdate;
export type ProjectCreateRequest = Components.Schemas.ProjectCreateRequest;
export type ProjectRead = Components.Schemas.ProjectRead;
export type ProjectUpdateRequest = Components.Schemas.ProjectUpdateRequest;
export type SimilaritySearchOrderBy = Components.Schemas.SimilaritySearchOrderBy;
export type SimilaritySearchRequest = Components.Schemas.SimilaritySearchRequest;
export type SimilaritySearchWhenMatchReturn = Components.Schemas.SimilaritySearchWhenMatchReturn;
export type UploadIntentRequest = Components.Schemas.UploadIntentRequest;
export type UploadIntentResponse = Components.Schemas.UploadIntentResponse;
export type ValidationError = Components.Schemas.ValidationError;
