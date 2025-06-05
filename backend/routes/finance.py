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