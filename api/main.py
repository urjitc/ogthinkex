from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uuid
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from typing import List, Optional

# --- 1. Pydantic Models (No changes needed here) ---
class QANodeInput(BaseModel):
    question_text: str = Field(..., description="The question being asked in the Q&A pair.")
    answer_text: str = Field(..., description="The answer to the question.")
    parent_node_ids: Optional[List[str]] = Field([], description="A list of parent node IDs to establish a hierarchical relationship.")

class QANode(QANodeInput):
    # This model expects the data to have a key "_id"
    id: str = Field(..., alias="_id")
    graph_id: Optional[str] = None
    created_at: Optional[str] = None

class KnowledgeGraph(BaseModel):
    # This model also expects the data to have a key "_id"
    id: str = Field(..., alias="_id")
    user_id: str
    topic: str
    nodes: List[QANode]

# --- 2. Corrected Backend Logic ---
app = FastAPI(
    title="ThinkEx Knowledge Graph API",
    description="API for creating and managing hierarchical knowledge graphs of Q&A pairs. Used by a custom GPT Action to add new information.",
    version="1.0.0",
)

origins = ["http://localhost:4321", "null"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory "dummy" database with seeded mock data
def create_mock_data():
    """Note to self: make really good comments here in the models. 300 char or less. Create mock conversation data between a student and AI about Mathematics"""
    
    # Generate unique IDs for nodes
    def create_node_id():
        return str(uuid.uuid4())
    
    # Create node IDs for the math conversation
    node_ids = {
        # Main topic: Mathematics
        "math_overview": create_node_id(),
        
        # Subtopics
        "calculus_intro": create_node_id(),
        "algebra_intro": create_node_id(),
        
        # Calculus Q&As
        "derivatives_basic": create_node_id(),
        "derivatives_rules": create_node_id(),
        "integrals_basic": create_node_id(),
        "integrals_applications": create_node_id(),
        "limits_concept": create_node_id(),
        "limits_evaluation": create_node_id(),
        
        # Algebra Q&As
        "linear_equations": create_node_id(),
        "quadratic_equations": create_node_id(),
        "polynomials": create_node_id(),
        "factoring": create_node_id(),
        "systems_equations": create_node_id(),
        "inequalities": create_node_id()
    }
    
    # Create the main math graph
    math_graph = {
        "_id": "thinkex-demo",
        "user_id": "student-123",
        "topic": "Mathematics Study Session",
        "nodes": [
            # Root topic: Mathematics Overview
            {
                "_id": node_ids["math_overview"],
                "question_text": "I'm starting to study mathematics more seriously. Can you give me an overview of the main areas I should focus on?",
                "answer_text": "Great question! Mathematics has many interconnected branches, but for a solid foundation, I'd recommend focusing on these key areas: 1) Algebra - the language of mathematics, dealing with variables, equations, and abstract structures, 2) Calculus - the study of change and motion, including derivatives and integrals, 3) Geometry - spatial relationships and properties of shapes, 4) Statistics & Probability - analyzing data and uncertainty. Each area builds on the others, so starting with algebra and then moving to calculus is a natural progression.",
                "parent_node_ids": []
            },
            
            # Subtopic 1: Calculus Introduction
            {
                "_id": node_ids["calculus_intro"],
                "question_text": "I keep hearing about calculus being important. What exactly is calculus and why should I learn it?",
                "answer_text": "Calculus is the mathematics of change and motion! It has two main branches: 1) Differential Calculus - studies rates of change (derivatives), like how fast a car is accelerating, 2) Integral Calculus - studies accumulation (integrals), like finding the total distance traveled. Calculus is everywhere: physics (motion, forces), economics (optimization), engineering (design), biology (population growth), and computer graphics. It's the foundation for understanding how things change over time.",
                "parent_node_ids": [node_ids["math_overview"]]
            },
            
            # Subtopic 2: Algebra Introduction
            {
                "_id": node_ids["algebra_intro"],
                "question_text": "I struggled with algebra in school. Can you help me understand what algebra is really about and why it matters?",
                "answer_text": "Algebra is essentially the art of working with unknowns! Instead of just numbers, we use variables (like x, y) to represent quantities we don't know yet. The key ideas are: 1) Equations - mathematical statements that two things are equal, 2) Variables - symbols that can represent different values, 3) Operations - addition, subtraction, multiplication, division with these symbols. Algebra teaches logical thinking and problem-solving. It's the gateway to all higher mathematics and is used in everything from calculating tips to designing rockets!",
                "parent_node_ids": [node_ids["math_overview"]]
            },
            
            # Calculus Q&As
            {
                "_id": node_ids["derivatives_basic"],
                "question_text": "What exactly is a derivative? I'm having trouble understanding the concept.",
                "answer_text": "A derivative measures how fast something is changing at a specific moment. Think of it as the 'instantaneous rate of change.' For example, if you're driving and your speedometer shows 60 mph, that's the derivative of your position with respect to time at that instant. Mathematically, if you have a function f(x), its derivative f'(x) tells you the slope of the tangent line at any point. The derivative answers questions like: How steep is this curve? How fast is this quantity growing?",
                "parent_node_ids": [node_ids["calculus_intro"]]
            },
            
            {
                "_id": node_ids["derivatives_rules"],
                "question_text": "Are there shortcuts for calculating derivatives, or do I always have to use the limit definition?",
                "answer_text": "Great question! Yes, there are many shortcut rules that make derivatives much easier: 1) Power Rule: d/dx(x^n) = nx^(n-1), 2) Product Rule: d/dx(uv) = u'v + uv', 3) Chain Rule: d/dx(f(g(x))) = f'(g(x)) · g'(x), 4) Quotient Rule: d/dx(u/v) = (u'v - uv')/v². These rules let you find derivatives quickly without going back to limits every time. Once you memorize these patterns, calculus becomes much more manageable!",
                "parent_node_ids": [node_ids["derivatives_basic"]]
            },
            
            {
                "_id": node_ids["integrals_basic"],
                "question_text": "I understand derivatives now, but integrals seem much harder. What's the intuition behind integration?",
                "answer_text": "Integration is actually the 'reverse' of differentiation! While derivatives measure rates of change, integrals measure accumulation. Think of it this way: if derivatives ask 'how fast?', integrals ask 'how much total?' For example, if you know your speed at every moment during a trip, integration lets you find the total distance traveled. Geometrically, an integral finds the area under a curve. The Fundamental Theorem of Calculus beautifully connects these concepts: integration and differentiation are inverse operations.",
                "parent_node_ids": [node_ids["calculus_intro"]]
            },
            
            {
                "_id": node_ids["integrals_applications"],
                "question_text": "What are some real-world applications where I'd actually use integrals?",
                "answer_text": "Integrals are everywhere in the real world! Here are some examples: 1) Physics - calculating work done by a variable force, finding centers of mass, 2) Economics - finding total profit from marginal profit functions, consumer surplus, 3) Engineering - calculating volumes of irregular shapes, fluid flow rates, 4) Medicine - determining drug dosages over time, analyzing medical imaging, 5) Computer Graphics - rendering smooth curves and surfaces. Any time you need to add up infinitely many tiny pieces, you're using integration!",
                "parent_node_ids": [node_ids["integrals_basic"]]
            },
            
            {
                "_id": node_ids["limits_concept"],
                "question_text": "Limits seem really abstract. Why do I need to understand them for calculus?",
                "answer_text": "Limits are the foundation that makes calculus rigorous! They answer the question: 'What value does a function approach as the input gets closer and closer to some number?' Limits are crucial because: 1) They define derivatives - a derivative is the limit of difference quotients, 2) They define integrals - integrals are limits of Riemann sums, 3) They handle tricky situations like division by zero or infinity. Without limits, we couldn't precisely define what we mean by 'instantaneous' rate of change.",
                "parent_node_ids": [node_ids["calculus_intro"]]
            },
            
            {
                "_id": node_ids["limits_evaluation"],
                "question_text": "How do I actually calculate limits? Some of them give me 0/0 which doesn't make sense.",
                "answer_text": "You're encountering indeterminate forms like 0/0! Here are the main techniques: 1) Direct substitution - try plugging in the value first, 2) Factoring - factor and cancel common terms, 3) L'Hôpital's Rule - for 0/0 or ∞/∞, take derivatives of numerator and denominator, 4) Rationalization - multiply by conjugates to eliminate square roots, 5) Squeeze Theorem - trap the function between two others. The key is recognizing which technique to use for each type of limit problem.",
                "parent_node_ids": [node_ids["limits_concept"]]
            },
            
            # Algebra Q&As
            {
                "_id": node_ids["linear_equations"],
                "question_text": "I get confused with linear equations. What's the best way to solve them systematically?",
                "answer_text": "Linear equations are your bread and butter in algebra! The key is to isolate the variable using inverse operations. Here's the systematic approach: 1) Simplify both sides (combine like terms, distribute), 2) Get all variable terms on one side, constants on the other, 3) Use inverse operations in reverse order of operations (PEMDAS backwards), 4) Check your answer by substituting back. For example: 3x + 7 = 22 → 3x = 15 → x = 5. The goal is always to get 'x = something'.",
                "parent_node_ids": [node_ids["algebra_intro"]]
            },
            
            {
                "_id": node_ids["quadratic_equations"],
                "question_text": "Quadratic equations seem much harder than linear ones. What are my options for solving them?",
                "answer_text": "Quadratics (ax² + bx + c = 0) have several solution methods: 1) Factoring - if it factors nicely, like (x+2)(x-3) = 0, 2) Quadratic Formula - x = (-b ± √(b²-4ac))/(2a), works for any quadratic, 3) Completing the Square - rewrite as (x+h)² = k, 4) Graphing - find where the parabola crosses the x-axis. The quadratic formula is your reliable backup when other methods don't work easily. Remember: quadratics can have 0, 1, or 2 real solutions!",
                "parent_node_ids": [node_ids["algebra_intro"]]
            },
            
            {
                "_id": node_ids["polynomials"],
                "question_text": "What exactly are polynomials and why are they so important in algebra?",
                "answer_text": "Polynomials are expressions made up of variables raised to whole number powers, like 3x³ - 2x² + 5x - 7. They're important because: 1) They're building blocks - many complex functions can be approximated by polynomials, 2) They have nice properties - you can always add, subtract, and multiply them to get another polynomial, 3) They model real situations - projectile motion, population growth, economics, 4) They're the foundation for calculus and higher math. The degree (highest power) tells you a lot about the polynomial's behavior.",
                "parent_node_ids": [node_ids["algebra_intro"]]
            },
            
            {
                "_id": node_ids["factoring"],
                "question_text": "Factoring polynomials is really challenging for me. Are there strategies that make it easier?",
                "answer_text": "Factoring is like finding the 'building blocks' of a polynomial! Here's a systematic approach: 1) Always factor out the GCF (Greatest Common Factor) first, 2) Look for special patterns: difference of squares (a² - b²), perfect square trinomials (a² ± 2ab + b²), 3) For trinomials ax² + bx + c, use the AC method or trial and error, 4) For higher degrees, try grouping or synthetic division. Practice recognizing patterns - factoring gets much easier with experience!",
                "parent_node_ids": [node_ids["polynomials"]]
            },
            
            {
                "_id": node_ids["systems_equations"],
                "question_text": "How do I solve systems of equations? There seem to be multiple methods and I'm not sure which to use.",
                "answer_text": "Systems of equations have three main solution methods: 1) Substitution - solve one equation for a variable, substitute into the other, 2) Elimination - add/subtract equations to eliminate a variable, 3) Graphing - find intersection points of the lines. Choose based on the situation: substitution works well when one equation is already solved for a variable, elimination is great when coefficients line up nicely, graphing gives visual insight. Systems can have one solution (intersecting lines), no solution (parallel lines), or infinitely many solutions (same line).",
                "parent_node_ids": [node_ids["linear_equations"]]
            },
            
            {
                "_id": node_ids["inequalities"],
                "question_text": "Inequalities confuse me because they're not exactly equal. How do I work with them?",
                "answer_text": "Inequalities show relationships like 'greater than' or 'less than' instead of exact equality. The key rules: 1) You can add/subtract the same number from both sides, 2) You can multiply/divide by positive numbers normally, 3) When multiplying/dividing by negative numbers, flip the inequality sign! For example: -2x > 6 becomes x < -3 (notice the flip). Graph solutions on number lines using open circles (< or >) or closed circles (≤ or ≥). Inequalities represent ranges of solutions, not just single values.",
                "parent_node_ids": [node_ids["algebra_intro"]]
            }
        ]
    }
    
    return {
        "graphs": {
            math_graph["_id"]: math_graph
        }
    }

# Initialize database with mock data
DB = create_mock_data()

@app.get("/graphs/{graph_id}/", response_model=KnowledgeGraph)
@app.get("/graphs/{graph_id}", response_model=KnowledgeGraph)
def get_graph(graph_id: str):
    if graph_id not in DB["graphs"]:
        raise HTTPException(status_code=404, detail="Graph not found")
    # This data structure now matches the response_model
    return DB["graphs"][graph_id]

@app.post("/graphs/{graph_id}/nodes/", status_code=201, summary="Add a new Q&A node to a knowledge graph", operation_id="add_new_qa_node_to_graph")
@app.post("/graphs/{graph_id}/nodes", status_code=201, summary="Add a new Q&A node to a knowledge graph", operation_id="add_new_qa_node_to_graph")
def add_qa_node(graph_id: str, node_input: QANodeInput):
    """
    Adds a new question-answer (QA) node to a specified knowledge graph.

    This action is used to expand the knowledge base with new information.
    You need to provide the `graph_id` of the knowledge graph you want to modify.
    The new node will contain a `question_text`, an `answer_text`, and can optionally
    be linked to parent nodes via `parent_node_ids` to create a hierarchy.
    """
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