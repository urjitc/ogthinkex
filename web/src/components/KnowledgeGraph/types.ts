// --- TypeScript Interfaces ---
export interface APINode {
  _id: string;
  question_text: string;
  answer_text: string;
  parent_node_ids: string[];
}

export interface APIGraph {
  _id: string;
  user_id: string;
  topic: string;
  nodes: APINode[];
}

export interface TreeNode {
  id: string;
  name: string;
  type: 'topic' | 'subtopic' | 'thread';
  children: TreeNode[];
  nodeIds: string[];
}

export interface BreadcrumbItem {
  id: string;
  name: string;
}
