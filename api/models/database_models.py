from sqlmodel import SQLModel, Field, Relationship
from typing import List, Optional
from datetime import datetime
from uuid import uuid4


class QAPairDB(SQLModel, table=True):
    """Database model for Q&A pairs"""
    __tablename__ = "qa_pairs"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    qa_id: str = Field(default_factory=lambda: str(uuid4()), unique=True, index=True)
    question: str = Field(index=True)
    answer: str
    order: int = Field(default=0, description="Position in cluster")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Foreign key to cluster
    cluster_id: Optional[int] = Field(default=None, foreign_key="clusters.id")
    cluster: Optional["ClusterDB"] = Relationship(back_populates="qas")


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


class ClusterListDB(SQLModel, table=True):
    """Database model for cluster lists"""
    __tablename__ = "cluster_lists"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    list_id: str = Field(default_factory=lambda: str(uuid4()), unique=True, index=True)
    title: str = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationship to clusters
    clusters: List[ClusterDB] = Relationship(back_populates="cluster_list")
