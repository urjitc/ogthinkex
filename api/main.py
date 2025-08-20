from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uuid
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from typing import List, Optional

# --- 1. Pydantic Models (No changes needed here) ---
class QANodeInput(BaseModel):
    question_text: str
    answer_text: str
    parent_node_ids: Optional[List[str]] = []

class QANode(QANodeInput):
    # This model expects the data to have a key "_id"
    id: str = Field(..., alias="_id")
    graph_id: str
    created_at: str

class KnowledgeGraph(BaseModel):
    # This model also expects the data to have a key "_id"
    id: str = Field(..., alias="_id")
    user_id: str
    topic: str
    nodes: List[QANode]

# --- 2. Corrected Backend Logic ---
app = FastAPI()

origins = ["http://localhost:4321", "null"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory "dummy" database
DB = {"graphs": {}}

@app.get("/graphs/{graph_id}", response_model=KnowledgeGraph)
def get_graph(graph_id: str):
    if graph_id not in DB["graphs"]:
        raise HTTPException(status_code=404, detail="Graph not found")
    # This data structure now matches the response_model
    return DB["graphs"][graph_id]

@app.post("/graphs/{graph_id}/nodes", status_code=201)
def add_qa_node(graph_id: str, node_input: QANodeInput):
    if graph_id not in DB["graphs"]:
        # Use "_id" when creating the graph
        DB["graphs"][graph_id] = {
            "_id": graph_id,
            "user_id": "test-user",
            "topic": "Test Topic",
            "nodes": []
        }
    
    # Use "_id" when creating the new node
    new_node_data = {
        "_id": str(uuid.uuid4()),
        "graph_id": graph_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        **node_input.dict()
    }
    
    DB["graphs"][graph_id]["nodes"].append(new_node_data)
    
    # Return the correct field name in the response
    return {"message": "Node added successfully", "node_id": new_node_data["_id"]}