# main.py
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Set
from uuid import uuid4, UUID
from threading import Lock
from datetime import datetime
import json

# -----------------------------
# 1) Data Models (Pydantic)
# -----------------------------
class QAPair(BaseModel):
    qa_id: str = Field(default_factory=lambda: str(uuid4()), alias='_id')
    question: str
    answer: str
    created_at: Optional[str] = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

class Cluster(BaseModel):
    title: str
    qas: List[QAPair] = Field(default_factory=list)

class ClusterList(BaseModel):
    title: str  # e.g., "calculus"
    clusters: List[Cluster] = Field(default_factory=list)

class AddQARequest(BaseModel):
    clusterName: str
    question: str
    answer: str

class AddQAResponse(BaseModel):
    message: str
    cluster: Cluster

class UpdateQARequest(BaseModel):
    clusterName: str
    qa_id: str
    question: Optional[str] = None
    answer: Optional[str] = None

class UpdateQAResponse(BaseModel):
    message: str
    qa_pair: QAPair

# -----------------------------
# 2) App + CORS
# -----------------------------
app = FastAPI(
    title="ThinkEx Clusters API",
    description="Simple in-memory clusters for a single conversation (no graph_id).",
    version="1.0.0"
)

# Allow all origins for development, or be more specific in production
# For example, to allow all netlify subdomains and localhost:
origins_regex = r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https://.*--thinkex\.netlify\.app|https://thinkex\.netlify\.app|https://uninveighing-eve-flinchingly.ngrok-free.app"

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=origins_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# 3) In-Memory Store (thread-safe) + WebSocket Management
# -----------------------------
lock = Lock()

# WebSocket connection management
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        if not self.active_connections:
            return
        
        message_str = json.dumps(message)
        disconnected = set()
        
        for connection in self.active_connections:
            try:
                await connection.send_text(message_str)
            except Exception:
                disconnected.add(connection)
        
        # Remove disconnected clients
        for connection in disconnected:
            self.active_connections.discard(connection)

manager = ConnectionManager()

