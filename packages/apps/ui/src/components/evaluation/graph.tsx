'use client';

import {
  ReactFlow,
  Background,
  useReactFlow,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  NodeProps,
  Position,
  Handle,
} from '@xyflow/react';
import { BaseNode } from '@/components/base-node';
import {
  NodeHeader,
  NodeHeaderTitle,
  NodeHeaderIcon,
} from '@/components/node-header';
import { Brain } from 'lucide-react';
import { stratify, tree } from 'd3-hierarchy';

import '@xyflow/react/dist/style.css';
import { useCallback, useMemo } from 'react';
import { DataEdge } from '../data-edge';
import { FileEvaluationReadWithFile } from '@/file-classifier-api';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

const g = tree<Node>();

type EvaluationNode = Node<{
  value: string;
  evaluation: FileEvaluationReadWithFile;
}>;

function NodeHeaderDemo({ selected, data }: NodeProps<EvaluationNode>) {
  return (
    <BaseNode selected={selected} className="px-3 py-2">
      <Handle type="target" position={Position.Top} />
      <NodeHeader className="-mx-3 -mt-2 border-b">
        <NodeHeaderIcon>
          <Brain />
        </NodeHeaderIcon>
        <NodeHeaderTitle>{data.evaluation.evaluation.title}</NodeHeaderTitle>
      </NodeHeader>
      <div>
        <div className="mt-2">{data.evaluation.evaluation.prompt}</div>
        <div className="mt-2">
          Response:{' '}
          {data.evaluation.evaluation.evaluation_type === 'enum_choice' && (
            <Badge>{data.value}</Badge>
          )}
          {data.evaluation.evaluation.evaluation_type === 'boolean' && (
            <Badge
              className={cn(
                data.value === 'true' ? 'bg-green-500' : 'bg-red-500'
              )}
            >
              {data.value === 'true' ? 'Yes' : 'No'}
            </Badge>
          )}
          {data.evaluation.evaluation.evaluation_type === 'text' && data.value}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </BaseNode>
  );
}

const nodeTypes = {
  nodeHeaderNode: NodeHeaderDemo,
};

const edgeTypes = {
  dataEdge: DataEdge,
};

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  if (nodes.length === 0) return { nodes, edges };

  const element = document.querySelector(`[data-id="${nodes[0].id}"]`);
  if (!element) return { nodes, edges };

  const { width, height } = element.getBoundingClientRect();
  const hierarchy = stratify<Node>()
    .id((node) => node.id)
    .parentId((node) => edges.find((edge) => edge.target === node.id)?.source);
  const root = hierarchy(nodes);
  const layout = g.nodeSize([width * 1.1, height * 1.1])(root);

  return {
    nodes: layout
      .descendants()
      .map((node) => ({ ...node.data, position: { x: node.x, y: node.y } })),
    edges,
  };
};

export type FileEvaluationGraphProps = {
  evaluations: FileEvaluationReadWithFile[];
};

export default function FileEvaluationGraph({
  evaluations,
}: FileEvaluationGraphProps) {
  const { fitView } = useReactFlow();

  const initialNodes = useMemo(
    () =>
      evaluations.map<EvaluationNode>((evaluation) => ({
        id: `${evaluation.content.id}-${evaluation.evaluation.id}`,
        type: 'nodeHeaderNode',
        position: { x: 0, y: 0 },
        data: { evaluation, value: evaluation.response },
      })),
    [evaluations]
  );

  const evaluationMap = useMemo(() => {
    const map: Record<string, FileEvaluationReadWithFile> = {};
    for (const evaluation of evaluations) {
      map[`${evaluation.content.id}-${evaluation.evaluation.id}`] = evaluation;
    }
    return map;
  }, [evaluations]);

  const initialEdges = useMemo(() => {
    const edges: Edge[] = [];
    for (const evaluation of evaluations) {
      if (evaluation.evaluation.parent_evaluation_id) {
        const parentEvaluation =
          evaluationMap[
            `${evaluation.content.id}-${evaluation.evaluation.parent_evaluation_id}`
          ];
        if (parentEvaluation) {
          edges.push({
            id: `${parentEvaluation.content.id}-${parentEvaluation.evaluation.id}->${evaluation.content.id}-${evaluation.evaluation.id}`,
            source: `${parentEvaluation.content.id}-${parentEvaluation.evaluation.id}`,
            target: `${evaluation.content.id}-${evaluation.evaluation.id}`,
            type: 'dataEdge',
            data: { key: 'value', path: 'step' },
          });
        }
      }
    }
    return edges;
  }, [evaluationMap, evaluations]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

  const onLayout = useCallback(() => {
    const layouted = getLayoutedElements(nodes, edges);

    setNodes([...layouted.nodes]);
    setEdges([...layouted.edges]);

    fitView();
  }, [nodes, edges, setNodes, setEdges, fitView]);

  return (
    <>
      <div style={{ height: '80vh' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          colorMode="dark"
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onInit={onLayout}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
        >
          <Background />
        </ReactFlow>
      </div>
    </>
  );
}
