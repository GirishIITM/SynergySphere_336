import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Star, 
  StarIcon, 
  Clock, 
  Calendar, 
  User, 
  AlertCircle,
  CheckCircle,
  CheckSquare,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { taskAPI } from '../utils/apiCalls/taskAPI';

/**
 * TaskBoard Component - Drag and Drop Kanban-style task board
 * 
 * Features:
 * - Three columns: Started, In Progress, Completed
 * - Drag and drop between columns updates task status
 * - Favorite/unfavorite toggle with star icons
 * - Favorites appear at top of each column (sorted by backend)
 * - User-defined ordering through drag and drop
 * - Visual indicators during drag operations
 * - Responsive design
 */
const TaskBoard = ({ initialTasksGrouped = null, onTaskUpdate, onTaskDelete }) => {
  const [tasksGrouped, setTasksGrouped] = useState(initialTasksGrouped || {
    pending: [],
    in_progress: [],
    completed: []
  });
  const [draggedTask, setDraggedTask] = useState(null);
  const [draggedOver, setDraggedOver] = useState(null);
  const dragCounterRef = useRef(0);


  // Status mapping for the columns
  const COLUMN_CONFIG = {
    'not_started': { title: 'Not Started', status: 'pending' },
    'in_progress': { title: 'In Progress', status: 'in_progress' },
    'completed': { title: 'Completed', status: 'completed' }
  };

  useEffect(() => {
    if (initialTasksGrouped) {
      setTasksGrouped(initialTasksGrouped);
    }
  }, [initialTasksGrouped]);

  /**
   * Get tasks for a specific column - now directly from grouped data
   * 
   * Args:
   *   columnStatus (string): The status to get tasks for
   * 
   * Returns:
   *   array: Array of tasks for the column (already sorted by backend with favorites first)
   */
  const getTasksForColumn = (columnStatus) => {
    return tasksGrouped[columnStatus] || [];
  };

  /**
   * Handle drag start event
   * 
   * Args:
   *   e (DragEvent): The drag event
   *   task (object): The task being dragged
   */
  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target);
    
    // Add semi-transparent styling to the dragged element
    setTimeout(() => {
      e.target.style.opacity = '0.5';
    }, 0);
  };

  /**
   * Handle drag end event
   * 
   * Args:
   *   e (DragEvent): The drag event
   */
  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedTask(null);
    setDraggedOver(null);
    dragCounterRef.current = 0;
  };

  /**
   * Handle drag enter event on columns
   * 
   * Args:
   *   e (DragEvent): The drag event
   *   columnStatus (string): The status of the column being entered
   */
  const handleDragEnter = (e, columnStatus) => {
    e.preventDefault();
    dragCounterRef.current++;
    setDraggedOver(columnStatus);
  };

  /**
   * Handle drag leave event on columns
   * 
   * Args:
   *   e (DragEvent): The drag event
   */
  const handleDragLeave = (e) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setDraggedOver(null);
    }
  };

  /**
   * Handle drag over event
   * 
   * Args:
   *   e (DragEvent): The drag event
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  /**
   * Handle drop event - updates task status and position
   * 
   * Args:
   *   e (DragEvent): The drag event
   *   newStatus (string): The new status for the dropped task
   */
  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setDraggedOver(null);

    if (!draggedTask) return;

    // Don't update if dropped in the same column
    if (draggedTask.status === newStatus) {
      setDraggedTask(null);
      return;
    }

    console.log('TaskBoard: Updating task status', {
      taskId: draggedTask.id,
      currentStatus: draggedTask.status,
      newStatus: newStatus
    });

    try {
      // Update task status via API
      await taskAPI.updateTaskStatus(draggedTask.id, newStatus);
      
      console.log('TaskBoard: API call successful, updating local state');
      
      // Update local state - move task to new status group
      const updatedTask = { ...draggedTask, status: newStatus };
      const updatedTasks = {
        ...tasksGrouped,
        [draggedTask.status]: tasksGrouped[draggedTask.status].filter(task => task.id !== draggedTask.id),
        [newStatus]: [...tasksGrouped[newStatus], updatedTask]
      };
      setTasksGrouped(updatedTasks);

      // Notify parent component if callback provided
      if (onTaskUpdate) {
        console.log('TaskBoard: Notifying parent component', updatedTask);
        onTaskUpdate(updatedTask);
      }

      setDraggedTask(null);
    } catch (error) {
      console.error('TaskBoard: Failed to update task status:', error);
      
      // Show error message to user
      // TODO: Replace with proper toast notification
      alert(`Failed to update task status: ${error.message || 'Unknown error'}`);
      
      // Reset drag state on error
      setDraggedTask(null);
    }
  };

  /**
   * Toggle favorite status of a task
   * 
   * Args:
   *   taskId (string|number): The ID of the task to toggle
   */
  const handleToggleFavorite = async (taskId) => {
    try {
      const task = tasksGrouped.pending.find(t => t.id === taskId) ||
                    tasksGrouped.in_progress.find(t => t.id === taskId) ||
                    tasksGrouped.completed.find(t => t.id === taskId);
      if (!task) return;

      const newFavoriteStatus = !task.isFavorite;
      
      // Update local state immediately for responsive UI
      const updatedTasks = {
        ...tasksGrouped,
        [task.status]: tasksGrouped[task.status].map(t => 
          t.id === taskId 
            ? { ...t, isFavorite: newFavoriteStatus }
            : t
        )
      };
      setTasksGrouped(updatedTasks);

      // Update via API
      // Reason: Persist favorite status to backend so it's consistent across views
      try {
        await taskAPI.updateTaskFavorite(taskId, newFavoriteStatus);
        
        // Notify parent component if callback provided
        if (onTaskUpdate) {
          onTaskUpdate({ ...task, isFavorite: newFavoriteStatus });
        }
      } catch (apiError) {
        console.warn('Backend favorite update not available, using local state only:', apiError);
        // Still notify parent component for local synchronization
        if (onTaskUpdate) {
          onTaskUpdate({ ...task, isFavorite: newFavoriteStatus });
        }
      }
    } catch (error) {
      console.error('Failed to toggle task favorite:', error);
      // Revert the change on error
      const revertedTasks = {
        ...tasksGrouped,
        [task.status]: tasksGrouped[task.status].map(t => 
          t.id === taskId 
            ? { ...t, isFavorite: !t.isFavorite }
            : t
        )
      };
      setTasksGrouped(revertedTasks);
    }
  };

  /**
   * Handle task deletion
   * 
   * Args:
   *   taskId (string|number): The ID of the task to delete
   *   projectId (string|number): The project ID of the task
   */
  const handleDeleteTask = async (taskId, projectId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      await taskAPI.deleteTask(taskId, projectId);
      
      // Update local state
      const updatedTasks = {
        ...tasksGrouped,
        pending: tasksGrouped.pending.filter(task => task.id !== taskId),
        in_progress: tasksGrouped.in_progress.filter(task => task.id !== taskId),
        completed: tasksGrouped.completed.filter(task => task.id !== taskId)
      };
      setTasksGrouped(updatedTasks);

      // Notify parent component if callback provided
      if (onTaskDelete) {
        onTaskDelete(taskId);
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  /**
   * Get user initials from name
   * 
   * Args:
   *   name (string): Full name of the user
   * 
   * Returns:
   *   string: Initials (e.g., "John Doe" -> "JD")
   */
  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
  };

  /**
   * Format date string to readable format
   * 
   * Args:
   *   dateString (string): ISO date string
   * 
   * Returns:
   *   string: Formatted date
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'No deadline';
    return new Date(dateString).toLocaleDateString();
  };

  /**
   * Check if task is overdue
   * 
   * Args:
   *   dateString (string): ISO date string
   *   status (string): Current task status
   * 
   * Returns:
   *   boolean: True if task is overdue
   */
  const isOverdue = (dateString, status) => {
    if (!dateString || status === 'completed') return false;
    return new Date(dateString) < new Date();
  };

  /**
   * Get status icon for task
   * 
   * Args:
   *   status (string): Task status
   * 
   * Returns:
   *   JSX.Element: Icon component
   */
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <CheckSquare className="h-4 w-4" />;
    }
  };

  /**
   * Render individual task card
   * 
   * Args:
   *   task (object): Task object to render
   * 
   * Returns:
   *   JSX.Element: Task card component
   */
  const renderTaskCard = (task) => {
    const overdueTask = isOverdue(task.due_date, task.status);
    
    return (
      <Card
        key={task.id}
        draggable
        onDragStart={(e) => handleDragStart(e, task)}
        onDragEnd={handleDragEnd}
        className={`
          cursor-move transition-all duration-200 hover:shadow-md
          ${task.isFavorite ? 'ring-2 ring-yellow-400 ring-opacity-50' : ''}
          ${overdueTask ? 'border-red-500 bg-red-50/50 dark:bg-red-950/50' : ''}
          ${draggedTask?.id === task.id ? 'opacity-50' : ''}
        `}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-sm font-medium line-clamp-2 flex-1">
              {task.title}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggleFavorite(task.id)}
              className="p-1 h-6 w-6 ml-2 flex-shrink-0"
            >
              {task.isFavorite ? (
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ) : (
                <StarIcon className="h-4 w-4 text-gray-400 hover:text-yellow-400" />
              )}
            </Button>
          </div>
          
          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {getStatusIcon(task.status)}
              <span className="ml-1 capitalize">{task.status}</span>
            </Badge>
            {overdueTask && (
              <Badge variant="destructive" className="text-xs">
                Overdue
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0 pb-3">
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
              {task.description}
            </p>
          )}

          <div className="space-y-2 text-xs">
            {task.due_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className={overdueTask ? 'text-red-600' : 'text-muted-foreground'}>
                  {formatDate(task.due_date)}
                </span>
              </div>
            )}

            {task.assigned_to_name && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3 text-muted-foreground" />
                <Avatar className="h-4 w-4">
                  <AvatarFallback className="text-xs">
                    {getInitials(task.assigned_to_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-muted-foreground truncate">
                  {task.assigned_to_name}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-3 pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-6 px-2 text-xs"
            >
              <Link to={`/solutions/tasks/${task.id}`}>
                <Eye className="h-3 w-3 mr-1" />
                View
              </Link>
            </Button>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-6 px-2 text-xs"
              >
                <Link to={`/solutions/tasks/edit/${task.id}`}>
                  <Edit className="h-3 w-3" />
                </Link>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteTask(task.id, task.project_id)}
                className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="h-full">
      {/* Board Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Task Board</h2>
        <p className="text-muted-foreground">
          Drag tasks between columns to update their status. Click the star to favorite tasks.
        </p>
      </div>

      {/* Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
        {Object.entries(COLUMN_CONFIG).map(([columnKey, config]) => {
          const columnTasks = getTasksForColumn(config.status);
          const isDraggedOver = draggedOver === config.status;
          
          return (
            <div
              key={columnKey}
              className={`
                flex flex-col h-full min-h-[500px] rounded-lg border-2 border-dashed transition-all duration-200
                ${isDraggedOver 
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/50' 
                  : 'border-gray-200 dark:border-gray-700'
                }
              `}
              onDragEnter={(e) => handleDragEnter(e, config.status)}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, config.status)}
            >
              {/* Column Header */}
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{config.title}</h3>
                  <Badge variant="secondary" className="ml-2">
                    {columnTasks.length}
                  </Badge>
                </div>
              </div>

              {/* Column Content */}
              <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                {columnTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <CheckSquare className="h-8 w-8 mb-2" />
                    <p className="text-sm">No tasks</p>
                    <p className="text-xs">Drag tasks here</p>
                  </div>
                ) : (
                  columnTasks.map(renderTaskCard)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TaskBoard; 