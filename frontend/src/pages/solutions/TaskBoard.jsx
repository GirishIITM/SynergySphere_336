import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Plus, List, RefreshCw, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import TaskBoard from '../../components/TaskBoard';
import { loadingState } from '../../utils/apiCalls';
import { getCurrentUser } from '../../utils/apiCalls/auth';
import { projectAPI } from '../../utils/apiCalls/projectAPI';
import { taskAPI } from '../../utils/apiCalls/taskAPI';

/**
 * TaskBoardPage - Main page component for the drag and drop task board
 * 
 * Features:
 * - Fetches tasks from the API grouped by status
 * - Provides link to list view
 * - Handles task updates and deletions
 * - Shows loading and error states
 * - Integrates with existing task management system
 */
const TaskBoardPage = () => {
  const [tasksGrouped, setTasksGrouped] = useState({
    pending: [],
    in_progress: [],
    completed: []
  });
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currentUser = getCurrentUser();

  useEffect(() => {
    fetchTasksGrouped();
    fetchProjects();

    const loadingUnsubscribe = loadingState.subscribe('task-board', (isLoading) => {
      setLoading(isLoading);
    });

    // Add focus listener to refresh data when returning to this view
    // Reason: Ensures data stays synchronized when switching between list and board views
    const handleFocus = () => {
      fetchTasksGrouped();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      loadingUnsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  /**
   * Fetch all tasks grouped by status from the API
   */
  const fetchTasksGrouped = async () => {
    try {
      setLoading(true);
      console.log('TaskBoardPage: Fetching grouped tasks from API');
      const response = await taskAPI.getTasksGrouped({});
      
      console.log('TaskBoardPage: API response received', {
        responseType: typeof response,
        hasPending: !!response.pending,
        hasInProgress: !!response.in_progress,
        hasCompleted: !!response.completed,
        pendingCount: response.pending ? response.pending.length : 0,
        inProgressCount: response.in_progress ? response.in_progress.length : 0,
        completedCount: response.completed ? response.completed.length : 0
      });
      
      // Ensure the response has the expected structure
      const groupedTasks = {
        pending: response.pending || [],
        in_progress: response.in_progress || [],
        completed: response.completed || []
      };
      
      console.log('TaskBoardPage: Setting grouped tasks state', {
        totalTasks: groupedTasks.pending.length + groupedTasks.in_progress.length + groupedTasks.completed.length
      });
      
      setTasksGrouped(groupedTasks);
      setError('');
    } catch (err) {
      console.error('TaskBoardPage: Failed to fetch grouped tasks:', err);
      setError('Failed to fetch tasks: ' + (err.message || 'Unknown error'));
      setTasksGrouped({
        pending: [],
        in_progress: [],
        completed: []
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch all projects from the API
   */
  const fetchProjects = async () => {
    try {
      const response = await projectAPI.getAllProjects();
      const projectsData = response.projects || response || [];
      setProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setProjects([]);
    }
  };

  /**
   * Handle task updates from the TaskBoard component
   * 
   * Args:
   *   updatedTask (object): The updated task object
   */
  const handleTaskUpdate = (updatedTask) => {
    console.log('TaskBoardPage: Received task update', updatedTask);
    setTasksGrouped(prevTasks => {
      // Find the task in the current groups and remove it
      const currentTask = prevTasks.pending.find(t => t.id === updatedTask.id) ||
                          prevTasks.in_progress.find(t => t.id === updatedTask.id) ||
                          prevTasks.completed.find(t => t.id === updatedTask.id);
      
      if (!currentTask) {
        console.warn('TaskBoardPage: Task not found in current state');
        return prevTasks;
      }
      
      // Remove task from all groups
      const newTasks = {
        pending: prevTasks.pending.filter(task => task.id !== updatedTask.id),
        in_progress: prevTasks.in_progress.filter(task => task.id !== updatedTask.id),
        completed: prevTasks.completed.filter(task => task.id !== updatedTask.id)
      };
      
      // Add task to the appropriate group based on its new status
      const targetStatus = updatedTask.status;
      if (newTasks[targetStatus]) {
        newTasks[targetStatus].push(updatedTask);
      } else {
        console.warn(`TaskBoardPage: Unknown status "${targetStatus}", keeping task in original group`);
        // Fallback: keep in original group if status is unknown
        if (currentTask.status && newTasks[currentTask.status]) {
          newTasks[currentTask.status].push(updatedTask);
        }
      }
      
      console.log('TaskBoardPage: Updated tasks state', {
        totalTasks: newTasks.pending.length + newTasks.in_progress.length + newTasks.completed.length,
        updatedTaskId: updatedTask.id,
        newStatus: updatedTask.status
      });
      return newTasks;
    });
  };

  /**
   * Handle task deletion from the TaskBoard component
   * 
   * Args:
   *   taskId (string|number): The ID of the deleted task
   */
  const handleTaskDelete = (taskId) => {
    setTasksGrouped(prevTasks => {
      const newTasks = {
        ...prevTasks,
        pending: prevTasks.pending.filter(task => task.id !== taskId),
        in_progress: prevTasks.in_progress.filter(task => task.id !== taskId),
        completed: prevTasks.completed.filter(task => task.id !== taskId)
      };
      return newTasks;
    });
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="text-lg">Loading tasks...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Task Management</h1>
          <p className="text-muted-foreground">
            Drag and drop tasks between columns to update their status
          </p>
        </div>
        <div className="flex gap-2">
          {/* View Toggle - Only List View Button */}
          <Button
            variant="outline"
            asChild
            className="flex items-center gap-2"
          >
            <Link to="/solutions/tasks">
              <List className="h-4 w-4" />
              List View
            </Link>
          </Button>
          
          <Button asChild size="lg" className="shadow-md">
            <Link to="/solutions/tasks/create">
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Link>
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-destructive font-medium">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task Board */}
      <div className="flex-1">
        {tasksGrouped.pending.length === 0 && tasksGrouped.in_progress.length === 0 && tasksGrouped.completed.length === 0 && !loading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <LayoutDashboard className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
              <p className="text-muted-foreground text-center max-w-md mb-4">
                Create your first task to get started with the task board
              </p>
              <Button asChild size="lg">
                <Link to="/solutions/tasks/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <TaskBoard
            initialTasksGrouped={tasksGrouped}
            onTaskUpdate={handleTaskUpdate}
            onTaskDelete={handleTaskDelete}
          />
        )}
      </div>

      {/* Help Text */}
      {(tasksGrouped.pending.length > 0 || tasksGrouped.in_progress.length > 0 || tasksGrouped.completed.length > 0) && (
        <Card className="bg-blue-50/50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <LayoutDashboard className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  How to use the Task Board
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• <strong>Drag and drop</strong> tasks between columns to change their status</li>
                  <li>• <strong>Click the star</strong> to favorite/unfavorite tasks (favorites appear at the top)</li>
                  <li>• <strong>Click View</strong> to see task details or <strong>Edit</strong> to modify tasks</li>
                  <li>• Tasks maintain the exact order you place them in - no automatic sorting</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TaskBoardPage; 