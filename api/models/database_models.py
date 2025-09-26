from sqlmodel import SQLModel, Field, Relationship, JSON, Column
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import uuid4


class QAPairDB(SQLModel, table=True):
    """Database model for Q&A pairs"""
    __tablename__ = "qa_pairs"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    qa_id: str = Field(default_factory=lambda: str(uuid4()), unique=True, index=True)
    question: str = Field(index=True)
    answer: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Card type to distinguish between different types of cards
    card_type: Optional[str] = Field(default="qa", index=True)
    
    # Foreign key to cluster
    cluster_id: Optional[int] = Field(default=None, foreign_key="clusters.id")
    cluster: Optional["ClusterDB"] = Relationship(back_populates="qas")
    
    # Foreign key to source note (if this is a source note)
    source_note_id: Optional[int] = Field(default=None, foreign_key="source_notes.id")
    source_note: Optional["SourceNoteDB"] = Relationship(back_populates="qa_pairs")


class ClusterDB(SQLModel, table=True):
    """Database model for clusters"""
    __tablename__ = "clusters"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Foreign key to cluster list
    cluster_list_id: Optional[int] = Field(default=None, foreign_key="cluster_lists.id")
    cluster_list: Optional["ClusterListDB"] = Relationship(back_populates="clusters")
    
    # Relationship to Q&A pairs
    qas: List[QAPairDB] = Relationship(back_populates="cluster")
    
    # Relationship to source notes
    source_notes: List["SourceNoteDB"] = Relationship(back_populates="cluster")


class ClusterListDB(SQLModel, table=True):
    """Database model for cluster lists"""
    __tablename__ = "cluster_lists"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    list_id: str = Field(default_factory=lambda: str(uuid4()), unique=True, index=True)
    title: str = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationship to clusters
    clusters: List[ClusterDB] = Relationship(back_populates="cluster_list")


class SourceNoteDB(SQLModel, table=True):
    """Database model for source notes"""
    __tablename__ = "source_notes"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    source_note_id: str = Field(default_factory=lambda: str(uuid4()), unique=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Source metadata
    source_metadata: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    
    # Source content
    source_content: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    
    # Foreign key to cluster
    cluster_id: Optional[int] = Field(default=None, foreign_key="clusters.id")
    cluster: Optional["ClusterDB"] = Relationship(back_populates="source_notes")
    
    # Relationship to Q&A pairs (for source notes that have associated Q&As)
    qa_pairs: List[QAPairDB] = Relationship(back_populates="source_note")
