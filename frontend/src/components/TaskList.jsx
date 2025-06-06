import React, { useEffect, useState } from 'react';

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [tips, setTips] = useState({});

  useEffect(() => {
    // Fetch tasks from your Flask backend
    fetch('http://127.0.0.1:5000/api/tasks')
      .then((res) => res.json())
      .then((data) => {
        setTasks(data);
      });
  }, []);

  const getSuggestion = async (taskId, taskText) => {
    try {
      const res = await fetch('http://127.0.0.1:5000/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: taskText }),
      });

      const data = await res.json();
      setTips((prevTips) => ({
        ...prevTips,
        [taskId]: data.suggestion,
      }));
    } catch (err) {
      console.error('Failed to get suggestion', err);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold mb-4">Task List</h2>
      {tasks.map((task) => (
        <div key={task.id} className="p-4 border rounded-lg shadow">
          <p className="font-medium">{task.title}</p>
          <button
            onClick={() => getSuggestion(task.id, task.title)}
            className="mt-2 px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Get AI Suggestion
          </button>
          {tips[task.id] && (
            <p className="mt-2 text-green-700 font-semibold">
              💡 Tip: {tips[task.id]}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default TaskList;
