from typing import List, Dict, Any, Optional
from models import Budget, Expense, Project, User, Notification
from extensions import db
from utils.datetime_utils import get_utc_now
from utils.email import send_email
from sqlalchemy import func, and_, extract
import logging


logger = logging.getLogger(__name__)


class FinanceService:
    """Service for managing project budgets and expenses."""
    
    @staticmethod
    def create_budget(user_id: int, project_id: int, data: Dict[str, Any]) -> Budget:
        """
        Create a new budget for a project.
        
        Args:
            user_id (int): User creating the budget
            project_id (int): Project ID
            data (Dict[str, Any]): Budget data
            
        Returns:
            Budget: Created budget object
        """
        # Verify user is project member
        project = Project.query.get_or_404(project_id)
        if not any(member.id == user_id for member in project.members):
            raise PermissionError("User is not a member of this project")
        
        # Check if budget already exists for this project
        existing_budget = Budget.query.filter_by(project_id=project_id).first()
        if existing_budget:
            raise ValueError("Budget already exists for this project")
        
        budget = Budget(
            project_id=project_id,
            allocated_amount=float(data.get('allocated_amount', 0)),
            currency=data.get('currency', 'USD')
        )
        
        db.session.add(budget)
        db.session.commit()
        
        return budget
    
    @staticmethod
    def update_budget(user_id: int, budget_id: int, data: Dict[str, Any]) -> Budget:
        """
        Update an existing budget.
        
        Args:
            user_id (int): User updating the budget
            budget_id (int): Budget ID
            data (Dict[str, Any]): Updated budget data
            
        Returns:
            Budget: Updated budget object
        """
        budget = Budget.query.get_or_404(budget_id)
        
        # Verify user is project member
        if not any(member.id == user_id for member in budget.project.members):
            raise PermissionError("User is not a member of this project")
        
        if 'allocated_amount' in data:
            budget.allocated_amount = float(data['allocated_amount'])
        if 'currency' in data:
            budget.currency = data['currency']
        
        db.session.commit()
        return budget
    
    @staticmethod
    def delete_budget(user_id: int, budget_id: int) -> bool:
        """
        Delete a budget.
        
        Args:
            user_id (int): User deleting the budget
            budget_id (int): Budget ID
            
        Returns:
            bool: True if deleted successfully
        """
        budget = Budget.query.get_or_404(budget_id)
        
        # Verify user is project member
        if not any(member.id == user_id for member in budget.project.members):
            raise PermissionError("User is not a member of this project")
        
        db.session.delete(budget)
        db.session.commit()
        return True
    
    @staticmethod
    def add_expense(user_id: int, project_id: int, data: Dict[str, Any]) -> Expense:
        """
        Add a new expense to a project.
        
        Args:
            user_id (int): User adding the expense
            project_id (int): Project ID
            data (Dict[str, Any]): Expense data
            
        Returns:
            Expense: Created expense object
        """
        # Verify user is project member
        project = Project.query.get_or_404(project_id)
        if not any(member.id == user_id for member in project.members):
            raise PermissionError("User is not a member of this project")
        
        expense = Expense(
            project_id=project_id,
            task_id=data.get('task_id'),
            amount=float(data.get('amount', 0)),
            description=data.get('description', ''),
            category=data.get('category', 'General'),
            created_by=user_id
        )
        
        db.session.add(expense)
        
        # Update budget spent amount
        budget = Budget.query.filter_by(project_id=project_id).first()
        if budget:
            budget.spent_amount += expense.amount
            
            # Check for budget overrun and create notification
            if budget.spent_amount > budget.allocated_amount:
                FinanceService._create_budget_overrun_notification(project, budget, user_id)
        
        db.session.commit()
        return expense
    
    @staticmethod
    def _create_budget_overrun_notification(project: Project, budget: Budget, user_id: int):
        """
        Create notification for budget overrun.
        
        Args:
            project (Project): Project with budget overrun
            budget (Budget): Budget object
            user_id (int): User who added the expense
        """
        overrun_amount = budget.spent_amount - budget.allocated_amount
        overrun_percentage = (overrun_amount / budget.allocated_amount) * 100
        
        message = (f"⚠️ Budget overrun in project '{project.name}'! "
                  f"Overspent by {budget.currency} {overrun_amount:.2f} "
                  f"({overrun_percentage:.1f}% over budget)")
        
        # Notify all project members
        for member in project.members:
            notification = Notification(
                user_id=member.id,
                message=message
            )
            db.session.add(notification)
            
            # Send email if enabled
            if hasattr(member, 'notify_email') and member.notify_email:
                try:
                    send_email(
                        f"Budget Overrun Alert - {project.name}",
                        [member.email],
                        "",
                        message
                    )
                except Exception as e:
                    logger.error(f"Failed to send budget overrun email to {member.email}: {str(e)}")
    
    @staticmethod
    def get_project_financials(user_id: int, project_id: int) -> Dict[str, Any]:
        """
        Get financial summary for a project.
        
        Args:
            user_id (int): User requesting the data
            project_id (int): Project ID
            
        Returns:
            Dict[str, Any]: Financial summary
        """
        # Verify user is project member
        project = Project.query.get_or_404(project_id)
        if not any(member.id == user_id for member in project.members):
            raise PermissionError("User is not a member of this project")
        
        budget = Budget.query.filter_by(project_id=project_id).first()
        expenses = Expense.query.filter_by(project_id=project_id).all()
        
        # Calculate total expenses
        total_expenses = sum(expense.amount for expense in expenses)
        
        # Group expenses by category
        category_totals = {}
        for expense in expenses:
            category = expense.category or 'Uncategorized'
            category_totals[category] = category_totals.get(category, 0) + expense.amount
        
        # Monthly expense breakdown
        monthly_expenses = db.session.query(
            func.extract('year', Expense.incurred_at).label('year'),
            func.extract('month', Expense.incurred_at).label('month'),
            func.sum(Expense.amount).label('total')
        ).filter_by(project_id=project_id).group_by(
            func.extract('year', Expense.incurred_at),
            func.extract('month', Expense.incurred_at)
        ).all()
        
        monthly_data = [
            {
                'month': f"{int(item.year)}-{int(item.month):02d}",
                'amount': float(item.total)
            }
            for item in monthly_expenses
        ]
        
        result = {
            'project_id': project_id,
            'project_name': project.name,
            'budget': budget.to_dict() if budget else None,
            'total_expenses': total_expenses,
            'expenses_by_category': category_totals,
            'monthly_expenses': monthly_data,
            'recent_expenses': [expense.to_dict() for expense in expenses[-10:]],  # Last 10 expenses
            'expenses_count': len(expenses)
        }
        
        # Add budget analysis if budget exists
        if budget:
            result['remaining_budget'] = budget.remaining_amount
            result['budget_utilization'] = budget.utilization_percentage
            result['is_over_budget'] = budget.spent_amount > budget.allocated_amount
        
        return result
    
    @staticmethod
    def get_expenses(user_id: int, project_id: int, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Get expenses for a project with optional filters.
        
        Args:
            user_id (int): User requesting the data
            project_id (int): Project ID
            filters (Optional[Dict[str, Any]]): Optional filters
            
        Returns:
            List[Dict[str, Any]]: List of expenses
        """
        # Verify user is project member
        project = Project.query.get_or_404(project_id)
        if not any(member.id == user_id for member in project.members):
            raise PermissionError("User is not a member of this project")
        
        query = Expense.query.filter_by(project_id=project_id)
        
        # Apply filters if provided
        if filters:
            if 'category' in filters:
                query = query.filter(Expense.category == filters['category'])
            if 'task_id' in filters:
                query = query.filter(Expense.task_id == filters['task_id'])
            if 'date_from' in filters:
                query = query.filter(Expense.incurred_at >= filters['date_from'])
            if 'date_to' in filters:
                query = query.filter(Expense.incurred_at <= filters['date_to'])
        
        expenses = query.order_by(Expense.incurred_at.desc()).all()
        return [expense.to_dict() for expense in expenses]
    
    @staticmethod
    def update_expense(user_id: int, expense_id: int, data: Dict[str, Any]) -> Expense:
        """
        Update an existing expense.
        
        Args:
            user_id (int): User updating the expense
            expense_id (int): Expense ID
            data (Dict[str, Any]): Updated expense data
            
        Returns:
            Expense: Updated expense object
        """
        expense = Expense.query.get_or_404(expense_id)
        
        # Verify user is project member
        if not any(member.id == user_id for member in expense.project.members):
            raise PermissionError("User is not a member of this project")
        
        # Store old amount for budget adjustment
        old_amount = expense.amount
        
        # Update expense fields
        if 'amount' in data:
            expense.amount = float(data['amount'])
        if 'description' in data:
            expense.description = data['description']
        if 'category' in data:
            expense.category = data['category']
        if 'task_id' in data:
            expense.task_id = data['task_id']
        
        # Update budget spent amount
        budget = Budget.query.filter_by(project_id=expense.project_id).first()
        if budget:
            amount_difference = expense.amount - old_amount
            budget.spent_amount += amount_difference
        
        db.session.commit()
        return expense
    
    @staticmethod
    def delete_expense(user_id: int, expense_id: int) -> bool:
        """
        Delete an expense.
        
        Args:
            user_id (int): User deleting the expense
            expense_id (int): Expense ID
            
        Returns:
            bool: True if deleted successfully
        """
        expense = Expense.query.get_or_404(expense_id)
        
        # Verify user is project member
        if not any(member.id == user_id for member in expense.project.members):
            raise PermissionError("User is not a member of this project")
        
        # Update budget spent amount
        budget = Budget.query.filter_by(project_id=expense.project_id).first()
        if budget:
            budget.spent_amount -= expense.amount
        
        db.session.delete(expense)
        db.session.commit()
        return True 