# Mock data per your spec:
# - One ClusterList titled "calculus"
# - Clusters are integration topics
# DATA = ClusterList(
#     title="Calculus",
#     clusters=[
#         Cluster(
#             title="Substitution",
#             qas=[
#                 QAPair(
#                     question="How do I recognize when to use u-substitution?",
#                     answer="Look for a composite f(g(x)) where g'(x) appears elsewhere (up to a constant factor)."
#                 ),
#                 QAPair(
#                     question="What if the derivative isn’t an exact match?",
#                     answer="Factor out constants or rewrite the integrand; if only a constant is missing, multiply/divide by it."
#                 ),
#                 QAPair(
#                     question="Common patterns for substitution?",
#                     answer="Roots like √(ax+b), exponentials e^{ax+b}, logarithms ln(ax+b), and products f(g(x))·g'(x)."
#                 )
#             ]
#         ),
#         Cluster(
#             title="Integration by Parts",
#             qas=[
#                 QAPair(
#                     question="What is the integration by parts formula?",
#                     answer="∫u dv = uv − ∫v du; pick u via LIATE/ILATE when unsure."
#                 ),
#                 QAPair(
#                     question="When does tabular (DI) method help?",
#                     answer="When u differentiates to 0 in a few steps (polynomials) and dv integrates repeatedly (e^x, sin, cos)."
#                 ),
#                 QAPair(
#                     question="Classic targets for choosing u?",
#                     answer="ln x, arctan x, algebraic factors with exponent ≥ 1."
#                 ),
#                 QAPair(
#                     question="What about ∫e^{ax}cos(bx) dx?",
#                     answer="Apply IBP twice or use the standard result: ∫e^{ax}cos(bx)dx = e^{ax}(a cos bx + b sin bx)/(a^2+b^2)+C."
#                 )
#             ]
#         ),
#         Cluster(
#             title="Partial Fractions",
#             qas=[
#                 QAPair(
#                     question="When can I use partial fractions?",
#                     answer="For rational functions P/Q with deg P < deg Q and Q factorable over ℝ; do long division if deg P ≥ deg Q."
#                 ),
#                 QAPair(
#                     question="How do I handle repeated linear factors?",
#                     answer="Include terms A1/(x−r) + A2/(x−r)^2 + … up to the multiplicity."
#                 ),
#                 QAPair(
#                     question="What about irreducible quadratics?",
#                     answer="Use (Ax+B)/(ax^2+bx+c) for each irreducible quadratic factor."
#                 )
#             ]
#         ),
#         Cluster(
#             title="Trigonometric Integrals",
#             qas=[
#                 QAPair(
#                     question="How to approach ∫sin^m x cos^n x dx?",
#                     answer="If one exponent is odd, peel one factor and use sin^2+cos^2=1 to convert the rest."
#                 ),
#                 QAPair(
#                     question="Strategy for ∫tan^m x sec^n x dx?",
#                     answer="If n is even, peel sec^2; if m is odd, peel sec·tan and convert using sec^2=1+tan^2."
#                 ),
#                 QAPair(
#                     question="Power-reduction identities useful when?",
#                     answer="When both exponents are even; convert with cos^2=(1+cos2x)/2, sin^2=(1−cos2x)/2."
#                 )
#             ]
#         ),
#         Cluster(
#             title="Trigonometric Substitution",
#             qas=[
#                 QAPair(
#                     question="Which substitution for √(a^2 − x^2)?",
#                     answer="x = a sin θ, dx = a cos θ dθ, and use 1−sin^2θ=cos^2θ."
#                 ),
#                 QAPair(
#                     question="Which substitution for √(a^2 + x^2)?",
#                     answer="x = a tan θ, dx = a sec^2 θ dθ, and 1+tan^2θ=sec^2θ."
#                 ),
#                 QAPair(
#                     question="Which substitution for √(x^2 − a^2)?",
#                     answer="x = a sec θ, dx = a sec θ tan θ dθ, and sec^2θ−1=tan^2θ."
#                 ),
#                 QAPair(
#                     question="How do I back-substitute cleanly?",
#                     answer="Draw a reference triangle from the substitution to express sinθ, cosθ, tanθ in terms of x and a."
#                 )
#             ]
#         ),
#         Cluster(
#             title="Improper Integrals",
#             qas=[
#                 QAPair(
#                     question="How do I test convergence of ∫_1^∞ 1/x^p dx?",
#                     answer="Converges iff p>1; diverges otherwise (p-test)."
#                 ),
#                 QAPair(
#                     question="What about ∫_0^1 x^{−p} dx?",
#                     answer="Converges iff p<1; diverges otherwise."
#                 ),
#                 QAPair(
#                     question="When to use comparison vs limit comparison?",
#                     answer="Use direct comparison with clear inequalities; use limit comparison when functions are asymptotically proportional."
#                 )
#             ]
#         ),
#         Cluster(
#             title="Reduction Formulas",
#             qas=[
#                 QAPair(
#                     question="What is a reduction formula?",
#                     answer="A recurrence expressing ∫f_n in terms of ∫f_{n−1} (e.g., ∫sin^n x dx)."
#                 ),
#                 QAPair(
#                     question="Example for sin^n x?",
#                     answer="∫sin^n x dx = −(sin^{n−1}x cos x)/n + ((n−1)/n)∫sin^{n−2}x dx."
#                 )
#             ]
#         ),
#         Cluster(
#             title="Numerical Integration",
#             qas=[
#                 QAPair(
#                     question="When to use Trapezoidal vs Simpson’s?",
#                     answer="Trapezoidal is O(h^2) and simple; Simpson’s is O(h^4) but needs an even number of subintervals and smooth f."
#                 ),
#                 QAPair(
#                     question="How to control error quickly?",
#                     answer="Halve h and compare results; Richardson extrapolation can accelerate convergence."
#                 )
#             ]
#         ),
#         Cluster(
#             title="Integration Strategy",
#             qas=[
#                 QAPair(
#                     question="What’s a good general checklist?",
#                     answer="Simplify → try substitution → trig identities → parts → partial fractions → trig sub → numeric if needed."
#                 ),
#                 QAPair(
#                     question="Quick algebraic rewrites that help?",
#                     answer="Split sums, factor constants, complete the square, rationalize, or rewrite powers with identities."
#                 )
#             ]
#         )
#     ]
# )
DATA = ClusterList(title="Knowledge Base", clusters=[])

def _find_cluster_idx_case_insensitive(name: str) -> Optional[int]:
    name_norm = name.strip().lower()
    for i, c in enumerate(DATA.clusters):
        if c.title.strip().lower() == name_norm:
            return i
    return None

# -----------------------------
# 4) Endpoints for GPT Actions
# -----------------------------

@app.get(
    "/clusters", 
    response_model=ClusterList, 
    operation_id="get_clusters",
)
def get_clusters():
    """
    get_clusters() -> returns the entire ClusterList
    """
    with lock:
        return DATA

