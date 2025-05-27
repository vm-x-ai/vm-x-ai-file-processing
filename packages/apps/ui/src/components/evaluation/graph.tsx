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
import { HierarchyPointNode, stratify, tree } from 'd3-hierarchy';

import '@xyflow/react/dist/style.css';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { DataEdge } from '../data-edge';
import { FileEvaluationReadWithFile } from '@/file-classifier-api';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const g = tree<Node>();

type EvaluationNode = Node<{
  value: string;
  evaluation: FileEvaluationReadWithFile;
}>;

function NodeHeaderDemo({ selected, data }: NodeProps<EvaluationNode>) {
  return (
    <BaseNode selected={selected} className="px-3 py-2 w-64">
      <Handle type="target" position={Position.Top} />
      <NodeHeader className="-mx-3 -mt-2 border-b">
        <NodeHeaderIcon>
          <Brain />
        </NodeHeaderIcon>
        <NodeHeaderTitle className="truncate">{data.evaluation.evaluation.title}</NodeHeaderTitle>
      </NodeHeader>
      <div>
        <div className="mt-2 text-center">
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

  // Use reasonable default dimensions for evaluation cards
  // These are typical sizes for the evaluation node cards
  const cardWidth = 256;  // Match the w-64 class (256px)
  const cardHeight = 150; // Reduced height for more compact layout
  
  return getLayoutedElementsWithDimensions(nodes, edges, cardWidth, cardHeight);
};

const getLayoutedElementsWithDimensions = (nodes: Node[], edges: Edge[], width: number, height: number) => {
  // Deduplicate nodes by ID (handle the duplicate database entries)
  const uniqueNodes = nodes.filter((node, index, self) => 
    index === self.findIndex(n => n.id === node.id)
  );
  
  // Find root nodes (nodes without incoming edges)
  const rootNodes = uniqueNodes.filter(node => 
    !edges.some(edge => edge.target === node.id)
  );
  
  // If we have multiple roots, create a virtual root
  let nodesWithVirtualRoot = [...uniqueNodes];
  let edgesWithVirtualRoot = [...edges];
  
  if (rootNodes.length > 1) {
    // Create a virtual root node
    const virtualRoot: Node = {
      id: 'virtual-root',
      type: 'default',
      position: { x: 0, y: 0 },
      data: {},
      hidden: true, // Hide the virtual root
    };
    
    nodesWithVirtualRoot = [virtualRoot, ...uniqueNodes];
    
    // Connect virtual root to all actual root nodes
    const virtualEdges = rootNodes.map(rootNode => ({
      id: `virtual-root->${rootNode.id}`,
      source: 'virtual-root',
      target: rootNode.id,
      type: 'dataEdge',
      hidden: true, // Hide the virtual edges
    }));
    
    edgesWithVirtualRoot = [...edges, ...virtualEdges];
  }
  
  const hierarchy = stratify<Node>()
    .id((node) => node.id)
    .parentId((node) => edgesWithVirtualRoot.find((edge) => edge.target === node.id)?.source);
  
  const root = hierarchy(nodesWithVirtualRoot);
  const layout = g.nodeSize([width * 1.1, height * 1.1])(root);

  // If we have multiple root trees, spread them out horizontally
  let layoutNodes: Node[];
  if (rootNodes.length > 1) {
        // Special case: if there are no edges at all, just arrange nodes in a grid
    if (edges.length === 0) {
      const nodesPerRow = Math.ceil(Math.sqrt(uniqueNodes.length));
      // Use more compact spacing
      const nodeSpacing = width + 30;  // Card width + 30px padding (reduced from 50px)
      const rowSpacing = height + 20;  // Card height + 20px padding (reduced from 30px)
      
      layoutNodes = uniqueNodes.map((node, index) => {
        const row = Math.floor(index / nodesPerRow);
        const col = index % nodesPerRow;
        const totalCols = Math.min(uniqueNodes.length - row * nodesPerRow, nodesPerRow);
        const startX = -(totalCols - 1) * nodeSpacing / 2;
        
        const position = {
          x: startX + col * nodeSpacing,
          y: row * rowSpacing
        };
        
        return {
          ...node,
          position
        };
      });
        } else {
      // Hierarchical layout: we have parent-child relationships
      // Group nodes by their root tree
      const treeGroups = new Map<string, HierarchyPointNode<Node>[]>();
      
      layout.descendants().forEach(node => {
        if (node.data.id === 'virtual-root') return;
        
        // Find which root this node belongs to
        let currentNode = node;
        while (currentNode.parent && currentNode.parent.data.id !== 'virtual-root') {
          currentNode = currentNode.parent;
        }
        
        const rootId = currentNode.data.id;
        if (!treeGroups.has(rootId)) {
          treeGroups.set(rootId, []);
        }
        treeGroups.get(rootId)?.push(node);
      });
      
      // For hierarchical layout, use more compact spacing between trees
      // but keep the tree structure intact
      const treeSpacing = width * 1.5 + 60; // More compact space between independent trees
      const trees = Array.from(treeGroups.entries());
      const totalWidth = (trees.length - 1) * treeSpacing;
      const startX = -totalWidth / 2;
      
      layoutNodes = [];
      trees.forEach(([rootId, treeNodes], treeIndex) => {
        const treeOffsetX = startX + (treeIndex * treeSpacing);
        
        // Find the bounds of this tree to center it
        const treeXPositions = treeNodes.map(node => node.x);
        const minX = Math.min(...treeXPositions);
        const maxX = Math.max(...treeXPositions);
        const treeCenterOffset = -(minX + maxX) / 2;
        
        treeNodes.forEach(node => {
          const finalPosition = { 
            x: node.x + treeCenterOffset + treeOffsetX, 
            y: node.y 
          };
          
          layoutNodes.push({
            ...node.data,
            position: finalPosition
          });
        });
      });
    }
  } else {
    // Single tree - use original layout
    layoutNodes = layout
      .descendants()
      .filter(node => node.data.id !== 'virtual-root')
      .map((node) => ({ ...node.data, position: { x: node.x, y: node.y } }));
  }

  return {
    nodes: layoutNodes,
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
  const [isLayoutReady, setIsLayoutReady] = useState(false);

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

  // Reset layout ready state when evaluations change
  useEffect(() => {
    setIsLayoutReady(false);
  }, [evaluations]);

  const onLayout = useCallback(() => {
    const layouted = getLayoutedElements(initialNodes, initialEdges);
    setNodes([...layouted.nodes]);
    setEdges([...layouted.edges]);
    
    // Mark layout as ready and fit view
    setTimeout(() => {
      setIsLayoutReady(true);
      fitView();
    }, 50);
  }, [initialNodes, initialEdges, setNodes, setEdges, fitView]);

  return (
    <>
      <div style={{ height: '80vh' }} className="relative">
        {!isLayoutReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Calculating layout...</span>
            </div>
          </div>
        )}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          colorMode="dark"
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onInit={onLayout}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView={false}  // Disable automatic fitView to preserve our custom positioning
          style={{ opacity: isLayoutReady ? 1 : 0 }}
        >
          <Background />
        </ReactFlow>
      </div>
    </>
  );
}
