import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Plus, LayoutDashboard, List, RefreshCw } from 'lucide-react';
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
 * - Fetches tasks from the API
 * - Provides task board and list view toggle
 * - Handles task updates and deletions
 * - Shows loading and error states
 * - Integrates with existing task management system
 */
const TaskBoardPage = () => {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('board'); // 'board' or 'list'

  const currentUser = getCurrentUser();

  useEffect(() => {
    fetchTasks();
    fetchProjects();

    const loadingUnsubscribe = loadingState.subscribe('task-board', (isLoading) => {
      setLoading(isLoading);
    });

    // Add focus listener to refresh data when returning to this view
    // Reason: Ensures data stays synchronized when switching between list and board views
    const handleFocus = () => {
      fetchTasks();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      loadingUnsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Add effect to refresh data when view mode changes
  useEffect(() => {
    if (viewMode === 'board') {
      fetchTasks();
    }
  }, [viewMode]);

  /**
   * Fetch all tasks from the API
   */
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const allTasks = await taskAPI.getAllTasks({});
      
      // Transform tasks to include isFavorite field (defaulting to false)
      // Note: You'll need to add this field to your backend model and API
      const tasksWithFavorites = (Array.isArray(allTasks) ? allTasks : []).map(task => ({
        ...task,
        isFavorite: task.isFavorite || false
      }));
      
      setTasks(tasksWithFavorites);
      setError('');
    } catch (err) {
      setError('Failed to fetch tasks: ' + (err.message || 'Unknown error'));
      console.error('Error fetching tasks:', err);
      setTasks([]);
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
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      )
    );
  };

  /**
   * Handle task deletion from the TaskBoard component
   * 
   * Args:
   *   taskId (string|number): The ID of the deleted task
   */
  const handleTaskDelete = (taskId) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  };

  /**
   * Refresh the task data
   */
  const handleRefresh = () => {
    fetchTasks();
    fetchProjects();
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
            {viewMode === 'board' 
              ? 'Drag and drop tasks between columns to update their status'
              : 'View and manage your project tasks'
            }
          </p>
        </div>
        <div className="flex gap-2">
          {/* View Toggle */}
          <div className="flex rounded-lg border p-1">
            <Button
              variant={viewMode === 'board' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('board')}
              className="flex items-center gap-2"
            >
              <LayoutDashboard className="h-4 w-4" />
              Board
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              asChild
              className="flex items-center gap-2"
            >
              <Link to="/solutions/tasks">
                <List className="h-4 w-4" />
                List
              </Link>
            </Button>
          </div>
          
          {/* Action Buttons */}
          <Button
            variant="outline"
            onClick={handleRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
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
      {viewMode === 'board' && (
        <div className="flex-1">
          {tasks.length === 0 && !loading ? (
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
              initialTasks={tasks}
              onTaskUpdate={handleTaskUpdate}
              onTaskDelete={handleTaskDelete}
            />
          )}
        </div>
      )}

      {/* Help Text */}
      {viewMode === 'board' && tasks.length > 0 && (
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