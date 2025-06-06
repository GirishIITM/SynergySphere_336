from typing import List, Dict, Any, Optional
from models import Budget, Expense, Project, User, Notification, Task
from extensions import db
from utils.datetime_utils import get_utc_now
from utils.email import send_email
from sqlalchemy import func, and_, extract
import logging
import numpy as np
from datetime import datetime, timedelta
from collections import defaultdict


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
    
    @staticmethod
    def get_budget_variance_analysis(user_id: int, project_id: int) -> Dict[str, Any]:
        """
        Get detailed budget variance analysis for a project.
        
        Args:
            user_id (int): User requesting the analysis
            project_id (int): Project ID
            
        Returns:
            Dict[str, Any]: Budget variance analysis
        """
        try:
            # Verify user is project member
            project = Project.query.get_or_404(project_id)
            is_member = any(member.id == user_id for member in project.members) or project.owner_id == user_id
            if not is_member:
                raise PermissionError("User is not a member of this project")
            
            budget = Budget.query.filter_by(project_id=project_id).first()
            expenses = Expense.query.filter_by(project_id=project_id).all()
            tasks = Task.query.filter_by(project_id=project_id).all()
            
            if not budget:
                return {
                    'has_budget': False,
                    'message': 'No budget defined for this project',
                    'budget_amount': 0,
                    'total_spent': 0,
                    'total_variance': 0,
                    'variance_percentage': 0,
                    'category_analysis': {},
                    'monthly_variance': [],
                    'cost_drivers': [],
                    'status': 'no_budget',
                    'recommendations': ['Create a budget for this project to enable variance analysis']
                }
            
            # Calculate actual vs planned by category
            category_analysis = {}
            
            # Get unique categories from expenses, handle None values
            unique_categories = set()
            for expense in expenses:
                category = expense.category if expense.category else 'General'
                unique_categories.add(category)
            
            if not unique_categories:
                unique_categories = {'General'}
            
            planned_per_category = budget.allocated_amount / len(unique_categories) if len(unique_categories) > 0 else 0
            
            for category in unique_categories:
                category_expenses = [e for e in expenses if (e.category or 'General') == category]
                actual_amount = sum(e.amount for e in category_expenses)
                
                variance = actual_amount - planned_per_category
                variance_percentage = ((actual_amount - planned_per_category) / planned_per_category * 100) if planned_per_category > 0 else 0
                
                category_analysis[category] = {
                    'planned': round(planned_per_category, 2),
                    'actual': round(actual_amount, 2),
                    'variance': round(variance, 2),
                    'variance_percentage': round(variance_percentage, 1),
                    'expense_count': len(category_expenses)
                }
            
            # Time-based variance analysis
            monthly_variance = []
            current_month = get_utc_now().replace(day=1)
            
            for i in range(6):  # Last 6 months
                month_start = current_month - timedelta(days=i*30)
                month_end = month_start + timedelta(days=30)
                
                month_expenses = [e for e in expenses if month_start <= e.incurred_at <= month_end]
                month_actual = sum(e.amount for e in month_expenses)
                month_planned = budget.allocated_amount / 12 if budget.allocated_amount > 0 else 0  # Assume monthly distribution
                
                variance = month_actual - month_planned
                variance_percentage = ((month_actual - month_planned) / month_planned * 100) if month_planned > 0 else 0
                
                monthly_variance.append({
                    'month': month_start.strftime('%Y-%m'),
                    'planned': round(month_planned, 2),
                    'actual': round(month_actual, 2),
                    'variance': round(variance, 2),
                    'variance_percentage': round(variance_percentage, 1)
                })
            
            monthly_variance.reverse()
            
            # Overall variance metrics
            total_spent = sum(e.amount for e in expenses)
            total_variance = total_spent - budget.allocated_amount
            variance_percentage = (total_variance / budget.allocated_amount * 100) if budget.allocated_amount > 0 else 0
            
            # Identify cost drivers
            cost_drivers = []
            for category, data in category_analysis.items():
                if abs(data['variance_percentage']) > 20:  # Significant variance
                    cost_drivers.append({
                        'category': category,
                        'variance': data['variance'],
                        'variance_percentage': data['variance_percentage'],
                        'impact': 'high' if abs(data['variance_percentage']) > 50 else 'medium'
                    })
            
            # Sort cost drivers by absolute variance
            cost_drivers.sort(key=lambda x: abs(x['variance']), reverse=True)
            
            return {
                'has_budget': True,
                'budget_amount': round(budget.allocated_amount, 2),
                'total_spent': round(total_spent, 2),
                'total_variance': round(total_variance, 2),
                'variance_percentage': round(variance_percentage, 1),
                'category_analysis': category_analysis,
                'monthly_variance': monthly_variance,
                'cost_drivers': cost_drivers,
                'status': FinanceService._get_variance_status(variance_percentage),
                'recommendations': FinanceService._generate_variance_recommendations(category_analysis, cost_drivers, variance_percentage)
            }
        except Exception as e:
            logger.error(f"Error in get_budget_variance_analysis for project {project_id}: {str(e)}")
            # Return a safe default response
            return {
                'has_budget': False,
                'message': f'Error analyzing budget variance: {str(e)}',
                'budget_amount': 0,
                'total_spent': 0,
                'total_variance': 0,
                'variance_percentage': 0,
                'category_analysis': {},
                'monthly_variance': [],
                'cost_drivers': [],
                'status': 'error',
                'recommendations': ['Please try again or contact support if the issue persists']
            }

    @staticmethod
    def get_expense_forecasting(user_id: int, project_id: int, forecast_months: int = 3) -> Dict[str, Any]:
        """
        Generate expense forecasting based on historical data.
        
        Args:
            user_id (int): User requesting the forecast
            project_id (int): Project ID
            forecast_months (int): Number of months to forecast
            
        Returns:
            Dict[str, Any]: Expense forecast analysis
        """
        try:
            # Verify user is project member
            project = Project.query.get_or_404(project_id)
            is_member = any(member.id == user_id for member in project.members) or project.owner_id == user_id
            if not is_member:
                raise PermissionError("User is not a member of this project")
            
            expenses = Expense.query.filter_by(project_id=project_id).all()
            budget = Budget.query.filter_by(project_id=project_id).first()
            
            if len(expenses) < 3:
                return {
                    'forecast_available': False,
                    'message': 'Insufficient historical data for forecasting (minimum 3 expenses required)',
                    'data_points': len(expenses),
                    'forecast_period_months': forecast_months,
                    'historical_data': {},
                    'forecast_data': [],
                    'total_forecast': 0,
                    'budget_impact': {},
                    'category_forecasts': {},
                    'recommendations': ['Add more expenses to enable forecasting']
                }
            
            # Group expenses by month
            monthly_expenses = defaultdict(float)
            category_monthly = defaultdict(lambda: defaultdict(float))
            
            for expense in expenses:
                month_key = expense.incurred_at.strftime('%Y-%m')
                monthly_expenses[month_key] += expense.amount
                category_monthly[expense.category or 'General'][month_key] += expense.amount
            
            # Calculate historical monthly average
            historical_months = list(monthly_expenses.keys())
            historical_amounts = list(monthly_expenses.values())
            
            if len(historical_amounts) < 2:
                avg_monthly = historical_amounts[0] if historical_amounts else 0
                trend_slope = 0
            else:
                avg_monthly = np.mean(historical_amounts)
                
                # Simple linear regression for trend
                x = list(range(len(historical_amounts)))
                y = historical_amounts
                
                n = len(x)
                sum_x = sum(x)
                sum_y = sum(y)
                sum_xy = sum(xi * yi for xi, yi in zip(x, y))
                sum_x2 = sum(xi * xi for xi in x)
                
                trend_slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x) if (n * sum_x2 - sum_x * sum_x) != 0 else 0
            
            # Generate forecast
            forecast_data = []
            current_month = get_utc_now().replace(day=1)
            
            for i in range(forecast_months):
                future_month = current_month + timedelta(days=i*30)
                predicted_amount = avg_monthly + (trend_slope * (len(historical_amounts) + i))
                predicted_amount = max(0, predicted_amount)  # Ensure non-negative
                
                forecast_data.append({
                    'month': future_month.strftime('%Y-%m'),
                    'predicted_amount': round(predicted_amount, 2),
                    'confidence': FinanceService._calculate_forecast_confidence(historical_amounts, trend_slope)
                })
            
            # Calculate total forecast and budget impact
            total_forecast = sum(month['predicted_amount'] for month in forecast_data)
            current_spent = sum(expense.amount for expense in expenses)
            projected_total = current_spent + total_forecast
            
            budget_impact = {}
            if budget:
                remaining_budget = budget.allocated_amount - current_spent
                budget_impact = {
                    'remaining_budget': remaining_budget,
                    'forecast_vs_remaining': total_forecast - remaining_budget,
                    'will_exceed_budget': total_forecast > remaining_budget,
                    'projected_total_spending': projected_total,
                    'projected_budget_utilization': (projected_total / budget.allocated_amount * 100) if budget.allocated_amount > 0 else 0
                }
            
            # Category-wise forecasting
            category_forecasts = {}
            for category, month_data in category_monthly.items():
                amounts = list(month_data.values())
                if amounts:
                    cat_avg = np.mean(amounts)
                    category_forecasts[category] = {
                        'monthly_average': round(cat_avg, 2),
                        'forecast_total': round(cat_avg * forecast_months, 2)
                    }
            
            return {
                'forecast_available': True,
                'forecast_period_months': forecast_months,
                'historical_data': {
                    'months_analyzed': len(historical_amounts),
                    'average_monthly_spending': round(avg_monthly, 2),
                    'trend_direction': 'increasing' if trend_slope > 5 else 'decreasing' if trend_slope < -5 else 'stable',
                    'trend_rate': round(trend_slope, 2)
                },
                'forecast_data': forecast_data,
                'total_forecast': round(total_forecast, 2),
                'budget_impact': budget_impact,
                'category_forecasts': category_forecasts,
                'recommendations': FinanceService._generate_forecast_recommendations(forecast_data, budget_impact, trend_slope)
            }
        except Exception as e:
            logger.error(f"Error in get_expense_forecasting for project {project_id}: {str(e)}")
            return {
                'forecast_available': False,
                'message': f'Error generating expense forecast: {str(e)}',
                'data_points': 0,
                'forecast_period_months': forecast_months,
                'historical_data': {},
                'forecast_data': [],
                'total_forecast': 0,
                'budget_impact': {},
                'category_forecasts': {},
                'recommendations': ['Please try again or contact support if the issue persists']
            }

    @staticmethod
    def get_cost_optimization_analysis(user_id: int, project_id: int) -> Dict[str, Any]:
        """
        Analyze expenses for cost optimization opportunities.
        
        Args:
            user_id (int): User requesting the analysis
            project_id (int): Project ID
            
        Returns:
            Dict[str, Any]: Cost optimization analysis
        """
        try:
            # Verify user is project member
            project = Project.query.get_or_404(project_id)
            is_member = any(member.id == user_id for member in project.members) or project.owner_id == user_id
            if not is_member:
                raise PermissionError("User is not a member of this project")
            
            expenses = Expense.query.filter_by(project_id=project_id).all()
            
            if not expenses:
                return {
                    'has_expenses': False,
                    'message': 'No expenses found for analysis',
                    'total_spending': 0,
                    'category_breakdown': {},
                    'optimization_opportunities': [],
                    'cost_efficiency': {},
                    'potential_total_savings': 0,
                    'recommendations': ['Start tracking expenses to enable cost optimization analysis']
                }
        
        # Category analysis
        category_totals = defaultdict(float)
        category_counts = defaultdict(int)
        category_avg = defaultdict(float)
        
        for expense in expenses:
            category = expense.category or 'General'
            category_totals[category] += expense.amount
            category_counts[category] += 1
        
        for category in category_totals:
            category_avg[category] = category_totals[category] / category_counts[category]
        
        # Identify optimization opportunities
        optimization_opportunities = []
        
        # High-cost categories
        total_spending = sum(category_totals.values())
        for category, amount in category_totals.items():
            percentage = (amount / total_spending * 100) if total_spending > 0 else 0
            
            if percentage > 30:  # Category represents more than 30% of total spending
                optimization_opportunities.append({
                    'type': 'high_cost_category',
                    'category': category,
                    'amount': amount,
                    'percentage': round(percentage, 1),
                    'description': f'{category} represents {percentage:.1f}% of total spending',
                    'potential_savings': round(amount * 0.1, 2),  # Assume 10% potential savings
                    'priority': 'high' if percentage > 50 else 'medium'
                })
        
        # Frequent small expenses (potential for bundling)
        for category, count in category_counts.items():
            avg_amount = category_avg[category]
            if count > 10 and avg_amount < 100:  # Many small expenses
                optimization_opportunities.append({
                    'type': 'frequent_small_expenses',
                    'category': category,
                    'count': count,
                    'average_amount': round(avg_amount, 2),
                    'description': f'{count} small expenses in {category} (avg: ₹{avg_amount:.2f})',
                    'potential_savings': round(count * avg_amount * 0.05, 2),  # 5% savings through bundling
                    'priority': 'low'
                })
        
        # Unusual spending patterns
        monthly_spending = defaultdict(float)
        for expense in expenses:
            month = expense.incurred_at.strftime('%Y-%m')
            monthly_spending[month] += expense.amount
        
        if len(monthly_spending) >= 3:
            amounts = list(monthly_spending.values())
            mean_monthly = np.mean(amounts)
            std_monthly = np.std(amounts)
            
            for month, amount in monthly_spending.items():
                if amount > mean_monthly + (2 * std_monthly):  # Outlier detection
                    optimization_opportunities.append({
                        'type': 'spending_spike',
                        'month': month,
                        'amount': amount,
                        'average_monthly': round(mean_monthly, 2),
                        'description': f'Spending spike in {month}: ₹{amount:.2f} vs avg ₹{mean_monthly:.2f}',
                        'potential_savings': round(amount - mean_monthly, 2),
                        'priority': 'medium'
                    })
        
        # Cost per task analysis
        tasks = Task.query.filter_by(project_id=project_id).all()
        completed_tasks = [t for t in tasks if t.status and hasattr(t.status, 'value') and t.status.value == 'completed']
        
        cost_efficiency = {}
        if completed_tasks:
            cost_per_task = total_spending / len(completed_tasks)
            cost_efficiency = {
                'cost_per_completed_task': round(cost_per_task, 2),
                'total_completed_tasks': len(completed_tasks),
                'efficiency_rating': 'excellent' if cost_per_task < 1000 else 'good' if cost_per_task < 5000 else 'needs_improvement'
            }
        
        # Generate recommendations
        recommendations = FinanceService._generate_cost_optimization_recommendations(
            optimization_opportunities, category_totals, cost_efficiency
        )
        
        return {
            'has_expenses': True,
            'total_spending': round(total_spending, 2),
            'category_breakdown': {k: round(v, 2) for k, v in category_totals.items()},
            'optimization_opportunities': sorted(optimization_opportunities, 
                                               key=lambda x: x.get('potential_savings', 0), reverse=True),
            'cost_efficiency': cost_efficiency,
            'potential_total_savings': round(sum(opp.get('potential_savings', 0) for opp in optimization_opportunities), 2),
            'recommendations': recommendations
        }
        except Exception as e:
            logger.error(f"Error in get_cost_optimization_analysis for project {project_id}: {str(e)}")
            return {
                'has_expenses': False,
                'message': f'Error analyzing cost optimization: {str(e)}',
                'total_spending': 0,
                'category_breakdown': {},
                'optimization_opportunities': [],
                'cost_efficiency': {},
                'potential_total_savings': 0,
                'recommendations': ['Please try again or contact support if the issue persists']
            }

    @staticmethod
    def _get_variance_status(variance_percentage: float) -> str:
        """Determine variance status based on percentage."""
        if abs(variance_percentage) <= 5:
            return 'on_track'
        elif abs(variance_percentage) <= 15:
            return 'minor_variance'
        elif abs(variance_percentage) <= 30:
            return 'significant_variance'
        else:
            return 'critical_variance'

    @staticmethod
    def _calculate_forecast_confidence(historical_amounts: List[float], trend_slope: float) -> str:
        """Calculate confidence level for forecasting."""
        if len(historical_amounts) < 3:
            return 'low'
        
        variance = np.var(historical_amounts)
        mean_amount = np.mean(historical_amounts)
        
        # Coefficient of variation
        cv = (np.sqrt(variance) / mean_amount) if mean_amount > 0 else 0
        
        if cv < 0.2 and abs(trend_slope) < mean_amount * 0.1:
            return 'high'
        elif cv < 0.5:
            return 'medium'
        else:
            return 'low'

    @staticmethod
    def _generate_variance_recommendations(category_analysis: Dict, cost_drivers: List[Dict], variance_percentage: float) -> List[str]:
        """Generate recommendations based on variance analysis."""
        recommendations = []
        
        if abs(variance_percentage) > 20:
            recommendations.append("🚨 Significant budget variance detected - immediate review required")
        
        for driver in cost_drivers[:3]:  # Top 3 cost drivers
            if driver['variance'] > 0:
                recommendations.append(f"💰 Monitor {driver['category']} spending - {abs(driver['variance_percentage']):.1f}% over plan")
            else:
                recommendations.append(f"💡 {driver['category']} under budget - consider reallocating funds")
        
        if variance_percentage > 10:
            recommendations.append("📊 Implement weekly budget reviews and approval processes")
            recommendations.append("🔍 Analyze each expense against project value and necessity")
        
        if not recommendations:
            recommendations.append("✅ Budget variance within acceptable range - maintain current controls")
        
        return recommendations

    @staticmethod
    def _generate_forecast_recommendations(forecast_data: List[Dict], budget_impact: Dict, trend_slope: float) -> List[str]:
        """Generate recommendations based on expense forecasting."""
        recommendations = []
        
        if budget_impact.get('will_exceed_budget'):
            overage = budget_impact.get('forecast_vs_remaining', 0)
            recommendations.append(f"⚠️ Projected to exceed budget by ₹{overage:.2f}")
            recommendations.append("💡 Consider reducing discretionary expenses or increasing budget")
        
        if trend_slope > 100:  # Increasing trend
            recommendations.append("📈 Expenses trending upward - review spending drivers")
            recommendations.append("🔒 Implement stricter expense approval thresholds")
        elif trend_slope < -50:  # Decreasing trend
            recommendations.append("📉 Expenses trending downward - good cost control")
        
        avg_confidence = np.mean([1 if f['confidence'] == 'high' else 0.6 if f['confidence'] == 'medium' else 0.3 
                                for f in forecast_data])
        
        if avg_confidence < 0.5:
            recommendations.append("📊 Forecast confidence is low - establish more consistent spending patterns")
        
        return recommendations

    @staticmethod
    def _generate_cost_optimization_recommendations(opportunities: List[Dict], category_totals: Dict, cost_efficiency: Dict) -> List[str]:
        """Generate cost optimization recommendations."""
        recommendations = []
        
        if opportunities:
            high_priority = [opp for opp in opportunities if opp.get('priority') == 'high']
            if high_priority:
                recommendations.append("🎯 Focus on high-priority optimization opportunities first")
            
            total_potential = sum(opp.get('potential_savings', 0) for opp in opportunities)
            if total_potential > 1000:
                recommendations.append(f"💰 Potential savings of ₹{total_potential:.2f} identified")
        
        # Category-specific recommendations
        largest_category = max(category_totals.items(), key=lambda x: x[1])
        if largest_category[1] > sum(category_totals.values()) * 0.4:
            recommendations.append(f"🔍 {largest_category[0]} is largest expense category - review for optimization")
        
        if cost_efficiency.get('efficiency_rating') == 'needs_improvement':
            recommendations.append("⚡ Cost per task is high - review task complexity and resource allocation")
        
        recommendations.append("📋 Regular expense audits and vendor negotiations recommended")
        
        return recommendations 