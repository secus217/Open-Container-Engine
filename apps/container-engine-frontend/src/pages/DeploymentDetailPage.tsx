// src/pages/DeploymentDetailPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';
import DashboardLayout from '../components/Layout/DashboardLayout';

type DeploymentStatus = 'pending' | 'running' | 'stopped' | 'failed' | 'updating' | 'scaling';

interface DeploymentDetails {
  id: string;
  appName: string;
  image: string;
  status: DeploymentStatus;
  url: string;
  port: number;
  replicas: number;
  envVars: { [key: string]: string };
  createdAt: string;
  updatedAt: string;
}

interface DeploymentLogs {
  timestamp: string;
  message: string;
}

const DeploymentDetailPage: React.FC = () => {
  const { deploymentId } = useParams<{ deploymentId: string }>();
  const [deployment, setDeployment] = useState<DeploymentDetails | null>(null);
  const [logs, setLogs] = useState<DeploymentLogs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'domains' | 'settings'>('overview');
  
  // State for scaling
  const [scaleReplicas, setScaleReplicas] = useState(1);

  useEffect(() => {
    if (!deploymentId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [detailsRes, logsRes] = await Promise.all([
          api.get(`/v1/deployments/${deploymentId}`),
          api.get(`/v1/deployments/${deploymentId}/logs`, { params: { tail: 100 } })
        ]);
        setDeployment(detailsRes.data);
        setScaleReplicas(detailsRes.data.replicas);
        setLogs(logsRes.data.logs);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to fetch deployment details.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [deploymentId]);

  const handleScale = async () => {
    try {
      await api.patch(`/v1/deployments/${deploymentId}/scale`, { replicas: scaleReplicas });
      alert('Scaling request sent successfully. The status will update shortly.');
      // Optionally, refetch data after a delay
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to scale deployment.');
    }
  };

  if (loading) return <DashboardLayout><div className="p-6 text-center">Loading...</div></DashboardLayout>;
  if (error) return <DashboardLayout><div className="p-6 text-red-500 text-center">{error}</div></DashboardLayout>;
  if (!deployment) return <DashboardLayout><div className="p-6 text-center">Deployment not found.</div></DashboardLayout>;

  const TabButton: React.FC<{ tabName: typeof activeTab; label: string }> = ({ tabName, label }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`px-4 py-2 text-sm font-medium rounded-md ${
        activeTab === tabName ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{deployment.appName}</h1>
        <a href={deployment.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline mb-6 block">
          {deployment.url}
        </a>
        
        <div className="flex space-x-2 border-b border-gray-200 mb-6">
          <TabButton tabName="overview" label="Overview" />
          <TabButton tabName="logs" label="Logs" />
          <TabButton tabName="domains" label="Domains" />
          <TabButton tabName="settings" label="Settings" />
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Deployment Info Card */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Deployment Details</h2>
                <div className="space-y-3">
                  <p><strong>Status:</strong> <span className="font-mono">{deployment.status}</span></p>
                  <p><strong>Image:</strong> <span className="font-mono">{deployment.image}</span></p>
                  <p><strong>Port:</strong> <span className="font-mono">{deployment.port}</span></p>
                  <p><strong>Created:</strong> <span className="font-mono">{new Date(deployment.createdAt).toLocaleString()}</span></p>
                  <p><strong>Last Updated:</strong> <span className="font-mono">{new Date(deployment.updatedAt).toLocaleString()}</span></p>
                </div>
              </div>

              {/* Scaling Card */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Scaling</h2>
                <div className="flex items-center space-x-4">
                  <label htmlFor="replicas">Replicas:</label>
                  <input
                    type="number"
                    id="replicas"
                    min="0"
                    value={scaleReplicas}
                    onChange={(e) => setScaleReplicas(Number(e.target.value))}
                    className="w-24 px-3 py-1 border border-gray-300 rounded-md"
                  />
                  <button onClick={handleScale} className="px-4 py-2 bg-primary text-white rounded-md">
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="bg-gray-900 text-white font-mono text-sm rounded-lg shadow-md p-4 h-96 overflow-y-auto">
              {logs.length > 0 ? (
                logs.map((log, index) => (
                  <p key={index}>
                    <span className="text-gray-500">{new Date(log.timestamp).toISOString()}</span>: {log.message}
                  </p>
                ))
              ) : (
                <p className="text-gray-500">No logs available.</p>
              )}
            </div>
          )}

          {activeTab === 'domains' && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Custom Domains</h2>
              <p>Feature coming soon. You'll be able to add custom domains here.</p>
              {/* Logic for GET /v1/deployments/{id}/domains and POST/DELETE */}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
                 <div className="space-y-2">
                    {Object.entries(deployment.envVars).map(([key, value]) => (
                        <div key={key} className="flex font-mono">
                            <span className="w-1/3 text-gray-600">{key}</span>
                            <span>=</span>
                            <span className="flex-1 ml-2 text-gray-800">{value}</span>
                        </div>
                    ))}
                </div>
                 {/* Logic for PUT /v1/deployments/{id} to update env vars */}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DeploymentDetailPage;