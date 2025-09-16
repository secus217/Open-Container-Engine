// LogsPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import { useParams } from 'react-router-dom'; // Assuming you're using react-router

export default function LogsPage() {
  const { deploymentId } = useParams(); // Get deployment ID from URL
  const [logs, setLogs] = useState<any>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<any>(null);
  const wsRef:any = useRef(null);
  const logsEndRef:any = useRef(null);
  const reconnectTimeoutRef:any = useRef(null);
  const reconnectDelay = useRef(1000);

  // Auto-scroll to bottom when new logs arrive
  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  // WebSocket connection
  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN || !deploymentId) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    const ws = new WebSocket(
      `ws://localhost:3000/v1/deployments/${deploymentId}/logs/stream?tail=100`
    );

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setIsConnecting(false);
      reconnectDelay.current = 1000; // Reset reconnect delay
    };

    ws.onmessage = (event) => {
      const timestamp = new Date().toISOString();
      const newLog = {
        timestamp,
        message: event.data,
        id: `${timestamp}-${Math.random()}`
      };
      
      setLogs((prev:any) => [...prev, newLog]);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Connection error occurred');
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      setIsConnecting(false);
      wsRef.current = null;

      // Auto-reconnect with exponential backoff
      const delay = reconnectDelay.current;
      reconnectDelay.current = Math.min(delay * 2, 30000); // Max 30s

      setError(`Disconnected. Reconnecting in ${delay / 1000}s...`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, delay);
    };

    wsRef.current = ws;
  };

  // Connect on mount
  useEffect(() => {
    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [deploymentId]);

  // Manual refresh
  const handleRefresh = () => {
    setLogs([]); // Clear logs
    if (wsRef.current) {
      wsRef.current.close();
    }
    connectWebSocket();
  };

  // Clear logs
  const handleClear = () => {
    setLogs([]);
  };

  // Download logs
  const handleDownload = () => {
    const logText = logs.map((log:any) => 
      `[${new Date(log.timestamp).toLocaleString()}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${deploymentId}-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="px-8 py-6 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mr-4">
              <ClipboardDocumentListIcon className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Application Logs</h2>
              <p className="text-gray-600">
                Real-time logs from your deployment 
                <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  isConnected ? 'bg-green-100 text-green-800' : 
                  isConnecting ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-red-100 text-red-800'
                }`}>
                  <span className={`w-2 h-2 rounded-full mr-1.5 ${
                    isConnected ? 'bg-green-400' : 
                    isConnecting ? 'bg-yellow-400' : 
                    'bg-red-400'
                  }`}></span>
                  {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
                </span>
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all"
            >
              Clear
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all"
            >
              Download
            </button>
            <button
              onClick={handleRefresh}
              disabled={isConnecting}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting ? 'Connecting...' : 'Reconnect'}
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
      </div>
      
      <div className="relative">
        <div className="bg-gray-900 text-white font-mono text-sm p-6 h-96 overflow-y-auto custom-scrollbar">
          {logs.length > 0 ? (
            <>
              {logs.map((log:any) => (
                <div key={log.id} className="flex space-x-4 py-1 hover:bg-gray-800 px-2 rounded group">
                  <span className="text-gray-500 flex-shrink-0 select-none">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="text-green-400 select-none">│</span>
                  <span className="flex-1 break-all whitespace-pre-wrap">{log.message}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </>
          ) : (
            <div className="text-center py-8">
              <ClipboardDocumentListIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500">
                {isConnecting ? 'Connecting to log stream...' : 'No logs available at the moment.'}
              </p>
              <p className="text-gray-600 text-sm mt-2">
                Logs will appear here once your application starts generating them.
              </p>
            </div>
          )}
        </div>
        
        {logs.length > 10 && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg shadow-lg transition-all"
            title="Scroll to bottom"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
