import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Position,
  Handle
} from 'reactflow';
import type { Node, Edge, Connection, NodeTypes } from 'reactflow';
import 'reactflow/dist/style.css';

// --- TypeScript Interfaces ---
interface APINode {
  _id: string;
  question_text: string;
  answer_text: string;
  parent_node_ids: string[];
}

interface APIGraph {
  _id: string;
  user_id: string;
  topic: string;
  nodes: APINode[];
}

// --- Custom Node Component ---
const CustomNode: React.FC<{ data: { question: string; answer: string } }> = ({ data }) => {
  return (
    <div className="bg-white border border-gray-300 rounded-lg shadow-md p-4 min-w-[250px] max-w-[300px]">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-blue-500"
      />
      <div className="font-semibold text-gray-800 mb-2 text-sm">
        {data.question}
      </div>
      <div className="text-gray-600 text-xs border-t border-gray-200 pt-2">
        {data.answer.length > 100 
          ? `${data.answer.substring(0, 100)}...` 
          : data.answer
        }
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-green-500"
      />
    </div>
  );
};

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

// --- Main Component ---
const KnowledgeGraph: React.FC<{ graphId: string }> = ({ graphId }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Convert API data to React Flow format
  const convertToReactFlowData = useCallback((apiNodes: APINode[]) => {
    const flowNodes: Node[] = apiNodes.map((apiNode, index) => ({
      id: apiNode._id,
      type: 'custom',
      position: { 
        x: (index % 3) * 300 + 50, 
        y: Math.floor(index / 3) * 150 + 50 
      },
      data: {
        question: apiNode.question_text,
        answer: apiNode.answer_text,
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    }));

    const flowEdges: Edge[] = [];
    apiNodes.forEach((node) => {
      if (node.parent_node_ids) {
        node.parent_node_ids.forEach(parentId => {
          if (apiNodes.some(n => n._id === parentId)) {
            flowEdges.push({
              id: `e-${parentId}-${node._id}`,
              source: parentId,
              target: node._id,
              type: 'smoothstep',
              style: { stroke: '#999', strokeWidth: 2 },
            });
          }
        });
      }
    });

    return { flowNodes, flowEdges };
  }, []);

  // Handle edge connections
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/graphs/${graphId}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data: APIGraph = await response.json();

        const { flowNodes, flowEdges } = convertToReactFlowData(data.nodes);
        setNodes(flowNodes);
        setEdges(flowEdges);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [graphId, convertToReactFlowData, setNodes, setEdges]);

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (error) return <div className="flex items-center justify-center h-screen text-red-600">Error: {error}</div>;

  return (
    <div 
      style={{ 
        width: '100vw', 
        height: '100vh', 
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        style={{ width: '100%', height: '100%' }}
        proOptions={{ hideAttribution: true }}
      >
        <Controls />
        <Background color="#aaa" gap={16} />
      </ReactFlow>
    </div>
  );
};

export default KnowledgeGraph;