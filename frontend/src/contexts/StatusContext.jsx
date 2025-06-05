import React, { createContext, useContext, useState, useEffect } from 'react';
import { taskAPI } from '../utils/apiCalls/taskAPI';

const StatusContext = createContext();

export const useStatus = () => {
  const context = useContext(StatusContext);
  if (!context) {
    throw new Error('useStatus must be used within a StatusProvider');
  }
  return context;
};

export const StatusProvider = ({ children }) => {
  const [statuses, setStatuses] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStatuses();
  }, []);

  const fetchStatuses = async () => {
    try {
      setLoading(true);
      setError(null);
      const statusData = await taskAPI.getStatuses();
      
      // Sort statuses by display_order
      const sortedStatuses = Array.isArray(statusData) 
        ? statusData.sort((a, b) => a.display_order - b.display_order)
        : [];
      
      setStatuses(sortedStatuses);
      
      // Create a map for quick lookup by id and name
      const map = {};
      sortedStatuses.forEach(status => {
        map[status.id] = status;
        map[status.name] = status;
      });
      setStatusMap(map);
      
    } catch (err) {
      console.error('Error fetching statuses:', err);
      setError(err.message || 'Failed to fetch statuses');
      
      // Fallback to default statuses if API fails
      const defaultStatuses = [
        {
          id: 1,
          name: 'pending',
          description: 'Task has not been started',
          display_order: 1,
          color: '#6B7280'
        },
        {
          id: 2,
          name: 'in_progress',
          description: 'Task is currently being worked on',
          display_order: 2,
          color: '#3B82F6'
        },
        {
          id: 3,
          name: 'completed',
          description: 'Task has been completed',
          display_order: 3,
          color: '#10B981'
        }
      ];
      
      setStatuses(defaultStatuses);
      const map = {};
      defaultStatuses.forEach(status => {
        map[status.id] = status;
        map[status.name] = status;
      });
      setStatusMap(map);
      
    } finally {
      setLoading(false);
    }
  };

  const getStatusById = (id) => {
    return statusMap[id] || null;
  };

  const getStatusByName = (name) => {
    return statusMap[name] || null;
  };

  const getStatusColor = (statusIdentifier) => {
    const status = getStatusById(statusIdentifier) || getStatusByName(statusIdentifier);
    return status?.color || '#6B7280';
  };

  const getStatusIcon = (statusIdentifier) => {
    const status = getStatusById(statusIdentifier) || getStatusByName(statusIdentifier);
    const statusName = status?.name || statusIdentifier;
    
    switch (statusName) {
      case 'completed':
        return 'CheckCircle';
      case 'in_progress':
        return 'Clock';
      case 'pending':
        return 'AlertCircle';
      default:
        return 'CheckSquare';
    }
  };

  const getDisplayText = (statusIdentifier) => {
    const status = getStatusById(statusIdentifier) || getStatusByName(statusIdentifier);
    if (status) {
      return status.name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    // Fallback for legacy status handling
    switch (statusIdentifier) {
      case 'pending':
        return 'Not Started';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      default:
        return statusIdentifier || 'Unknown';
    }
  };

  const value = {
    statuses,
    statusMap,
    loading,
    error,
    getStatusById,
    getStatusByName,
    getStatusColor,
    getStatusIcon,
    getDisplayText,
    refreshStatuses: fetchStatuses
  };

  return (
    <StatusContext.Provider value={value}>
      {children}
    </StatusContext.Provider>
  );
};