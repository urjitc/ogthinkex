from sqlmodel import Session, select
from typing import List, Optional
from models.database_models import ClusterListDB, ClusterDB, QAPairDB
from models.api_models import ClusterList, Cluster, QAPair, ClusterListInfo


class DatabaseService:
    """Service layer for database operations"""
    
    def __init__(self, session: Session):
        self.session = session
    
    # ClusterList operations
    def create_cluster_list(self, title: str) -> ClusterListDB:
        """Create a new cluster list"""
        cluster_list = ClusterListDB(title=title)
        self.session.add(cluster_list)
        self.session.commit()
        self.session.refresh(cluster_list)
        return cluster_list
    
    def get_cluster_list_by_id(self, list_id: str) -> Optional[ClusterListDB]:
        """Get cluster list by ID"""
        statement = select(ClusterListDB).where(ClusterListDB.list_id == list_id)
        return self.session.exec(statement).first()
    
    def get_all_cluster_lists(self) -> List[ClusterListDB]:
        """Get all cluster lists"""
        statement = select(ClusterListDB)
        return list(self.session.exec(statement).all())
    
    def get_cluster_list_info(self) -> List[ClusterListInfo]:
        """Get cluster list info (id and title only)"""
        cluster_lists = self.get_all_cluster_lists()
        return [ClusterListInfo(id=cl.list_id, title=cl.title) for cl in cluster_lists]
    
    # Cluster operations
    def create_cluster(self, cluster_list_id: int, title: str) -> ClusterDB:
        """Create a new cluster"""
        cluster = ClusterDB(title=title, cluster_list_id=cluster_list_id)
        self.session.add(cluster)
        self.session.commit()
        self.session.refresh(cluster)
        return cluster
    
    def get_cluster_by_title(self, cluster_list_uuid: str, title: str) -> Optional[ClusterDB]:
        """Get cluster by title (case insensitive)"""
        # First get the cluster list by its UUID to get the integer ID
        cluster_list = self.session.exec(
            select(ClusterListDB).where(ClusterListDB.list_id == cluster_list_uuid)
        ).first()
        if not cluster_list:
            return None
            
        # Then find the cluster by title and the integer cluster_list_id
        statement = select(ClusterDB).where(
            ClusterDB.cluster_list_id == cluster_list.id,
            ClusterDB.title.ilike(title.strip())
        )
        return self.session.exec(statement).first()
    
    def delete_cluster(self, cluster: ClusterDB) -> None:
        """Delete a cluster and all its QAs"""
        self.session.delete(cluster)
        self.session.commit()
    
    # QAPair operations
    def create_qa_pair(self, cluster_id: int, question: str, answer: str) -> QAPairDB:
        """Create a new Q&A pair"""
        qa_pair = QAPairDB(
            question=question.strip(),
            answer=answer.strip(),
            cluster_id=cluster_id
        )
        self.session.add(qa_pair)
        self.session.commit()
        self.session.refresh(qa_pair)
        return qa_pair
    
    def get_qa_pair_by_id(self, qa_id: str) -> Optional[QAPairDB]:
        """Get Q&A pair by ID"""
        statement = select(QAPairDB).where(QAPairDB.qa_id == qa_id)
        return self.session.exec(statement).first()
    
    def update_qa_pair(self, qa_pair: QAPairDB, question: Optional[str] = None, answer: Optional[str] = None) -> QAPairDB:
        """Update a Q&A pair"""
        if question is not None and question.strip():
            qa_pair.question = question.strip()
        if answer is not None and answer.strip():
            qa_pair.answer = answer.strip()
        
        self.session.add(qa_pair)
        self.session.commit()
        self.session.refresh(qa_pair)
        return qa_pair
    
    def move_qa_pair(self, qa_pair: QAPairDB, new_cluster: ClusterDB) -> QAPairDB:
        """Move Q&A pair to a different cluster"""
        qa_pair.cluster_id = new_cluster.id
        self.session.add(qa_pair)
        self.session.commit()
        self.session.refresh(qa_pair)
        return qa_pair
    
    def delete_qa_pair(self, qa_pair: QAPairDB) -> None:
        """Delete a Q&A pair"""
        self.session.delete(qa_pair)
        self.session.commit()
    
    def reorder_qa_pairs(self, cluster: ClusterDB, ordered_qa_ids: List[str]) -> None:
        """Reorder Q&A pairs in a cluster"""
        # For now, we'll implement this by updating a position field if needed
        # Since SQLModel doesn't have built-in ordering, we could add a position field
        # For this implementation, we'll rely on the frontend to handle ordering
        pass
    
    # Conversion methods
    def convert_to_api_cluster_list(self, db_cluster_list: ClusterListDB) -> ClusterList:
        """Convert database cluster list to API model"""
        clusters = []
        for db_cluster in db_cluster_list.clusters:
            qas = []
            for db_qa in db_cluster.qas:
                qa = QAPair(
                    _id=db_qa.qa_id,
                    qa_id=db_qa.qa_id,
                    question=db_qa.question,
                    answer=db_qa.answer,
                    created_at=db_qa.created_at.isoformat() + "Z"
                )
                qas.append(qa)
            
            cluster = Cluster(title=db_cluster.title, qas=qas)
            clusters.append(cluster)
        
        return ClusterList(
            id=db_cluster_list.list_id,
            title=db_cluster_list.title,
            clusters=clusters
        )
    
    def convert_to_api_cluster(self, db_cluster: ClusterDB) -> Cluster:
        """Convert database cluster to API model"""
        qas = []
        for db_qa in db_cluster.qas:
            qa = QAPair(
                _id=db_qa.qa_id,
                qa_id=db_qa.qa_id,
                question=db_qa.question,
                answer=db_qa.answer,
                created_at=db_qa.created_at.isoformat() + "Z"
            )
            qas.append(qa)
        
        return Cluster(title=db_cluster.title, qas=qas)
    
    def convert_to_api_qa_pair(self, db_qa: QAPairDB) -> QAPair:
        """Convert database Q&A pair to API model"""
        return QAPair(
            _id=db_qa.qa_id,
            qa_id=db_qa.qa_id,
            question=db_qa.question,
            answer=db_qa.answer,
            created_at=db_qa.created_at.isoformat() + "Z"
        )
