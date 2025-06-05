from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Budget, Expense
from extensions import db
from services.finance_service import FinanceService

finance_bp = Blueprint('finance', __name__)

@finance_bp.route('/projects/<int:project_id>/budget', methods=['POST'])
@jwt_required()
def create_budget(project_id):
    """Create a new budget for a project."""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    if not data or 'allocated_amount' not in data:
        return jsonify({'msg': 'Allocated amount is required'}), 400
    
    try:
        budget = FinanceService.create_budget(user_id, project_id, data)
        return jsonify(budget.to_dict()), 201
    except PermissionError as e:
        return jsonify({'msg': str(e)}), 403
    except ValueError as e:
        return jsonify({'msg': str(e)}), 400
    except Exception as e:
        return jsonify({'msg': 'Error creating budget'}), 500

@finance_bp.route('/budgets/<int:budget_id>', methods=['PUT'])
@jwt_required()
def update_budget(budget_id):
    """Update an existing budget."""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    if not data:
        return jsonify({'msg': 'No data provided'}), 400
    
    try:
        budget = FinanceService.update_budget(user_id, budget_id, data)
        return jsonify(budget.to_dict()), 200
    except PermissionError as e:
        return jsonify({'msg': str(e)}), 403
    except Exception as e:
        return jsonify({'msg': 'Error updating budget'}), 500

@finance_bp.route('/budgets/<int:budget_id>', methods=['DELETE'])
@jwt_required()
def delete_budget(budget_id):
    """Delete a budget."""
    user_id = int(get_jwt_identity())
    
    try:
        success = FinanceService.delete_budget(user_id, budget_id)
        if success:
            return jsonify({'msg': 'Budget deleted'}), 200
        else:
            return jsonify({'msg': 'Failed to delete budget'}), 400
    except PermissionError as e:
        return jsonify({'msg': str(e)}), 403
    except Exception as e:
        return jsonify({'msg': 'Error deleting budget'}), 500

@finance_bp.route('/projects/<int:project_id>/expenses', methods=['POST'])
@jwt_required()
def add_expense(project_id):
    """Add a new expense to a project."""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    if not data or 'amount' not in data:
        return jsonify({'msg': 'Amount is required'}), 400
    
    try:
        expense = FinanceService.add_expense(user_id, project_id, data)
        return jsonify(expense.to_dict()), 201
    except PermissionError as e:
        return jsonify({'msg': str(e)}), 403
    except ValueError as e:
        return jsonify({'msg': str(e)}), 400
    except Exception as e:
        return jsonify({'msg': 'Error adding expense'}), 500

@finance_bp.route('/expenses/<int:expense_id>', methods=['PUT'])
@jwt_required()
def update_expense(expense_id):
    """Update an existing expense."""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    if not data:
        return jsonify({'msg': 'No data provided'}), 400
    
    try:
        expense = FinanceService.update_expense(user_id, expense_id, data)
        return jsonify(expense.to_dict()), 200
    except PermissionError as e:
        return jsonify({'msg': str(e)}), 403
    except ValueError as e:
        return jsonify({'msg': str(e)}), 400
    except Exception as e:
        return jsonify({'msg': 'Error updating expense'}), 500

@finance_bp.route('/expenses/<int:expense_id>', methods=['DELETE'])
@jwt_required()
def delete_expense(expense_id):
    """Delete an expense."""
    user_id = int(get_jwt_identity())
    
    try:
        success = FinanceService.delete_expense(user_id, expense_id)
        if success:
            return jsonify({'msg': 'Expense deleted'}), 200
        else:
            return jsonify({'msg': 'Failed to delete expense'}), 400
    except PermissionError as e:
        return jsonify({'msg': str(e)}), 403
    except Exception as e:
        return jsonify({'msg': 'Error deleting expense'}), 500