@app.post("/update_qa", response_model=UpdateQAResponse, operation_id="update_qa")
async def update_qa(payload: UpdateQARequest):
    """
    update_qa(clusterName, qa_id, question, answer) -> updates a Q/A in the named cluster.
    At least one of question or answer must be provided.
    """
    cluster_name = payload.clusterName.strip()
    if not cluster_name:
        raise HTTPException(status_code=400, detail="clusterName must be non-empty")
    if not payload.qa_id:
        raise HTTPException(status_code=400, detail="qa_id must be non-empty")
    if payload.question is None and payload.answer is None:
        raise HTTPException(status_code=400, detail="At least one of 'question' or 'answer' must be provided for an update.")

    with lock:
        cluster_idx = _find_cluster_idx_case_insensitive(cluster_name)
        if cluster_idx is None:
            raise HTTPException(status_code=404, detail=f"Cluster '{cluster_name}' not found.")

        cluster = DATA.clusters[cluster_idx]
        qa_to_update = None
        qa_idx = -1

        for i, qa in enumerate(cluster.qas):
            if qa.qa_id == payload.qa_id:
                qa_to_update = qa
                qa_idx = i
                break
        
        if qa_to_update is None:
            raise HTTPException(status_code=404, detail=f"Q/A with id '{payload.qa_id}' not found in cluster '{cluster_name}'.")

        updated = False
        if payload.question is not None and payload.question.strip() and payload.question.strip() != qa_to_update.question:
            qa_to_update.question = payload.question.strip()
            updated = True
        
        if payload.answer is not None and payload.answer.strip() and payload.answer.strip() != qa_to_update.answer:
            qa_to_update.answer = payload.answer.strip()
            updated = True

        if not updated:
            return UpdateQAResponse(
                message="No changes detected.",
                qa_pair=qa_to_update
            )

        DATA.clusters[cluster_idx].qas[qa_idx] = qa_to_update

        await manager.broadcast({
            "type": "knowledge_graph_update",
            "action": "qa_updated",
            "payload": {
                "clusterName": cluster.title,
                "qa_pair": qa_to_update.dict(),
                "message": f'Updated Q/A in cluster "{cluster.title}".'
            }
        })

        return UpdateQAResponse(
            message=f'Updated Q/A in cluster "{cluster.title}".',
            qa_pair=qa_to_update
        )

@app.post("/add_qa", response_model=AddQAResponse, operation_id="add_qa")
async def add_qa(payload: AddQARequest):
    """
    add_qa(clusterName, question, answer) -> adds a Q/A to the named cluster.
    If the cluster doesn't exist, it will be created.
    """
    cluster_name = payload.clusterName.strip()
    if not cluster_name:
        raise HTTPException(status_code=400, detail="clusterName must be non-empty")
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="question must be non-empty")
    if not payload.answer.strip():
        raise HTTPException(status_code=400, detail="answer must be non-empty")

    with lock:
        idx = _find_cluster_idx_case_insensitive(cluster_name)
        qa = QAPair(question=payload.question.strip(), answer=payload.answer.strip())

        if idx is None:
            # create new cluster
            new_cluster = Cluster(title=cluster_name, qas=[qa])
            DATA.clusters.append(new_cluster)
            
            # Broadcast the update to all connected clients
            await manager.broadcast({
                "type": "knowledge_graph_update",
                "action": "cluster_created",
                "payload": {
                    "cluster": new_cluster.dict(),
                    "message": f'Created cluster "{new_cluster.title}" and added Q/A.'
                }
            })
            
            return AddQAResponse(
                message=f'Created cluster "{new_cluster.title}" and added Q/A.',
                cluster=new_cluster
            )
        else:
            # append to existing cluster
            DATA.clusters[idx].qas.append(qa)
            
            # Broadcast the update to all connected clients
            await manager.broadcast({
                "type": "knowledge_graph_update",
                "action": "qa_added",
                "payload": {
                    "cluster": DATA.clusters[idx].dict(),
                    "new_qa": qa.dict(),
                    "message": f'Added Q/A to cluster "{DATA.clusters[idx].title}".'
                }
            })
            
            return AddQAResponse(
                message=f'Added Q/A to cluster "{DATA.clusters[idx].title}".',
                cluster=DATA.clusters[idx]
            )

# -----------------------------
# 4) WebSocket Endpoint
# -----------------------------
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection alive and listen for messages
            data = await websocket.receive_text()
            # Echo back or handle client messages if needed
            message = json.loads(data)
            if message.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

# -----------------------------
# 5) Health + Root (optional)
# -----------------------------
@app.get("/", tags=["meta"])
def root():
    return {"status": "ok", "title": DATA.title, "clusters_count": len(DATA.clusters)}
