import { create } from 'zustand';
import { taskAPI } from '../utils/apiCalls/taskAPI';

/**
 * Zustand store for managing task state across the application
 * Prevents conflicts between board view and list view state management
 */
export const useTaskStore = create((set, get) => ({
  // State
  tasksGrouped: {
    pending: [],
    in_progress: [],
    completed: []
  },
  lastFetchTime: null,
  isLoading: false,
  error: null,
  
  // Cache duration in milliseconds (30 seconds)
  CACHE_DURATION: 30 * 1000,

  // Actions
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null }),

  /**
   * Check if cached data is still valid
   */
  isCacheValid: () => {
    const { lastFetchTime, CACHE_DURATION } = get();
    if (!lastFetchTime) return false;
    return (Date.now() - lastFetchTime) < CACHE_DURATION;
  },

  /**
   * Fetch tasks grouped by status from API
   */
  fetchTasksGrouped: async (force = false) => {
    const { isCacheValid, setLoading, setError } = get();
    
    // Skip fetch if cache is valid and not forced
    if (!force && isCacheValid()) {
      console.log('TaskStore: Using cached data, skipping API call');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('TaskStore: Fetching grouped tasks from API');
      const response = await taskAPI.getTasksGrouped({});
      
      // Transform tasks to include isFavorite field
      const transformTasks = (tasks) => tasks.map(task => ({
        ...task,
        isFavorite: task.is_favorite || task.isFavorite || false
      }));

      const groupedTasks = {
        pending: transformTasks(response.pending || []),
        in_progress: transformTasks(response.in_progress || []),
        completed: transformTasks(response.completed || [])
      };
      
      console.log('TaskStore: Setting grouped tasks state', {
        totalTasks: groupedTasks.pending.length + groupedTasks.in_progress.length + groupedTasks.completed.length
      });
      
      set({ 
        tasksGrouped: groupedTasks,
        lastFetchTime: Date.now(),
        error: null
      });
      
    } catch (err) {
      console.error('TaskStore: Failed to fetch grouped tasks:', err);
      setError('Failed to fetch tasks: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  },

  /**
   * Update a task in the store (for status changes, favorites, etc.)
   */
  updateTask: (updatedTask) => {
    console.log('TaskStore: Updating task', updatedTask);
    
    set((state) => {
      const { tasksGrouped } = state;
      
      // Find the task in current groups and remove it
      const currentTask = tasksGrouped.pending.find(t => t.id === updatedTask.id) ||
                          tasksGrouped.in_progress.find(t => t.id === updatedTask.id) ||
                          tasksGrouped.completed.find(t => t.id === updatedTask.id);
      
      if (!currentTask) {
        console.warn('TaskStore: Task not found in current state');
        return state;
      }
      
      // Remove task from all groups
      const newTasksGrouped = {
        pending: tasksGrouped.pending.filter(task => task.id !== updatedTask.id),
        in_progress: tasksGrouped.in_progress.filter(task => task.id !== updatedTask.id),
        completed: tasksGrouped.completed.filter(task => task.id !== updatedTask.id)
      };
      
      // Add task to the appropriate group based on its new status
      const targetStatus = updatedTask.status;
      if (newTasksGrouped[targetStatus]) {
        newTasksGrouped[targetStatus].push(updatedTask);
      } else {
        console.warn(`TaskStore: Unknown status "${targetStatus}", keeping task in original group`);
        // Fallback: keep in original group if status is unknown
        if (currentTask.status && newTasksGrouped[currentTask.status]) {
          newTasksGrouped[currentTask.status].push(updatedTask);
        }
      }
      
      console.log('TaskStore: Updated tasks state', {
        totalTasks: newTasksGrouped.pending.length + newTasksGrouped.in_progress.length + newTasksGrouped.completed.length,
        updatedTaskId: updatedTask.id,
        newStatus: updatedTask.status
      });
      
      return { tasksGrouped: newTasksGrouped };
    });
  },

  /**
   * Delete a task from the store
   */
  deleteTask: (taskId) => {
    console.log('TaskStore: Deleting task', taskId);
    
    set((state) => {
      const { tasksGrouped } = state;
      
      const newTasksGrouped = {
        pending: tasksGrouped.pending.filter(task => task.id !== taskId),
        in_progress: tasksGrouped.in_progress.filter(task => task.id !== taskId),
        completed: tasksGrouped.completed.filter(task => task.id !== taskId)
      };
      
      return { tasksGrouped: newTasksGrouped };
    });
  },

  /**
   * Force refresh data from API
   */
  refreshTasks: () => {
    const { fetchTasksGrouped } = get();
    fetchTasksGrouped(true);
  },

  /**
   * Clear all data (useful for logout)
   */
  clearData: () => {
    set({
      tasksGrouped: {
        pending: [],
        in_progress: [],
        completed: []
      },
      lastFetchTime: null,
      isLoading: false,
      error: null
    });
  }
})); 