@finance_bp.route('/projects/<int:project_id>/expenses', methods=['GET'])
@jwt_required()
def get_expenses(project_id):
    """Get expenses for a project with optional filters."""
    user_id = int(get_jwt_identity())
    
    # Parse query parameters for filters
    filters = {}
    if request.args.get('category'):
        filters['category'] = request.args.get('category')
    if request.args.get('task_id'):
        filters['task_id'] = int(request.args.get('task_id'))
    if request.args.get('date_from'):
        filters['date_from'] = request.args.get('date_from')
    if request.args.get('date_to'):
        filters['date_to'] = request.args.get('date_to')
    
    try:
        expenses = FinanceService.get_expenses(user_id, project_id, filters)
        return jsonify(expenses), 200
    except PermissionError as e:
        return jsonify({'msg': str(e)}), 403
    except Exception as e:
        return jsonify({'msg': 'Error fetching expenses'}), 500

@finance_bp.route('/projects/<int:project_id>/financials', methods=['GET'])
@jwt_required()
def get_project_financials(project_id):
    """Get financial summary for a project."""
    user_id = int(get_jwt_identity())
    
    try:
        financials = FinanceService.get_project_financials(user_id, project_id)
        return jsonify(financials), 200
    except PermissionError as e:
        return jsonify({'msg': str(e)}), 403
    except Exception as e:
        return jsonify({'msg': 'Error fetching project financials'}), 500

@finance_bp.route('/projects/<int:project_id>/budget-variance', methods=['GET'])
@jwt_required()
def get_budget_variance_analysis(project_id):
    """Get detailed budget variance analysis for a project."""
    user_id = int(get_jwt_identity())
    
    try:
        variance_data = FinanceService.get_budget_variance_analysis(user_id, project_id)
        return jsonify(variance_data), 200
    except PermissionError as e:
        return jsonify({'msg': str(e)}), 403
    except Exception as e:
        return jsonify({'msg': 'Error fetching budget variance analysis'}), 500

@finance_bp.route('/projects/<int:project_id>/expense-forecast', methods=['GET'])
@jwt_required()
def get_expense_forecasting(project_id):
    """Get expense forecasting for a project."""
    user_id = int(get_jwt_identity())
    forecast_months = request.args.get('months', 3, type=int)
    
    # Validate forecast months
    if forecast_months not in [1, 2, 3, 6, 12]:
        forecast_months = 3
    
    try:
        forecast_data = FinanceService.get_expense_forecasting(user_id, project_id, forecast_months)
        return jsonify(forecast_data), 200
    except PermissionError as e:
        return jsonify({'msg': str(e)}), 403
    except Exception as e:
        return jsonify({'msg': 'Error fetching expense forecast'}), 500

@finance_bp.route('/projects/<int:project_id>/cost-optimization', methods=['GET'])
@jwt_required()
def get_cost_optimization_analysis(project_id):
    """Get cost optimization analysis for a project."""
    user_id = int(get_jwt_identity())
    
    try:
        optimization_data = FinanceService.get_cost_optimization_analysis(user_id, project_id)
        return jsonify(optimization_data), 200
    except PermissionError as e:
        return jsonify({'msg': str(e)}), 403
    except Exception as e:
        return jsonify({'msg': 'Error fetching cost optimization analysis'}), 500

