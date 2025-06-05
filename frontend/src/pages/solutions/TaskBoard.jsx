import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Plus, List, RefreshCw, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import TaskBoard from '../../components/TaskBoard';
import { loadingState } from '../../utils/apiCalls';
import { getCurrentUser } from '../../utils/apiCalls/auth';
import { projectAPI } from '../../utils/apiCalls/projectAPI';
import { useTaskStore } from '../../stores/taskStore';

/**
 * TaskBoardPage - Main page component for the drag and drop task board
 * 
 * Features:
 * - Uses Zustand store for shared task state management
 * - Provides navigation to list view
 * - Handles task updates and deletions through store
 * - Shows loading and error states
 * - Intelligent caching to prevent unnecessary API calls
 */
const TaskBoardPage = () => {
  const [projects, setProjects] = useState([]);
  const currentUser = getCurrentUser();

  // Use Zustand store for task state management
  const { 
    tasksGrouped, 
    isLoading, 
    error, 
    fetchTasksGrouped, 
    updateTask, 
    deleteTask,
    clearError
  } = useTaskStore();

  useEffect(() => {
    // Initialize data
    fetchTasksGrouped();
    fetchProjects();
    clearError();

    // Subscribe to loading state for compatibility
    const loadingUnsubscribe = loadingState.subscribe('task-board', (loading) => {
      // Store now handles loading state, but keep this for compatibility
    });

    // Refresh data when window gains focus
    const handleFocus = () => {
      console.log('TaskBoardPage: Window focus - checking for fresh data');
      fetchTasksGrouped();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      loadingUnsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchTasksGrouped, clearError]);

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
   */
  const handleTaskUpdate = (updatedTask) => {
    console.log('TaskBoardPage: Received task update, delegating to store', updatedTask);
    updateTask(updatedTask);
  };

  /**
   * Handle task deletion from the TaskBoard component
   */
  const handleTaskDelete = (taskId) => {
    console.log('TaskBoardPage: Received task deletion, delegating to store', taskId);
    deleteTask(taskId);
  };

  if (isLoading) {
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
        {tasksGrouped.pending.length === 0 && tasksGrouped.in_progress.length === 0 && tasksGrouped.completed.length === 0 && !isLoading ? (
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