@finance_bp.route('/tasks/<int:task_id>/financial-summary', methods=['GET'])
@jwt_required()
def get_task_financial_summary(task_id):
    """Get financial summary for a specific task."""
    user_id = int(get_jwt_identity())
    
    try:
        # Get task and verify permissions
        from models import Task
        task = Task.query.get_or_404(task_id)
        project = task.project
        
        # Check if user is project member or task owner
        is_member = any(member.id == user_id for member in project.members) or project.owner_id == user_id
        if not is_member and task.owner_id != user_id:
            return jsonify({'msg': 'Access denied'}), 403
        
        # Get task expenses
        task_expenses = Expense.query.filter_by(task_id=task_id).all()
        
        # Calculate financial metrics
        total_expenses = sum(expense.amount for expense in task_expenses)
        expense_categories = {}
        
        for expense in task_expenses:
            category = expense.category or 'General'
            if category not in expense_categories:
                expense_categories[category] = {'amount': 0, 'count': 0}
            expense_categories[category]['amount'] += expense.amount
            expense_categories[category]['count'] += 1
        
        # Timeline analysis
        monthly_expenses = {}
        for expense in task_expenses:
            month = expense.incurred_at.strftime('%Y-%m')
            if month not in monthly_expenses:
                monthly_expenses[month] = 0
            monthly_expenses[month] += expense.amount
        
        # Calculate average expense
        avg_expense = total_expenses / len(task_expenses) if task_expenses else 0
        
        # Get project budget context
        project_budget = Budget.query.filter_by(project_id=task.project_id).first()
        budget_context = {}
        
        if project_budget:
            project_total_expenses = sum(e.amount for e in Expense.query.filter_by(project_id=task.project_id).all())
            task_budget_percentage = (total_expenses / project_total_expenses * 100) if project_total_expenses > 0 else 0
            
            budget_context = {
                'project_budget': project_budget.allocated_amount,
                'project_spent': project_total_expenses,
                'task_percentage_of_project': round(task_budget_percentage, 1),
                'task_vs_project_budget': round((total_expenses / project_budget.allocated_amount * 100), 2) if project_budget.allocated_amount > 0 else 0
            }
        
        return jsonify({
            'task_id': task_id,
            'task_title': task.title,
            'financial_summary': {
                'total_expenses': round(total_expenses, 2),
                'expense_count': len(task_expenses),
                'average_expense': round(avg_expense, 2),
                'expense_categories': {k: round(v['amount'], 2) for k, v in expense_categories.items()},
                'category_breakdown': expense_categories
            },
            'timeline': {
                'monthly_expenses': {k: round(v, 2) for k, v in monthly_expenses.items()},
                'expense_trend': _calculate_expense_trend(monthly_expenses)
            },
            'budget_context': budget_context,
            'insights': _generate_task_financial_insights(task, total_expenses, expense_categories, budget_context)
        }), 200
        
    except Exception as e:
        return jsonify({'msg': 'Error fetching task financial summary'}), 500

def _calculate_expense_trend(monthly_expenses: dict) -> str:
    """Calculate the expense trend for a task."""
    if len(monthly_expenses) < 2:
        return 'insufficient_data'
    
    months = sorted(monthly_expenses.keys())
    amounts = [monthly_expenses[month] for month in months]
    
    # Simple trend calculation
    recent_months = amounts[-2:]  # Last 2 months
    earlier_months = amounts[:-2] if len(amounts) > 2 else []
    
    if not earlier_months:
        return 'stable'
    
    recent_avg = sum(recent_months) / len(recent_months)
    earlier_avg = sum(earlier_months) / len(earlier_months)
    
    if recent_avg > earlier_avg * 1.2:
        return 'increasing'
    elif recent_avg < earlier_avg * 0.8:
        return 'decreasing'
    else:
        return 'stable'

def _generate_task_financial_insights(task, total_expenses: float, expense_categories: dict, budget_context: dict) -> list:
    """Generate financial insights for a task."""
    insights = []
    
    # Expense level insights
    if total_expenses > 5000:
        insights.append("💰 High-cost task - significant expenses recorded")
    elif total_expenses > 1000:
        insights.append("💵 Moderate expenses - monitor spending")
    elif total_expenses > 0:
        insights.append("📊 Expenses tracked - good financial visibility")
    else:
        insights.append("ℹ️ No expenses recorded yet")
    
    # Category insights
    if len(expense_categories) > 3:
        insights.append("📈 Diverse expense categories - comprehensive tracking")
    elif len(expense_categories) == 1:
        single_category = list(expense_categories.keys())[0]
        insights.append(f"🎯 All expenses in {single_category} category")
    
    # Budget context insights
    if budget_context:
        task_percentage = budget_context.get('task_percentage_of_project', 0)
        if task_percentage > 25:
            insights.append("⚠️ Task represents significant portion of project expenses")
        elif task_percentage > 10:
            insights.append("📊 Task has notable impact on project budget")
    
    # Task status insights
    if task.current_status == 'completed' and total_expenses > 0:
        insights.append("✅ Task completed with documented expenses")
    elif task.current_status == 'in_progress' and total_expenses == 0:
        insights.append("🔍 Task in progress but no expenses recorded")
    
    return insights